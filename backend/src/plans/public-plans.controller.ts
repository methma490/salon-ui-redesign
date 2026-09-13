import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PlansService } from './plans.service';

@Controller('plans')
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @SkipThrottle()
  findPublicPlans() {
    return this.plansService.findPublicActivePlans();
  }
}
