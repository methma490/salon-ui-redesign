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

export class PaymentAllocationItemDto {
  @IsUUID()
  grnId!: string;

  @IsNumber()
  @Min(0.01)
  allocatedAmount!: number;
}

export class CreateSupplierPaymentDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(['CASH', 'BANK_TRANSFER', 'CHEQUE'])
  paymentMethod!: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationItemDto)
  allocations?: PaymentAllocationItemDto[];
}

export class UpdateChequeStatusDto {
  @IsEnum(['CLEARED', 'BOUNCED'])
  status!: 'CLEARED' | 'BOUNCED';

  @IsOptional()
  @IsDateString()
  clearedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListSupplierPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(['all', 'CASH', 'BANK_TRANSFER', 'CHEQUE'])
  paymentMethod?: 'all' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';

  @IsOptional()
  @IsEnum(['all', 'PENDING', 'CLEARED', 'BOUNCED'])
  chequeStatus?: 'all' | 'PENDING' | 'CLEARED' | 'BOUNCED';

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
