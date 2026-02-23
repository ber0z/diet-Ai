import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type { JsonObject } from '../../common/types/json';
import { DietRepository } from './diet.repository';

@Injectable()
export class DietService {
  constructor(
    private repo: DietRepository,
    @InjectQueue('diet') private dietQueue: Queue,
  ) {}

  async createRequest(userId: number, config: JsonObject) {
    const req = await this.repo.createRequest(userId, config);

    await this.dietQueue.add(
      'process',
      { requestId: req.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return req;
  }

  listRequests(userId: number) {
    return this.repo.listRequests(userId);
  }

  async getRequest(userId: number, id: number) {
    const req = await this.repo.findByIdAndUserId(userId, id);
    if (!req) throw new NotFoundException('DietRequest não encontrado.');
    return req;
  }
}
