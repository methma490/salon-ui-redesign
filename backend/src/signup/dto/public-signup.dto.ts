import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SignupSalonDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class SignupAdminDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class PublicSignupDto {
  @IsUUID()
  planId!: string;

  @ValidateNested()
  @Type(() => SignupSalonDto)
  salon!: SignupSalonDto;

  @ValidateNested()
  @Type(() => SignupAdminDto)
  admin!: SignupAdminDto;
}
