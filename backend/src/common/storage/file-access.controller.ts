import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../tenant/decorators/current-tenant.decorator';
import { TenantContextGuard } from '../../tenant/guards/tenant-context.guard';
import { TenantContext } from '../../tenant/interfaces/tenant-context.interface';
import { isPathTraversalSafe } from '../utils/file-security.util';

const ALLOWED_PUBLIC_CATEGORIES = ['logos', 'products', 'services', 'avatars'];

@Controller('files')
export class FileAccessController {
  /**
   * Public file endpoint (logos, public product/service catalog images).
   * Verifies category and prevents path traversal.
   */
  @Get('public/:category/:filename')
  getPublicFile(
    @Param('category') category: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!ALLOWED_PUBLIC_CATEGORIES.includes(category.toLowerCase())) {
      throw new ForbiddenException('Invalid or restricted file category');
    }

    if (!isPathTraversalSafe(filename) || !isPathTraversalSafe(category)) {
      throw new BadRequestException('Invalid filename or path traversal detected');
    }

    const filePath = join(process.cwd(), 'uploads', category, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return createReadStream(filePath).pipe(res);
  }

  /**
   * Private / Tenant-scoped file endpoint (receipts, expense attachments, private documents).
   * Enforces JWT authentication, TenantContextGuard, and tenant ownership.
   */
  @Get('private/:category/:filename')
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  getPrivateFile(
    @CurrentTenant() tenant: TenantContext,
    @Param('category') category: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    if (!isPathTraversalSafe(filename) || !isPathTraversalSafe(category)) {
      throw new BadRequestException('Invalid filename or path traversal detected');
    }

    // Scoped under uploads/private/<tenantId>/<category>/<filename>
    const filePath = join(process.cwd(), 'uploads', 'private', tenant.tenantId, category, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found or access denied');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return createReadStream(filePath).pipe(res);
  }
}
