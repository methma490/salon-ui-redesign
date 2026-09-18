import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicDeclineQuotationDto } from './dto/quotation.dto';
import { QuotationsService } from './quotations.service';

@Controller('public/quotations')
export class PublicQuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.quotationsService.getPublicByToken(token);
  }

  @Post(':token/accept')
  accept(@Param('token') token: string, @Req() req: Request) {
    return this.quotationsService.acceptPublic(token, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post(':token/decline')
  decline(@Param('token') token: string, @Body() dto: PublicDeclineQuotationDto) {
    return this.quotationsService.declinePublic(token, dto.reason);
  }
}
