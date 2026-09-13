import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class AdminInvoiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
