import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const SALON_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const;

export type SalonStatusValue = (typeof SALON_STATUSES)[number];

export class UpdateSalonStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(SALON_STATUSES)
  status!: SalonStatusValue;
}
