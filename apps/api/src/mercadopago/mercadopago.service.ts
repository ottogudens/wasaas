import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
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
    if (!accessToken) {
      this.logger.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN no configurada. Los pagos no estarán disponibles.');
    }
    this.client = new MercadoPagoConfig({ accessToken: accessToken || '' });
  }

  /**
   * Crear un link de suscripción mensual recurrente y persistir en BD
   */
  async createSubscriptionLink(
    organizationId: string,
    userEmail: string,
    planName: string,
    amount: number,
  ) {
    try {
      const preapproval = new PreApproval(this.client);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

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
      const planType = planName.toUpperCase() === 'PRO' ? 'PRO' : planName.toUpperCase() === 'ENTERPRISE' ? 'ENTERPRISE' : 'STARTER';

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

      if (!subscriptionMpId) {
        this.logger.warn('⚠️ Webhook sin data.id, ignorando.');
        return { status: 'ignored' };
      }

      try {
        // Consultar estado actual en MercadoPago
        const preapproval = new PreApproval(this.client);
        const mpSubscription = await preapproval.get({ id: subscriptionMpId });

        // Mapear estado de MercadoPago a nuestro enum
        let status: 'ACTIVE' | 'PENDING' | 'CANCELLED' = 'PENDING';
        if (mpSubscription.status === 'authorized') status = 'ACTIVE';
        else if (mpSubscription.status === 'cancelled' || mpSubscription.status === 'paused') status = 'CANCELLED';

        // Actualizar en BD
        const updated = await this.prisma.subscription.updateMany({
          where: { mpPreapprovalId: subscriptionMpId.toString() },
          data: {
            status,
            currentPeriodStart: mpSubscription.date_created ? new Date(mpSubscription.date_created) : undefined,
          },
        });

        this.logger.log(`✅ Suscripción ${subscriptionMpId} actualizada a estado: ${status} (${updated.count} registros)`);

        return { status: 'processed', mpId: subscriptionMpId, newStatus: status };
      } catch (err) {
        this.logger.error(`Error procesando webhook para suscripción ${subscriptionMpId}:`, err);
        return { status: 'error', error: (err as Error).message };
      }
    }

    return { status: 'ok', type: body.type };
  }
}
