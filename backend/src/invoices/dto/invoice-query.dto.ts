import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class InvoiceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
