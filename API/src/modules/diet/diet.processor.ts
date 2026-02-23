// src/modules/diet/diet.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DietRequestStatus } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { DietAiService } from './infra/ai/diet-ai.service';
import { TacoEnricherService } from './infra/taco/taco-enricher.service';

function getNotesFromConfig(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') return undefined;
  const notes = (config as Record<string, unknown>).notes;
  return typeof notes === 'string' ? notes : undefined;
}

@Processor('diet')
export class DietProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private dietAi: DietAiService,
    private tacoEnricher: TacoEnricherService,
  ) {
    super();
  }

  async process(job: Job<{ requestId: number }, unknown, string>) {
    switch (job.name) {
      case 'process':
        return this.handleProcess(job);
      default:
        return;
    }
  }

  private async handleProcess(job: Job<{ requestId: number }>) {
    const { requestId } = job.data;

    const req = await this.prisma.dietRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, config: true },
    });
    if (!req) return;

    await this.prisma.dietRequest.update({
      where: { id: requestId },
      data: {
        status: DietRequestStatus.PROCESSING,
        error: null,
        finishedAt: null,
      },
    });

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: req.userId },
    });

    if (!profile) {
      await this.prisma.dietRequest.update({
        where: { id: requestId },
        data: {
          status: DietRequestStatus.FAILED,
          error: 'UserProfile não encontrado',
          finishedAt: new Date(),
        },
      });
      return;
    }

    const notes = getNotesFromConfig(req.config);

    try {
      const aiPlan = await this.dietAi.generatePlan({
        profile,
        config: req.config,
        notes,
      });

      const result = await this.tacoEnricher.enrich(aiPlan);

      await this.prisma.dietRequest.update({
        where: { id: requestId },
        data: {
          status: DietRequestStatus.DONE,
          result,
          finishedAt: new Date(),
        },
      });

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : JSON.stringify(err);

      await this.prisma.dietRequest.update({
        where: { id: requestId },
        data: {
          status: DietRequestStatus.FAILED,
          error: message,
          finishedAt: new Date(),
        },
      });

      throw err;
    }
  }
}
