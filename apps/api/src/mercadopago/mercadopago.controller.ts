import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Param, NotFoundException } from '@nestjs/common';
import { MercadoPagoService } from './mercadopago.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Suscripción por ID de plan real (recomendado — datos desde BD)
   */
  @Post('subscribe-plan/:planId')
  @UseGuards(JwtAuthGuard)
  async subscribeToPlan(@Param('planId') planId: string, @Req() req: any) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan no encontrado o inactivo.');
    }

    return this.mercadoPagoService.createSubscriptionLink(
      req.user.organizationId,
      req.user.email,
      plan.name,
      plan.price,
    );
  }

  /**
   * Suscripción manual con nombre y monto (legacy — mantener compatibilidad)
   */
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
