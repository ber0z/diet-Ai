import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL não definido. Coloque no .env)');
}

const pool = new Pool({ connectionString: url });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });
function normalizeFoodName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;

  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;

    if (t.toLowerCase() === 'tr') return 0;

    if (t.toLowerCase() === 'na' || t === '-') return null;

    const n = Number(t.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function toInt(v: unknown): number | null {
  const n = toNumber(v);
  if (n == null) return null;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
}

async function main() {
  const filePath = path.resolve(process.cwd(), 'prisma/data/taco.xlsx');

  const wb = XLSX.readFile(filePath);
  const sheetName = 'CMVCol taco3';
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    throw new Error(
      `Aba "${sheetName}" não encontrada. Abas: ${wb.SheetNames.join(', ')}`,
    );
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  });

  const IDX = {
    tacoId: 0,
    name: 1,
    kcal: 3,
    protein: 5,
    fat: 6,
    carbs: 8,
    fiber: 9,
  } as const;

  let upserted = 0;
  let skipped = 0;

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) {
      skipped++;
      continue;
    }

    const tacoId = toInt(r[IDX.tacoId]);
    const nameRaw = r[IDX.name];

    if (!tacoId || tacoId <= 0) {
      skipped++;
      continue;
    }

    const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
    if (!name) {
      skipped++;
      continue;
    }

    const normalizedName = normalizeFoodName(name);
    if (!normalizedName) {
      skipped++;
      continue;
    }

    const data = {
      tacoId,
      name,
      normalizedName,
      kcal: toNumber(r[IDX.kcal]),
      proteinG: toNumber(r[IDX.protein]),
      fatG: toNumber(r[IDX.fat]),
      carbsG: toNumber(r[IDX.carbs]),
      fiberG: toNumber(r[IDX.fiber]),
    };

    await prisma.food.upsert({
      where: { tacoId },
      create: data,
      update: data,
    });

    upserted++;
  }

  console.log({
    sheetName,
    totalRows: rows.length,
    upserted,
    skipped,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
