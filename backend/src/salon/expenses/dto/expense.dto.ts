import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export const EXPENSE_PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export class CreateExpenseCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  description?: string;
}

export class CreateExpenseDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsEnum(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsEnum(EXPENSE_PAYMENT_METHODS)
  paymentMethod?: ExpensePaymentMethod;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  notes?: string;
}

export class UpdateExpenseStatusDto {
  @IsEnum(['ACTIVE', 'VOID'])
  status!: 'ACTIVE' | 'VOID';
}

export class ListExpensesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'VOID'])
  status?: 'ACTIVE' | 'VOID';

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
