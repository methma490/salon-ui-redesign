import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SetFeatureAddonPriceDto } from '../subscriptions/dto/subscription.dto';
import { SubscriptionAddonsService } from '../subscriptions/subscription-addons.service';

@Controller('super-admin/features')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminFeaturesController {
  constructor(private readonly addonsService: SubscriptionAddonsService) {}

  @Get('add-ons')
  listAddonFeatures() {
    return this.addonsService.listFeaturesWithAddonPrices();
  }

  @Get(':id/add-on-prices')
  getAddonPrices(@Param('id', ParseUUIDPipe) id: string) {
    return this.addonsService.getFeatureAddonPrices(id);
  }

  @Post(':id/add-on-prices')
  setAddonPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFeatureAddonPriceDto,
  ) {
    return this.addonsService.setFeatureAddonPrice(id, dto);
  }

  @Put(':id/add-on-prices')
  updateAddonPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFeatureAddonPriceDto,
  ) {
    return this.addonsService.setFeatureAddonPrice(id, dto);
  }
}
