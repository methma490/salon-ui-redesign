import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListSupplierOutstandingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(['all', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OPEN'])
  paymentStatus?: 'all' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OPEN';

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
