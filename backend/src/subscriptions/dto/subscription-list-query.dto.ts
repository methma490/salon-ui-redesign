import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class SubscriptionListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
