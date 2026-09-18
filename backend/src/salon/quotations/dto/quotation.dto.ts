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

export class QuotationItemDto {
  @IsUUID()
  serviceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quotationUnitPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class CreateQuotationDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items!: QuotationItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'SENT'])
  status?: 'DRAFT' | 'SENT';
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class ListQuotationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ConvertQuotationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConvertPaymentDto)
  payments!: ConvertPaymentDto[];

  /** Optional override performers per quotation item id */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConvertItemPerformerDto)
  itemPerformers?: ConvertItemPerformerDto[];
}

export class ConvertPaymentDto {
  @IsEnum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'])
  method!: 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class ConvertItemPerformerDto {
  @IsUUID()
  quotationItemId!: string;

  @IsUUID()
  employeeId!: string;
}

export class DeclineQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}

export class PublicDeclineQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}
