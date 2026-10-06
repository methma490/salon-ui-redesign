import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GrnItemInputDto {
  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;
}

export class CreateGrnDto {
  @IsUUID()
  supplierId!: string;

  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierInvoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  grnDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrnItemInputDto)
  items!: GrnItemInputDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsEnum(['DRAFT', 'RECEIVED'])
  status?: 'DRAFT' | 'RECEIVED';

  // Initial payment flow
  @IsOptional()
  @IsEnum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'])
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNumber?: string;

  @IsOptional()
  @IsDateString()
  chequeDate?: string;
}

export class UpdateGrnDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierInvoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  grnDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GrnItemInputDto)
  items?: GrnItemInputDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class ReceiveGrnDto {
  @IsOptional()
  @IsEnum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'])
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT';

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNumber?: string;

  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelGrnDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListGrnsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsEnum(['all', 'DRAFT', 'RECEIVED', 'CANCELLED'])
  grnStatus?: 'all' | 'DRAFT' | 'RECEIVED' | 'CANCELLED';

  @IsOptional()
  @IsEnum(['all', 'UNPAID', 'PARTIALLY_PAID', 'PAID'])
  paymentStatus?: 'all' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
