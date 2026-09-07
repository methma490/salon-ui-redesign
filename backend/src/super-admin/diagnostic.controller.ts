import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('super-admin/diagnostic')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class DiagnosticController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenant/:schemaName/users')
  async getTenantUsers(@Param('schemaName') schemaName: string) {
    try {
      await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}"`);

      const users = await this.prisma.$queryRawUnsafe(`
        SELECT u.id, u.name, u.email, u.status, ARRAY_AGG(r.code) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id, u.name, u.email, u.status
      `);

      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);

      return { schemaName, users };
    } catch (error) {
      await this.prisma.$executeRawUnsafe(`SET search_path TO public`);
      throw error;
    }
  }
}
