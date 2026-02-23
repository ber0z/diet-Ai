import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { ActivityLevel, Goal, Prisma } from '@prisma/client';

export type MeResponse = {
  email: string;
  createdAt: Date;
  profile: {
    weightKg: number;
    heightCm: number;
    goal: Goal;
    activityLevel: ActivityLevel;
    restrictions: Prisma.JsonValue | null;
    updatedAt: Date;
  } | null;
};

export type UpsertProfileData = {
  weightKg: number;
  heightCm: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  restrictions?: string[];
};

export type ProfileResponse = {
  weightKg: number;
  heightCm: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  restrictions: string[] | null;
  updatedAt: Date;
};

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  findMe(userId: number): Promise<MeResponse | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        createdAt: true,
        profile: {
          select: {
            weightKg: true,
            heightCm: true,
            goal: true,
            activityLevel: true,
            restrictions: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  upsertProfile(
    userId: number,
    data: UpsertProfileData,
  ): Promise<ProfileResponse> {
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        goal: data.goal,
        activityLevel: data.activityLevel,
        restrictions: data.restrictions ?? undefined,
      },
      create: {
        userId,
        weightKg: data.weightKg,
        heightCm: data.heightCm,
        goal: data.goal,
        activityLevel: data.activityLevel,
        restrictions: data.restrictions ?? undefined,
      },
      select: {
        weightKg: true,
        heightCm: true,
        goal: true,
        activityLevel: true,
        restrictions: true,
        updatedAt: true,
      },
    }) as Promise<ProfileResponse>;
  }
}
