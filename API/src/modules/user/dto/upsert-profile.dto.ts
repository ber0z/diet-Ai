import { ActivityLevel, Goal } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsArray } from 'class-validator';

export class UpsertProfileDto {
  @IsNumber()
  weightKg!: number;

  @IsInt()
  heightCm!: number;

  @IsEnum(Goal)
  goal!: Goal;

  @IsEnum(ActivityLevel)
  activityLevel!: ActivityLevel;

  @IsOptional()
  @IsArray()
  restrictions?: string[];
}
