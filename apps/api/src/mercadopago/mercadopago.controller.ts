import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';

@Controller('mercadopago')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Post('create-subscription')
  async createSubscription(
    @Body() body: { organizationId: string; userEmail: string; planName: string; amount: number },
  ) {
    return this.mercadoPagoService.createSubscriptionLink(
      body.organizationId || 'tenant-demo-01',
      body.userEmail || 'cliente@ejemplo.com',
      body.planName || 'Starter',
      body.amount || 29,
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.mercadoPagoService.handleWebhook(body);
  }
}
