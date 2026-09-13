import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum PaymentListFilter {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class PaymentListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentListFilter)
  filter?: PaymentListFilter;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(PaymentOrderStatus)
  status?: PaymentOrderStatus;
}
