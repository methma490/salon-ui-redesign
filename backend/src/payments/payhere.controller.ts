import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PayHereNotifyPayload } from './payhere.service';
import { SignupService } from '../signup/signup.service';

/** Legacy route kept in signup module — see signup/signup.module.ts */
@Controller('payments/payhere')
export class PayHereController {
  constructor(private readonly signupService: SignupService) {}

  @Post('notify')
  @HttpCode(200)
  @SkipThrottle()
  async notify(@Body() body: PayHereNotifyPayload) {
    return this.signupService.handlePayHereNotify(body);
  }
}
