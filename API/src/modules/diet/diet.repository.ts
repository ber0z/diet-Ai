import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { DietRequest } from '@prisma/client';
import type { JsonObject } from '../../common/types/json';

export type DietRequestListItem = Pick<
  DietRequest,
  'id' | 'status' | 'createdAt' | 'finishedAt' | 'error'
>;

@Injectable()
export class DietRepository {
  constructor(private prisma: PrismaService) {}

  createRequest(userId: number, config: JsonObject) {
    return this.prisma.dietRequest.create({
      data: { userId, config },
      select: { id: true, status: true, createdAt: true, config: true },
    });
  }

  listRequests(userId: number): Promise<DietRequestListItem[]> {
    return this.prisma.dietRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        finishedAt: true,
        error: true,
      },
    });
  }

  findByIdAndUserId(userId: number, id: number) {
    return this.prisma.dietRequest.findFirst({
      where: { id, userId },
    });
  }
}
