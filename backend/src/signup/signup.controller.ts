import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PublicSignupDto } from './dto/public-signup.dto';
import { PublicTrialSignupDto } from './dto/public-trial-signup.dto';
import { SignupService } from './signup.service';

@Controller('public/signup')
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  @Post()
  @SkipThrottle()
  createCheckout(@Body() dto: PublicSignupDto) {
    return this.signupService.createSignupCheckout(dto);
  }

  @Post('trial')
  @SkipThrottle()
  createTrialSignup(@Body() dto: PublicTrialSignupDto) {
    return this.signupService.createTrialSignup(dto);
  }

  @Get('orders/:orderId/status')
  @SkipThrottle()
  getStatus(@Param('orderId') orderId: string) {
    return this.signupService.getOrderStatus(orderId);
  }

  @Post('orders/:orderId/confirm-return')
  @SkipThrottle()
  confirmReturn(@Param('orderId') orderId: string) {
    return this.signupService.confirmReturn(orderId);
  }

  @Post('orders/:orderId/cancel')
  @SkipThrottle()
  cancelOrder(@Param('orderId') orderId: string) {
    return this.signupService.cancelPendingSignup(orderId);
  }
}
