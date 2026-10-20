import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export type AuthPortal = 'salon' | 'super-admin';

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(['salon', 'super-admin'])
  portal?: AuthPortal;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  salonCode?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  tenantCode?: string;
}
