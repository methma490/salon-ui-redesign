import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignPlanFeaturesDto } from './dto/assign-plan-features.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdatePlanPricingDto } from './dto/update-plan-pricing.dto';
import { PlansService } from './plans.service';

@Controller('super-admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findById(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Put(':id/features')
  assignFeatures(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignPlanFeaturesDto) {
    return this.plansService.assignFeatures(id, dto);
  }

  @Put(':id/pricing')
  updatePricing(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanPricingDto) {
    return this.plansService.updatePricing(id, dto);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.deactivate(id);
  }
}
