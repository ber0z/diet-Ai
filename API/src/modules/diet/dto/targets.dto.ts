import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class TargetsDto {
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(6000)
  kcal?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(400)
  proteinG?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(800)
  carbsG?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  fatG?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  fiberG?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  waterMl?: number | null;
}
