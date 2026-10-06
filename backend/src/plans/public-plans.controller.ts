import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PlansService } from './plans.service';

@Controller()
export class PublicPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('plans')
  @SkipThrottle()
  findPublicPlans() {
    return this.plansService.findPublicActivePlans();
  }

  @Get('public/plans')
  @SkipThrottle()
  findPublicPlansAlias() {
    return this.plansService.findPublicActivePlans();
  }
}
