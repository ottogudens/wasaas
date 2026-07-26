import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;

  constructor() {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || 'MP_TEST_ACCESS_TOKEN';
    this.client = new MercadoPagoConfig({ accessToken });
  }

  /**
   * Crear un link de suscripción mensual recurrente
   */
  async createSubscriptionLink(
    organizationId: string,
    userEmail: string,
    planName: string,
    amount: number,
  ) {
    try {
      const preapproval = new PreApproval(this.client);
      
      const response = await preapproval.create({
        body: {
          reason: `Suscripción SaaS WhatsApp Bot - Plan ${planName}`,
          external_reference: organizationId,
          payer_email: userEmail,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'CLP', // O USD / ARS / MXN según corresponda
          },
          back_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/billing?status=success`,
          status: 'authorized',
        },
      });

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
   * Procesar Webhook enviado por MercadoPago al recibir pagos o actualizar estado
   */
  async handleWebhook(body: any) {
    this.logger.log(`Webhook MercadoPago recibido: ${body.type}`);
    if (body.type === 'subscription_preapproval') {
      const subscriptionId = body.data.id;
      // Aquí actualizamos la suscripción en PostgreSQL vía Prisma
      this.logger.log(`Actualizando estado de suscripción: ${subscriptionId}`);
    }
    return { status: 'ok' };
  }
}
