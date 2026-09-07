import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminController {
  @Get('test')
  @Roles('SUPER_ADMIN')
  test() {
    return {
      message: 'Super Admin access granted',
    };
  }
}
