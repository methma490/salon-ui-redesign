import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class PosServiceItemDto {
  @IsUUID()
  serviceId!: string;

  /** Employee who performed this service line (required for commission tracking). */
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class PosProductItemDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class PosPaymentDto {
  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'])
  method!: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  referenceNumber?: string;
}

export class SaleEmployeeDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsEnum(['PRIMARY', 'ASSISTANT'])
  assignmentType?: 'PRIMARY' | 'ASSISTANT';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  allocationPercentage?: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosServiceItemDto)
  services!: PosServiceItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosProductItemDto)
  products!: PosProductItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  /** Sale-level employee assignments with allocation (preferred). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleEmployeeDto)
  employees?: SaleEmployeeDto[];

  @IsOptional()
  @IsEnum(['COMPLETED', 'PENDING'])
  status?: 'COMPLETED' | 'PENDING';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments?: PosPaymentDto[];
}

export class ListSalesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['COMPLETED', 'PENDING'])
  status?: 'COMPLETED' | 'PENDING';

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  cashierId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  search?: string;
}
