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

    console.log(`[SuperAdmin] Updating subscription for Org ${id} to Plan: ${dto.plan}, Status: ${status}`);

    if (dto.plan === 'CORTESIA') {
      status = 'ACTIVE';
      currentPeriodEnd = new Date('2099-12-31T23:59:59.999Z');
    } else if (dto.plan === 'TRIAL') {
      currentPeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (status === 'ACTIVE' && (!currentPeriodEnd || currentPeriodEnd < new Date())) {
      currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    if (existingSub) {
      const updateRes = await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          plan: dto.plan as any,
          customPlanName: dto.customPlanName !== undefined ? dto.customPlanName : null,
          status,
          currentPeriodEnd,
        },
      });
      console.log(`[SuperAdmin] updateMany result:`, updateRes);
    } else {
      const createRes = await this.prisma.subscription.create({
        data: {
          organizationId: id,
          plan: dto.plan as any,
          customPlanName: dto.customPlanName !== undefined ? dto.customPlanName : null,
          status,
          currentPeriodEnd,
        },
      });
      console.log(`[SuperAdmin] create result:`, createRes);
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

  // ── AI KEYS MANAGEMENT (SUPER ADMIN) ─────────────────────────────
  @Get('ai-keys')
  async getAiKeys(@Req() req: any) {
    this.checkSuperAdmin(req);

    const keys = await this.prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            'OPENAI_API_KEY',
            'GEMINI_API_KEY',
            'ANTHROPIC_API_KEY',
            'DEEPSEEK_API_KEY',
            'DEFAULT_AI_PROVIDER',
            'DEFAULT_AI_MODEL',
          ],
        },
      },
    });

    const keyMap: Record<string, string> = {};
    keys.forEach((k) => {
      keyMap[k.key] = k.value;
    });

    const openaiKey = keyMap['OPENAI_API_KEY'] || process.env.OPENAI_API_KEY || '';
    const geminiKey = keyMap['GEMINI_API_KEY'] || process.env.GEMINI_API_KEY || '';
    const anthropicKey = keyMap['ANTHROPIC_API_KEY'] || process.env.ANTHROPIC_API_KEY || '';
    const deepseekKey = keyMap['DEEPSEEK_API_KEY'] || process.env.DEEPSEEK_API_KEY || '';

    const mask = (val: string) => (val ? `${val.slice(0, 7)}...${val.slice(-4)}` : '');

    return {
      openai: {
        isConfigured: !!openaiKey,
        maskedKey: mask(openaiKey),
      },
      gemini: {
        isConfigured: !!geminiKey,
        maskedKey: mask(geminiKey),
      },
      anthropic: {
        isConfigured: !!anthropicKey,
        maskedKey: mask(anthropicKey),
      },
      deepseek: {
        isConfigured: !!deepseekKey,
        maskedKey: mask(deepseekKey),
      },
      defaultProvider: keyMap['DEFAULT_AI_PROVIDER'] || 'openai',
      defaultModel: keyMap['DEFAULT_AI_MODEL'] || 'gpt-4o-mini',
    };
  }

  @Post('ai-keys')
  async saveAiKeys(
    @Req() req: any,
    @Body() body: {
      openaiKey?: string;
      geminiKey?: string;
      anthropicKey?: string;
      deepseekKey?: string;
      defaultProvider?: string;
      defaultModel?: string;
    },
  ) {
    this.checkSuperAdmin(req);

    const upserts = [];

    if (body.openaiKey !== undefined && body.openaiKey.trim() !== '') {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'OPENAI_API_KEY' },
          create: { key: 'OPENAI_API_KEY', value: body.openaiKey.trim() },
          update: { value: body.openaiKey.trim() },
        }),
      );
    }

    if (body.geminiKey !== undefined && body.geminiKey.trim() !== '') {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'GEMINI_API_KEY' },
          create: { key: 'GEMINI_API_KEY', value: body.geminiKey.trim() },
          update: { value: body.geminiKey.trim() },
        }),
      );
    }

    if (body.anthropicKey !== undefined && body.anthropicKey.trim() !== '') {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'ANTHROPIC_API_KEY' },
          create: { key: 'ANTHROPIC_API_KEY', value: body.anthropicKey.trim() },
          update: { value: body.anthropicKey.trim() },
        }),
      );
    }

    if (body.deepseekKey !== undefined && body.deepseekKey.trim() !== '') {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'DEEPSEEK_API_KEY' },
          create: { key: 'DEEPSEEK_API_KEY', value: body.deepseekKey.trim() },
          update: { value: body.deepseekKey.trim() },
        }),
      );
    }

    if (body.defaultProvider !== undefined) {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'DEFAULT_AI_PROVIDER' },
          create: { key: 'DEFAULT_AI_PROVIDER', value: body.defaultProvider.trim() },
          update: { value: body.defaultProvider.trim() },
        }),
      );
    }

    if (body.defaultModel !== undefined) {
      upserts.push(
        this.prisma.platformSetting.upsert({
          where: { key: 'DEFAULT_AI_MODEL' },
          create: { key: 'DEFAULT_AI_MODEL', value: body.defaultModel.trim() },
          update: { value: body.defaultModel.trim() },
        }),
      );
    }

    await Promise.all(upserts);

    return { success: true, message: 'Credenciales de IA guardadas correctamente' };
  }

  @Post('ai-keys/test')
  async testAiKey(
    @Req() req: any,
    @Body() body: { provider: 'openai' | 'gemini' | 'anthropic' | 'deepseek'; apiKey?: string },
  ) {
    this.checkSuperAdmin(req);

    let keyToTest = body.apiKey?.trim();

    if (!keyToTest) {
      const keyNameMap: Record<string, string> = {
        openai: 'OPENAI_API_KEY',
        gemini: 'GEMINI_API_KEY',
        anthropic: 'ANTHROPIC_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
      };
      const dbKey = await this.prisma.platformSetting.findUnique({
        where: { key: keyNameMap[body.provider] },
      });
      keyToTest = dbKey?.value || process.env[keyNameMap[body.provider]] || '';
    }

    if (!keyToTest) {
      return { success: false, error: `No hay API Key ingresada ni guardada para ${body.provider.toUpperCase()}.` };
    }

    try {
      if (body.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${keyToTest}` },
        });
        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            message: `¡Conexión Exitosa con OpenAI! Modelos disponibles: ${data.data?.length || 0}`,
          };
        } else {
          const err = await res.json();
          return { success: false, error: err.error?.message || `Error HTTP ${res.status}` };
        }
      }

      if (body.provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            message: `¡Conexión Exitosa con Google Gemini! Modelos disponibles: ${data.models?.length || 0}`,
          };
        } else {
          const err = await res.json();
          return { success: false, error: err.error?.message || `Error HTTP ${res.status}` };
        }
      }

      if (body.provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': keyToTest,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (res.ok || res.status === 200) {
          return { success: true, message: '¡Conexión Exitosa con Anthropic Claude!' };
        } else {
          const err = await res.json();
          return { success: false, error: err.error?.message || `Error HTTP ${res.status}` };
        }
      }

      if (body.provider === 'deepseek') {
        const res = await fetch('https://api.deepseek.com/models', {
          headers: { Authorization: `Bearer ${keyToTest}` },
        });
        if (res.ok) {
          return { success: true, message: '¡Conexión Exitosa con DeepSeek AI!' };
        } else {
          const err = await res.json();
          return { success: false, error: err.error?.message || `Error HTTP ${res.status}` };
        }
      }

      return { success: false, error: 'Proveedor no soportado' };
    } catch (err: any) {
      return { success: false, error: `Error de red: ${err.message || 'No se pudo conectar con el proveedor'}` };
    }
  }
}
