import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { TacoResolverService } from './resolver.service';

type AiFood = { name: string; grams: number };
type AiMealKey = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'ceia';
type AiMeal = {
  meal: AiMealKey;
  title: string;
  foods: AiFood[];
};
type AiDay = { day: number; waterMlTotal: number; meals: AiMeal[] };

export type DietAiPlan = {
  days: number;
  assumptions?: string[];
  plan: AiDay[];
};

type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};

type ResolvedFood = {
  inputName: string;
  grams: number;
  resolved: { foodId: number; tacoId: number | null; name: string } | null;
  confidence: number;
  macros: Macros | null;
};

type MealResult = {
  meal: AiMealKey;
  title: string;
  foods: ResolvedFood[];
  totals: Macros;
};

type DayResult = {
  day: number;
  waterMlTotal: number;
  meals: MealResult[];
  totals: Macros;
};

export type DietResult = {
  days: number;
  assumptions: string[];
  plan: DayResult[];
  unresolvedFoods: Array<{
    inputName: string;
    grams: number;
    candidates: Array<{
      id: number;
      tacoId: number | null;
      name: string;
      score: number;
    }>;
  }>;
};

function emptyMacros(): Macros {
  return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
}

function addMacros(total: Macros, part: Partial<Macros>) {
  total.kcal += part.kcal ?? 0;
  total.proteinG += part.proteinG ?? 0;
  total.carbsG += part.carbsG ?? 0;
  total.fatG += part.fatG ?? 0;
  total.fiberG += part.fiberG ?? 0;
}

function round1(n: number) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function scale(per100: number | null | undefined, grams: number): number {
  if (per100 == null) return 0;
  return (per100 * grams) / 100;
}

function clampGrams(grams: number) {
  if (!Number.isFinite(grams)) return 0;
  if (grams < 1) return 1;
  if (grams > 2000) return 2000;
  return Math.round(grams);
}

@Injectable()
export class TacoEnricherService {
  constructor(
    private prisma: PrismaService,
    private resolver: TacoResolverService,
  ) {}

  async enrich(ai: DietAiPlan, confidenceMin = 0.55): Promise<DietResult> {
    const unresolvedFoods: DietResult['unresolvedFoods'] = [];

    const outDays: DayResult[] = [];

    for (const day of ai.plan) {
      const dayTotals = emptyMacros();
      const outMeals: MealResult[] = [];

      for (const meal of day.meals) {
        const mealTotals = emptyMacros();
        const outFoods: ResolvedFood[] = [];

        for (const f of meal.foods) {
          const grams = clampGrams(Number(f.grams));
          const inputName = String(f.name ?? '').trim();

          if (!inputName) {
            outFoods.push({
              inputName: '',
              grams,
              resolved: null,
              confidence: 0,
              macros: null,
            });
            continue;
          }

          const { best, candidates } = await this.resolver.resolve(inputName);

          if (!best || best.score < confidenceMin) {
            unresolvedFoods.push({
              inputName,
              grams,
              candidates: candidates.map((c) => ({
                id: c.id,
                tacoId: c.tacoId,
                name: c.name,
                score: c.score,
              })),
            });

            outFoods.push({
              inputName,
              grams,
              resolved: null,
              confidence: best?.score ?? 0,
              macros: null,
            });
            continue;
          }

          const food = await this.prisma.food.findUnique({
            where: { id: best.id },
            select: {
              id: true,
              tacoId: true,
              name: true,
              kcal: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
            },
          });

          if (!food) {
            outFoods.push({
              inputName,
              grams,
              resolved: null,
              confidence: best.score,
              macros: null,
            });
            continue;
          }

          const macros: Macros = {
            kcal: scale(food.kcal, grams),
            proteinG: scale(food.proteinG, grams),
            carbsG: scale(food.carbsG, grams),
            fatG: scale(food.fatG, grams),
            fiberG: scale(food.fiberG, grams),
          };

          addMacros(mealTotals, macros);

          outFoods.push({
            inputName,
            grams,
            resolved: { foodId: food.id, tacoId: food.tacoId, name: food.name },
            confidence: best.score,
            macros: {
              kcal: round1(macros.kcal),
              proteinG: round1(macros.proteinG),
              carbsG: round1(macros.carbsG),
              fatG: round1(macros.fatG),
              fiberG: round1(macros.fiberG),
            },
          });
        }

        addMacros(dayTotals, mealTotals);

        outMeals.push({
          meal: meal.meal,
          title: meal.title,
          foods: outFoods,
          totals: {
            kcal: round1(mealTotals.kcal),
            proteinG: round1(mealTotals.proteinG),
            carbsG: round1(mealTotals.carbsG),
            fatG: round1(mealTotals.fatG),
            fiberG: round1(mealTotals.fiberG),
          },
        });
      }

      outDays.push({
        day: day.day,
        waterMlTotal: day.waterMlTotal,
        meals: outMeals,
        totals: {
          kcal: round1(dayTotals.kcal),
          proteinG: round1(dayTotals.proteinG),
          carbsG: round1(dayTotals.carbsG),
          fatG: round1(dayTotals.fatG),
          fiberG: round1(dayTotals.fiberG),
        },
      });
    }

    return {
      days: ai.days,
      assumptions: ai.assumptions ?? [],
      plan: outDays,
      unresolvedFoods,
    };
  }
}
