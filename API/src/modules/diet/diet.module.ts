import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { DietController } from './diet.controller';
import { DietService } from './diet.service';
import { DietProcessor } from './diet.processor';

import { DietAiService } from './infra/ai/diet-ai.service';
import { OpenAiDietAiClient } from './infra/ai/diet-ai.client';
import { DietMasterPromptService } from './infra/ai/prompts/master.prompt.service';

import { TacoResolverService } from './infra/taco/resolver.service';
import { TacoEnricherService } from './infra/taco/taco-enricher.service';
import { DietRepository } from './diet.repository';

@Module({
  imports: [ConfigModule, BullModule.registerQueue({ name: 'diet' })],
  controllers: [DietController],
  providers: [
    DietService,
    DietRepository,
    DietProcessor,

    OpenAiDietAiClient,
    DietMasterPromptService,
    DietAiService,

    TacoResolverService,
    TacoEnricherService,
  ],
})
export class DietModule {}
