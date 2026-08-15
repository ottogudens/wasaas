import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Param,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

class SavePlatformMpDto {
  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  publicKey?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
}

class SaveClientMpDto {
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  publicKey?: string;
}

class CreatePaymentPreferenceDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

@Controller('mercadopago')
export class MercadoPagoController {
  constructor(
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly prisma: PrismaService,
  ) {}

  private checkSuperAdmin(req: any) {
    if (req.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acceso denegado: Se requieren permisos de Super Administrador.');
    }
  }

  // ── 1. SUPER ADMIN: PLATFORM MERCADOPAGO CONFIG ──────────────────────────
  @Get('platform-config')
  @UseGuards(JwtAuthGuard)
  async getPlatformConfig(@Req() req: any) {
    this.checkSuperAdmin(req);
    return this.mercadoPagoService.getPlatformConfig();
  }

  @Post('platform-config')
  @UseGuards(JwtAuthGuard)
  async savePlatformConfig(@Req() req: any, @Body() body: SavePlatformMpDto) {
    this.checkSuperAdmin(req);
    return this.mercadoPagoService.savePlatformConfig(body);
  }

  @Post('test-platform-connection')
  @UseGuards(JwtAuthGuard)
  async testPlatformConnection(@Req() req: any, @Body('token') token?: string) {
    this.checkSuperAdmin(req);
    const tokenToTest = token || (await this.mercadoPagoService.getActivePlatformAccessToken());
    return this.mercadoPagoService.testAccessToken(tokenToTest);
  }

  // ── 2. CLIENT / ORG: MERCADOPAGO CONFIG (Para cobros directos por WhatsApp) ─
  @Get('client-config')
  @UseGuards(JwtAuthGuard)
  async getClientConfig(@Req() req: any) {
    return this.mercadoPagoService.getClientConfig(req.user.organizationId);
  }

  @Post('client-config')
  @UseGuards(JwtAuthGuard)
  async saveClientConfig(@Req() req: any, @Body() body: SaveClientMpDto) {
    return this.mercadoPagoService.saveClientConfig(req.user.organizationId, body);
  }

  @Post('create-payment-preference')
  @UseGuards(JwtAuthGuard)
  async createPaymentPreference(@Req() req: any, @Body() body: CreatePaymentPreferenceDto) {
    return this.mercadoPagoService.createPaymentPreference(
      req.user.organizationId,
      body.title,
      body.amount,
      body.customerPhone,
    );
  }

  // ── 3. SUSCRIPCIONES SAAS DE PLANES ──────────────────────────────────────
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

  // ── 4. WEBHOOK PÚBLICO DE MERCADOPAGO ────────────────────────────────────
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    return this.mercadoPagoService.handleWebhook(body);
  }
}
