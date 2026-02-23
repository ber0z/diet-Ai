import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_TOKENS = new Set([
  'sem',
  'lactose',
  'gluten',
  'zero',
  'diet',
  'light',
]);

const SKIP_AS_CORE = new Set(['salada', 'sopa', 'vitamina', 'suco', 'mix']);

const DISH_TOKENS = new Set([
  'pastel',
  'pizza',
  'lasanha',
  'macarrao',
  'bolo',
  'biscoito',
  'torta',
  'hamburguer',
  'sanduiche',
  'maionese',
  'salada',
]);

function singularizePt(token: string): string {
  if (token.endsWith('oes')) return token.slice(0, -3) + 'ao';
  if (token.endsWith('aes')) return token.slice(0, -3) + 'ao';
  if (token.endsWith('is')) return token.slice(0, -2) + 'il';
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

function wordHit(text: string, token: string): boolean {
  const re = new RegExp(
    `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
    'i',
  );
  return re.test(text);
}

export type TacoCandidate = {
  id: number;
  tacoId: number | null;
  name: string;
  normalizedName: string;
  score: number; // 0..1
};

function tieBreakGeneric(
  inputNorm: string,
  a: TacoCandidate,
  b: TacoCandidate,
  core: string,
  extraTokenCount: (norm: string) => number,
) {
  const aFull = a.normalizedName.startsWith(inputNorm);
  const bFull = b.normalizedName.startsWith(inputNorm);
  if (aFull !== bFull) return aFull ? -1 : 1;

  const aStarts = a.normalizedName.startsWith(core);
  const bStarts = b.normalizedName.startsWith(core);
  if (aStarts !== bStarts) return aStarts ? -1 : 1;

  const aExtra = extraTokenCount(a.normalizedName);
  const bExtra = extraTokenCount(b.normalizedName);
  if (aExtra !== bExtra) return aExtra - bExtra;

  const lenDiff = a.name.length - b.name.length;
  if (lenDiff !== 0) return lenDiff;

  return a.id - b.id;
}

@Injectable()
export class TacoResolverService {
  constructor(private prisma: PrismaService) {}

  async resolve(
    inputName: string,
  ): Promise<{ best: TacoCandidate | null; candidates: TacoCandidate[] }> {
    const inputNorm = normalize(inputName);
    if (!inputNorm) return { best: null, candidates: [] };

    let tokens = inputNorm.split(' ').filter(Boolean);

    tokens = tokens
      .map(singularizePt)
      .filter((t) => t.length >= 3)
      .filter((t) => !STOP_TOKENS.has(t));

    if (!tokens.length) return { best: null, candidates: [] };

    const core = tokens.find((t) => !SKIP_AS_CORE.has(t)) ?? tokens[0];
    const rest = tokens.filter((t) => t !== core);

    let rows = await this.prisma.food.findMany({
      where: {
        AND: [
          { normalizedName: { contains: core } },
          ...(rest.length
            ? [{ OR: rest.map((t) => ({ normalizedName: { contains: t } })) }]
            : []),
        ],
      },
      select: { id: true, tacoId: true, name: true, normalizedName: true },
      take: 40,
    });

    if (!rows.length) {
      rows = await this.prisma.food.findMany({
        where: { normalizedName: { contains: core } },
        select: { id: true, tacoId: true, name: true, normalizedName: true },
        take: 40,
      });
    }

    if (!rows.length) return { best: null, candidates: [] };

    const allTokens = [core, ...rest];
    const norms = rows.map((r) => r.normalizedName || normalize(r.name));
    const N = norms.length;

    const df = new Map<string, number>();
    for (const t of allTokens) {
      const count = norms.reduce(
        (acc, norm) => acc + (wordHit(norm, t) ? 1 : 0),
        0,
      );
      df.set(t, count);
    }

    const weightOf = (t: string) => {
      const d = df.get(t) ?? 0;
      if (d === 0) return 0;
      return Math.log((N + 1) / (d + 1)) + 1;
    };

    const inputTokenSet = new Set(allTokens.filter((t) => weightOf(t) > 0));

    const extraTokenCount = (norm: string) => {
      const candTokens = norm
        .split(' ')
        .filter(Boolean)
        .map(singularizePt)
        .filter((t) => t.length >= 3)
        .filter((t) => !STOP_TOKENS.has(t));

      let extra = 0;
      for (const t of candTokens) {
        if (!inputTokenSet.has(t)) extra++;
      }
      return extra;
    };

    const candidates: TacoCandidate[] = rows
      .map((r) => {
        const norm = r.normalizedName || normalize(r.name);

        let num = 0;
        let den = 0;

        for (const t of allTokens) {
          const w = weightOf(t);
          if (w <= 0) continue;
          den += w;
          if (wordHit(norm, t)) num += w;
        }

        const hitScore = den > 0 ? num / den : 0;

        const prefixBonus = norm.startsWith(inputNorm)
          ? 0.2
          : norm.startsWith(core)
            ? 0.12
            : 0;

        const dishPenalty = Array.from(DISH_TOKENS).some((w) =>
          wordHit(norm, w),
        )
          ? 0.25
          : 0;

        const extra = extraTokenCount(norm);
        const extraPenalty = Math.min(0.18, extra * 0.03);

        let score = hitScore + prefixBonus - dishPenalty - extraPenalty;
        score = Math.max(0, Math.min(1, score));

        return { ...r, normalizedName: norm, score };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          tieBreakGeneric(inputNorm, a, b, core, extraTokenCount),
      )
      .slice(0, 5);

    const best = candidates[0] ?? null;
    const second = candidates[1] ?? null;

    const MIN_SCORE = 0.65;
    const MIN_GAP = 0.08;

    if (!best) return { best: null, candidates };

    const gap = second ? best.score - second.score : best.score;

    if (best.score < MIN_SCORE) return { best: null, candidates };

    if (second && gap < MIN_GAP && best.score < 0.9) {
      return { best: null, candidates };
    }

    return { best, candidates };
  }
}
