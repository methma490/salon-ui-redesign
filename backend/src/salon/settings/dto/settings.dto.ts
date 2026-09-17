import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ModuleAccessLevel } from '../../utils/permission-feature.util';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class UpdateSalonSettingsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  phone?: string;
}

export class UpdateAppearanceSettingsDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor must be a valid HEX color (#RRGGBB)',
  })
  primaryColor!: string;
}

export class UpdateAccountSettingsDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roleCodes!: string[];
}

class ModuleAccessEntryDto {
  @IsString()
  @IsNotEmpty()
  moduleCode!: string;

  @IsIn(['none', 'view', 'manage'])
  level!: ModuleAccessLevel;
}

export class UpdateUserAccessDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  roleCode!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleAccessEntryDto)
  moduleAccess!: ModuleAccessEntryDto[];
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleAccessEntryDto)
  moduleAccess!: ModuleAccessEntryDto[];
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleAccessEntryDto)
  moduleAccess!: ModuleAccessEntryDto[];
}

export class ChangeSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
