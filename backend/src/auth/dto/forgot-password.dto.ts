import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export type AuthPortal = 'salon' | 'super-admin';

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(['salon', 'super-admin'])
  portal?: AuthPortal;
}
