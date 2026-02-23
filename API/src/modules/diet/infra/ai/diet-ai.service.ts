// src/modules/diet/infra/ai/diet-ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { DietMasterPromptService } from './prompts/master.prompt.service';
import { OpenAiDietAiClient } from './diet-ai.client';

const MealKeySchema = z.enum(['cafe', 'almoco', 'lanche', 'jantar', 'ceia']);

const AiFoodSchema = z.object({
  name: z.string().min(2),
  grams: z.number().int().positive(),
});

const AiMealSchema = z.object({
  meal: MealKeySchema,
  title: z.string().min(2),
  foods: z.array(AiFoodSchema).min(1),
});

const AiDaySchema = z.object({
  day: z.number().int().positive(),
  waterMlTotal: z.number().int().positive().default(0),
  meals: z.array(AiMealSchema).min(1),
});

const DietAiPlanSchema = z.object({
  days: z.number().int().positive(),
  assumptions: z.array(z.string()).default([]),
  plan: z.array(AiDaySchema).min(1),
});

export type DietAiPlan = z.infer<typeof DietAiPlanSchema>;

function extractJson(text: string): unknown {
  const t = text.trim();
  if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t);

  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));

  throw new Error('Resposta da IA não contém JSON parseável');
}

@Injectable()
export class DietAiService {
  constructor(
    private llm: OpenAiDietAiClient,
    private prompts: DietMasterPromptService,
    private config: ConfigService,
  ) {}

  async generatePlan(input: {
    profile: unknown;
    config: unknown;
    notes?: string;
  }): Promise<DietAiPlan> {
    const model = this.config.get<string>('OPENAI_MODEL', 'gpt-5');

    const instructions = this.prompts.getInstructions();
    const userPrompt = this.prompts.buildUserPrompt(input);

    let lastErr: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const text = await this.llm.generateText({
          model,
          instructions,
          input:
            attempt === 1
              ? userPrompt
              : `${userPrompt}\n\nIMPORTANTE: Responda APENAS com JSON válido no schema. Sem texto extra.`,
        });

        const parsed = extractJson(text);
        return DietAiPlanSchema.parse(parsed);
      } catch (e) {
        lastErr = e;
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error('Falha ao gerar plano na IA');
  }
}
