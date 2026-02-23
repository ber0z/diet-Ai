import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class PreferencesDto {
  @IsOptional()
  @IsIn(['balanced', 'lowcarb', 'keto', 'highprotein', 'vegetarian', 'vegan'])
  dietStyle?:
    | 'balanced'
    | 'lowcarb'
    | 'keto'
    | 'highprotein'
    | 'vegetarian'
    | 'vegan';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  cuisine?: string[];

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  budget?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsIn(['quick', 'normal', 'advanced'])
  prepTime?: 'quick' | 'normal' | 'advanced';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  preferredMeals?: string[];
}
