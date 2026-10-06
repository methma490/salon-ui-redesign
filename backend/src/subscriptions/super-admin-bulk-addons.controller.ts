import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { BulkAddonsService } from './bulk-addons.service';
import {
  BulkAddonConfirmDto,
  BulkAddonPreviewDto,
  BulkAddonSalonsQueryDto,
} from './dto/subscription.dto';

@Controller('super-admin/add-ons/bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminBulkAddonsController {
  constructor(private readonly bulkAddonsService: BulkAddonsService) {}

  @Get('salons')
  getSalonsForSelection(@Query() query: BulkAddonSalonsQueryDto) {
    return this.bulkAddonsService.getSalonsForBulkSelection(query);
  }

  @Post('preview')
  previewBulkAddons(@Body() dto: BulkAddonPreviewDto) {
    return this.bulkAddonsService.previewBulkAddons(dto);
  }

  @Post('confirm')
  confirmBulkAddons(
    @Body() dto: BulkAddonConfirmDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bulkAddonsService.confirmBulkAddons(dto, user?.id);
  }
}
