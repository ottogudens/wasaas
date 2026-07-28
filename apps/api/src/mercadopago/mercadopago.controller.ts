import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsNumber, IsEmail, IsOptional, Min } from 'class-validator';

class CreateSubscriptionDto {
  @IsOptional()
  @IsEmail()
  userEmail?: string;

  @IsString()
  planName: string;

  @IsNumber()
  @Min(1)
  amount: number;
}

@Controller('mercadopago')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Post('create-subscription')
  @UseGuards(JwtAuthGuard)
  async createSubscription(@Req() req: any, @Body() body: CreateSubscriptionDto) {
    return this.mercadoPagoService.createSubscriptionLink(
      req.user.organizationId,
      body.userEmail || req.user.email,
      body.planName,
      body.amount,
    );
  }

  /**
   * Webhook de MercadoPago — público, sin JWT (MercadoPago no envía tokens)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.mercadoPagoService.handleWebhook(body);
  }
}
