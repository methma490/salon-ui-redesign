import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class PosServiceItemDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

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

export class CreateSaleDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments!: PosPaymentDto[];
}

export class ListSalesQueryDto {
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
