import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateSalonFeaturesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  features!: string[];
}
