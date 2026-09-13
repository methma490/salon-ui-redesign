import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateProductCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class UpdateProductStatusDto {
  @IsEnum(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

export class StockInDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockAdjustmentDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  productId!: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListStockMovementsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
