import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { PreferencesDto } from './preferences.dto';
import { ConstraintsDto } from './constraints.dto';
import { TargetsDto } from './targets.dto';

export class DietRequestConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  mealsPerDay?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints?: ConstraintsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetsDto)
  targets?: TargetsDto;
}
