import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { DietRequestConfigDto } from './diet-request-config.dto';

export class CreateDietRequestDto {
  @ValidateNested()
  @Type(() => DietRequestConfigDto)
  config!: DietRequestConfigDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
