import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignPlanFeaturesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];
}
