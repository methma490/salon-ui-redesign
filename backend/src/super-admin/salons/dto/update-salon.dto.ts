import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSalonDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
