import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, PreApproval, Preference } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    this.client = new MercadoPagoConfig({ accessToken: accessToken || '' });
    if (!accessToken) {
      this.logger.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN no configurada en variables de entorno.');
    }
  }

  /**
   * Helper para obtener el token de plataforma activo (BD o Env)
   */
  async getActivePlatformAccessToken(): Promise<string> {
    const dbToken = await this.prisma.platformSetting.findUnique({
      where: { key: 'MP_PLATFORM_ACCESS_TOKEN' },
    });
    return dbToken?.value || this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
  }

  /**
   * Helper para obtener el cliente de MercadoPago de plataforma
   */
  async getPlatformClient(): Promise<MercadoPagoConfig> {
    const token = await this.getActivePlatformAccessToken();
    return new MercadoPagoConfig({ accessToken: token });
  }

  /**
   * Probar conexión con MercadoPago
   */
  async testAccessToken(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          data: {
            id: data.id,
            nickname: data.nickname,
            email: data.email,
            siteId: data.site_id,
          },
        };
      } else {
        const err = await res.json();
        return { success: false, error: err.message || `HTTP ${res.status}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión' };
    }
  }

  /**
   * Obtener configuración de MercadoPago de la Plataforma (Super Admin)
   */
  async getPlatformConfig() {
    const token = await this.getActivePlatformAccessToken();
    const dbPubKey = await this.prisma.platformSetting.findUnique({ where: { key: 'MP_PLATFORM_PUBLIC_KEY' } });
    const publicKey = dbPubKey?.value || this.configService.get<string>('MERCADOPAGO_PUBLIC_KEY') || '';

    const dbSecret = await this.prisma.platformSetting.findUnique({ where: { key: 'MP_PLATFORM_WEBHOOK_SECRET' } });
    const webhookSecret = dbSecret?.value || this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET') || '';

    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'https://wasaas-production.up.railway.app';
    const webhookUrl = `${backendUrl}/mercadopago/webhook`;

    let connectionStatus = 'UNCONFIGURED';
    let accountInfo: any = null;

    if (token) {
      const test = await this.testAccessToken(token);
      if (test.success) {
        connectionStatus = 'CONNECTED';
        accountInfo = test.data;
      } else {
        connectionStatus = 'ERROR';
      }
    }

    return {
      isConfigured: !!token,
      connectionStatus,
      accountInfo,
      publicKey,
      webhookUrl,
      maskedToken: token ? `${token.slice(0, 10)}...${token.slice(-4)}` : '',
      webhookSecret: webhookSecret ? '******' : '',
    };
  }

  /**
   * Guardar configuración de MercadoPago de la Plataforma (Super Admin)
   */
  async savePlatformConfig(data: { accessToken?: string; publicKey?: string; webhookSecret?: string }) {
    if (data.accessToken) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'MP_PLATFORM_ACCESS_TOKEN' },
        create: { key: 'MP_PLATFORM_ACCESS_TOKEN', value: data.accessToken.trim() },
        update: { value: data.accessToken.trim() },
      });
      // Actualizar cliente en memoria
      this.client = new MercadoPagoConfig({ accessToken: data.accessToken.trim() });
    }

    if (data.publicKey !== undefined) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'MP_PLATFORM_PUBLIC_KEY' },
        create: { key: 'MP_PLATFORM_PUBLIC_KEY', value: data.publicKey.trim() },
        update: { value: data.publicKey.trim() },
      });
    }

    if (data.webhookSecret !== undefined) {
      await this.prisma.platformSetting.upsert({
        where: { key: 'MP_PLATFORM_WEBHOOK_SECRET' },
        create: { key: 'MP_PLATFORM_WEBHOOK_SECRET', value: data.webhookSecret.trim() },
        update: { value: data.webhookSecret.trim() },
      });
    }

    return this.getPlatformConfig();
  }

  /**
   * Obtener configuración de MercadoPago para la Organización del Cliente
   */
  async getClientConfig(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mpAccessToken: true, mpPublicKey: true, mpWebhookSecret: true },
    });

    if (!org) return { isConfigured: false };

    let connectionStatus = 'UNCONFIGURED';
    let accountInfo: any = null;

    if (org.mpAccessToken) {
      const test = await this.testAccessToken(org.mpAccessToken);
      if (test.success) {
        connectionStatus = 'CONNECTED';
        accountInfo = test.data;
      } else {
        connectionStatus = 'ERROR';
      }
    }

    return {
      isConfigured: !!org.mpAccessToken,
      connectionStatus,
      accountInfo,
      publicKey: org.mpPublicKey || '',
      maskedToken: org.mpAccessToken ? `${org.mpAccessToken.slice(0, 10)}...${org.mpAccessToken.slice(-4)}` : '',
    };
  }

  /**
   * Guardar configuración de MercadoPago para la Organización del Cliente
   */
  async saveClientConfig(organizationId: string, data: { accessToken: string; publicKey?: string }) {
    const test = await this.testAccessToken(data.accessToken.trim());
    if (!test.success) {
      throw new Error(`Token inválido de MercadoPago: ${test.error}`);
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        mpAccessToken: data.accessToken.trim(),
        mpPublicKey: data.publicKey ? data.publicKey.trim() : undefined,
      },
    });

    return {
      success: true,
      accountInfo: test.data,
      isConfigured: true,
      maskedToken: `${updated.mpAccessToken?.slice(0, 10)}...${updated.mpAccessToken?.slice(-4)}`,
    };
  }

  /**
   * Crear link de cobro Checkout Pro (para ventas directas por WhatsApp)
   */
  async createPaymentPreference(
    organizationId: string,
    title: string,
    amount: number,
    customerPhone?: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    // Usar el token del cliente o el token de la plataforma
    const token = org?.mpAccessToken || (await this.getActivePlatformAccessToken());
    if (!token) {
      throw new Error('No hay credenciales de MercadoPago configuradas para procesar cobros.');
    }

    const clientToUse = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(clientToUse);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://mibot.skale.cl';

    const res = await preference.create({
      body: {
        items: [
          {
            id: `item-${Date.now()}`,
            title,
            unit_price: amount,
            quantity: 1,
            currency_id: 'CLP',
          },
        ],
        external_reference: `${organizationId}:${customerPhone || 'direct'}`,
        back_urls: {
          success: `${frontendUrl}/payment/success`,
          failure: `${frontendUrl}/payment/failure`,
          pending: `${frontendUrl}/payment/pending`,
        },
        auto_return: 'approved',
      },
    });

    return {
      initPoint: res.init_point,
      sandboxInitPoint: res.sandbox_init_point,
      preferenceId: res.id,
    };
  }

  /**
   * Crear un link de suscripción mensual recurrente de SaaS
   */
  async createSubscriptionLink(
    organizationId: string,
    userEmail: string,
    planName: string,
    amount: number,
  ) {
    try {
      const client = await this.getPlatformClient();
      const preapproval = new PreApproval(client);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://mibot.skale.cl';

      const response = await preapproval.create({
        body: {
          reason: `Suscripción SaaS WhatsApp Bot - Plan ${planName}`,
          external_reference: organizationId,
          payer_email: userEmail,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'CLP',
          },
          back_url: `${frontendUrl}/dashboard/billing?status=success`,
          status: 'authorized',
        },
      });

      // Persistir suscripción en BD
      const planType =
        planName.toUpperCase() === 'PRO'
          ? 'PRO'
          : planName.toUpperCase() === 'ENTERPRISE'
          ? 'ENTERPRISE'
          : 'STARTER';

      await this.prisma.subscription.upsert({
        where: {
          mpPreapprovalId: response.id?.toString() || `temp-${Date.now()}`,
        },
        create: {
          organizationId,
          plan: planType as any,
          status: 'PENDING',
          mpPreapprovalId: response.id?.toString(),
          mpPayerId: userEmail,
        },
        update: {
          status: 'PENDING',
          plan: planType as any,
        },
      });

      this.logger.log(`💳 Suscripción creada para Org ${organizationId}: Plan ${planName} ($${amount})`);

      return {
        initPoint: response.init_point,
        subscriptionId: response.id,
      };
    } catch (error) {
      this.logger.error('Error al crear suscripción en MercadoPago:', error);
      throw error;
    }
  }

  /**
   * Procesar Webhook de MercadoPago y actualizar suscripción en BD
   */
  async handleWebhook(body: any) {
    this.logger.log(`📩 Webhook MercadoPago recibido: type=${body.type}, action=${body.action}`);

    if (body.type === 'subscription_preapproval') {
      const subscriptionMpId = body.data?.id;
      if (!subscriptionMpId) return { status: 'ignored' };

      try {
        const client = await this.getPlatformClient();
        const preapproval = new PreApproval(client);
        const mpSubscription = await preapproval.get({ id: subscriptionMpId });

        const organizationId = mpSubscription.external_reference;
        const status = mpSubscription.status;

        const subStatus =
          status === 'authorized' ? 'ACTIVE' : status === 'cancelled' ? 'CANCELLED' : 'PENDING';

        if (organizationId) {
          const currentEnd = new Date();
          currentEnd.setMonth(currentEnd.getMonth() + 1);

          await this.prisma.subscription.updateMany({
            where: { organizationId },
            data: {
              status: subStatus as any,
              currentPeriodEnd: subStatus === 'ACTIVE' ? currentEnd : undefined,
            },
          });
          this.logger.log(`✅ Suscripción de Org ${organizationId} actualizada a ${subStatus}`);
        }
      } catch (err) {
        this.logger.error('Error procesando webhook de suscripción:', err);
      }
    }

    return { status: 'received' };
  }
}
