import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import type { User } from '@prisma/client';

export type PublicUser = Pick<User, 'id' | 'email' | 'createdAt'>;

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createUser(email: string, passwordHash: string): Promise<PublicUser> {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            weightKg: 70,
            heightCm: 170,
            goal: 'MAINTAIN',
            activityLevel: 'MEDIUM',
          },
        },
      },
      select: { id: true, email: true, createdAt: true },
    });
  }
}
