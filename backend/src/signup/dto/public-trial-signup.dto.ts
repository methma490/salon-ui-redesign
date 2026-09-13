import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PublicSignupDto } from './public-signup.dto';

export class PublicTrialSignupDto extends PublicSignupDto {
  @IsOptional()
  @IsUUID()
  planPriceId?: string;

  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}
