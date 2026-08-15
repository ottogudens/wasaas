import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

class UpdateTenantAiDto {
  @IsOptional()
  @IsString()
  aiModel?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

class UpdateSubscriptionDto {
  @IsString()
  plan: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CORTESIA';

  @IsOptional()
  @IsString()
  customPlanName?: string;

  @IsString()
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'TRIAL_EXPIRED';
}

class ToggleTenantStatusDto {
  @IsBoolean()
  isActive: boolean;
}

class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  maxBots: number;

  @IsNumber()
  maxDocs: number;

  @IsOptional()
  @IsArray()
  features?: string[];
}

class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  maxBots?: number;

  @IsOptional()
  @IsNumber()
  maxDocs?: number;

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  isActive?: boolean;
}

class CreateInvoiceDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly prisma: PrismaService) {}

  private checkSuperAdmin(req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acceso denegado: Se requieren permisos de Super Administrador.');
    }
  }

  // ── TENANTS MANAGEMENT ──────────────────────────────────────────
  @Get()
  async listAllTenants(@Req() req: any) {
    this.checkSuperAdmin(req);
    const organizations = await this.prisma.organization.findMany({
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
        },
        subscriptions: {
          orderBy: { updatedAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
        bots: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            status: true,
            aiModel: true,
            systemPrompt: true,
            phoneNumber: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return organizations;
  }

  @Patch(':id/ai-config')
  async updateTenantAiConfig(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateTenantAiDto,
  ) {
    this.checkSuperAdmin(req);

    const updateData: any = {};
    if (dto.aiModel !== undefined) updateData.aiModel = dto.aiModel;
    if (dto.systemPrompt !== undefined) updateData.systemPrompt = dto.systemPrompt;

    await this.prisma.botInstance.updateMany({
      where: { organizationId: id },
      data: updateData,
    });

    return { success: true, message: 'Configuración de IA del tenant actualizada exitosamente' };
  }

  @Patch(':id/subscription')
  async updateTenantSubscription(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    this.checkSuperAdmin(req);

    const existingSub = await this.prisma.subscription.findFirst({
      where: { organizationId: id },
      orderBy: { updatedAt: 'desc' },
    });

    let currentPeriodEnd = existingSub?.currentPeriodEnd;
    let status = dto.status as any;

    if (dto.plan === 'CORTESIA') {
      status = 'ACTIVE';
      currentPeriodEnd = new Date('2099-12-31T23:59:59.999Z');
    } else if (dto.plan === 'TRIAL') {
      currentPeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (status === 'ACTIVE' && (!currentPeriodEnd || currentPeriodEnd < new Date())) {
      currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (existingSub) {
      await this.prisma.subscription.updateMany({
        where: { organizationId: id },
        data: {
          plan: dto.plan,
          customPlanName: dto.customPlanName,
          status,
          currentPeriodEnd,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          organizationId: id,
          plan: dto.plan,
          customPlanName: dto.customPlanName,
          status,
          currentPeriodEnd,
        },
      });
    }

    return {
      success: true,
      message: `Suscripción actualizada exitosamente: Plan ${dto.plan} (${status})`,
    };
  }

  @Patch(':id/status')
  async toggleTenantStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: ToggleTenantStatusDto,
  ) {
    this.checkSuperAdmin(req);
    await this.prisma.organization.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    // Actualizar también a todos sus usuarios
    await this.prisma.user.updateMany({
      where: { organizationId: id },
      data: { isActive: dto.isActive },
    });

    return { success: true, message: `Tenant ${dto.isActive ? 'activado' : 'suspendido'} exitosamente` };
  }

  @Post(':id/invoices')
  async createInvoice(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateInvoiceDto,
  ) {
    this.checkSuperAdmin(req);

    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId: id,
        amount: dto.amount,
        description: dto.description || 'Cobro de servicio miBot SaaS',
        status: dto.status || 'PAID',
      },
      include: { organization: true },
    });

    // Enviar factura / recibo si se especificó teléfono
    if (dto.customerPhone) {
      try {
        const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
        const bot = await this.prisma.botInstance.findFirst({ where: { organizationId: id } });
        if (bot) {
          await fetch(`${botEngineUrl}/internal/send-document`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.INTERNAL_API_KEY,
            },
            body: JSON.stringify({
              tenantId: bot.tenantId,
              customerPhone: dto.customerPhone,
              documentTitle: `🧾 FACTURA / COMPROBANTE - ${invoice.organization.name}`,
              documentContent: `🧾 *COMPROBANTE DE COBRO / FACTURA*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *Cliente:* ${invoice.organization.name}
💰 *Monto:* $${invoice.amount} CLP
📄 *Detalle:* ${invoice.description}
📅 *Fecha:* ${new Date().toLocaleDateString('es-CL')}
📌 *Estado:* ${invoice.status === 'PAID' ? '✅ PAGADO' : '⏳ PENDIENTE'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Generado por miBot SaaS_`,
            }),
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Error al notificar factura por WhatsApp:', e);
      }
    }

    return invoice;
  }

  @Delete(':id')
  async deleteTenant(@Param('id') id: string, @Req() req: any) {
    this.checkSuperAdmin(req);
    await this.prisma.organization.delete({
      where: { id },
    });
    return { success: true, message: 'Tenant eliminado exitosamente' };
  }

  // ── BILLING (Cliente autenticado) ────────────────────────────────
  @Get('billing/me')
  async getBillingStatus(@Req() req: any) {
    const { organizationId } = req.user;

    const subscription = await this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });

    if (!subscription) {
      return { plan: 'NONE', status: 'NONE', trialDaysLeft: 0 };
    }

    if (subscription.plan === 'CORTESIA') {
      return {
        id: subscription.id,
        plan: 'CORTESIA',
        customPlanName: subscription.customPlanName || 'Cuenta de Cortesía (Gratuita)',
        status: 'ACTIVE',
        trialDaysLeft: 9999,
        isCourteous: true,
        trialEndsAt: subscription.currentPeriodEnd,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        mpPreapprovalId: subscription.mpPreapprovalId,
      };
    }

    let trialDaysLeft = 0;
    if (subscription.plan === 'TRIAL' && subscription.currentPeriodEnd) {
      const now = new Date();
      const diff = subscription.currentPeriodEnd.getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

      // Si el trial expiró y aún figura ACTIVE, lo marcamos TRIAL_EXPIRED
      if (trialDaysLeft === 0 && subscription.status === 'ACTIVE') {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'TRIAL_EXPIRED' },
        });
        subscription.status = 'TRIAL_EXPIRED' as any;
      }
    }

    return {
      id: subscription.id,
      plan: subscription.plan,
      customPlanName: subscription.customPlanName,
      status: subscription.status,
      trialDaysLeft,
      trialEndsAt: subscription.currentPeriodEnd,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      mpPreapprovalId: subscription.mpPreapprovalId,
    };
  }

  // ── PLANS MANAGEMENT ──────────────────────────────────────────────
  @Get('plans/public')
  async listPublicPlans() {
    // Sin guard — accesible por todos los clientes autenticados
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  @Get('plans/all')
  async listPlans() {
    return this.prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  @Post('plans/create')
  async createPlan(@Req() req: any, @Body() dto: CreatePlanDto) {
    this.checkSuperAdmin(req);
    return this.prisma.plan.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        maxBots: dto.maxBots,
        maxDocs: dto.maxDocs,
        features: dto.features || [],
      },
    });
  }

  @Delete('plans/:planId')
  async deletePlan(@Param('planId') planId: string, @Req() req: any) {
    this.checkSuperAdmin(req);
    await this.prisma.plan.delete({ where: { id: planId } });
    return { success: true, message: 'Plan eliminado' };
  }

  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @Req() req: any,
    @Body() dto: UpdatePlanDto,
  ) {
    this.checkSuperAdmin(req);
    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.maxBots !== undefined && { maxBots: dto.maxBots }),
        ...(dto.maxDocs !== undefined && { maxDocs: dto.maxDocs }),
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }
}
