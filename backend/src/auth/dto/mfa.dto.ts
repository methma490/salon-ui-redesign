import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class MfaVerifyLoginDto {
  @IsString()
  @IsNotEmpty()
  mfaSessionToken: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class MfaEnableDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  recoveryCodes: string[];
}

export class MfaDisableDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  recoveryCode?: string;
}

export class MfaRegenerateRecoveryCodesDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
