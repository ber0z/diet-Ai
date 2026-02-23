import { Injectable, NotFoundException } from '@nestjs/common';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UsersRepository } from './user.repository';

@Injectable()
export class UsersService {
  constructor(private repo: UsersRepository) {}

  async me(userId: number) {
    const me = await this.repo.findMe(userId);
    if (!me) throw new NotFoundException('Usuário não encontrado.');
    return me;
  }

  upsertProfile(userId: number, dto: UpsertProfileDto) {
    return this.repo.upsertProfile(userId, {
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      goal: dto.goal,
      activityLevel: dto.activityLevel,
      restrictions: dto.restrictions ?? undefined,
    });
  }
}
