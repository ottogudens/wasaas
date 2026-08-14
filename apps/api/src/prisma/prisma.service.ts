import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

const TENANT_MODELS = [
  'User',
  'BotInstance',
  'KnowledgeDocument',
  'SemanticMemoryCache',
  'Invoice',
  'Subscription',
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly cls: ClsService) {
    super();
  }

  async onModuleInit() {
    // Middleware Multi-tenant (Aislamiento de datos)
    this.$use(async (params, next) => {
      const tenantId = this.cls.get('tenantId');

      if (tenantId) {
        let tenantFilter: any = null;

        if (TENANT_MODELS.includes(params.model as string)) {
          tenantFilter = { organizationId: tenantId };
        } else if (params.model === 'Conversation') {
          tenantFilter = { bot: { organizationId: tenantId } };
        } else if (params.model === 'Message') {
          tenantFilter = { conversation: { bot: { organizationId: tenantId } } };
        } else if (params.model === 'DocumentVectorChunk') {
          tenantFilter = { document: { organizationId: tenantId } };
        }

        if (tenantFilter) {
          if (params.action === 'findUnique' || params.action === 'findFirst') {
            params.action = 'findFirst';
            params.args.where = { ...params.args.where, ...tenantFilter };
          }
          if (
            params.action === 'findMany' ||
            params.action === 'updateMany' ||
            params.action === 'deleteMany' ||
            params.action === 'count'
          ) {
            if (!params.args) params.args = {};
            params.args.where = { ...params.args.where, ...tenantFilter };
          }
          if (params.action === 'update' || params.action === 'delete') {
            const modelName = params.model.charAt(0).toLowerCase() + params.model.slice(1);
            const existing = await (this as any)[modelName].findFirst({
              where: { ...params.args.where, ...tenantFilter }
            });
            
            if (!existing) {
               throw new Error(`[Multi-Tenant] Acceso denegado o registro no encontrado en el modelo ${params.model}`);
            }
            return next(params);
          }
        }
      }
      return next(params);
    });

    this.$connect()
      .then(() => this.logger.log('✅ Conexión a PostgreSQL establecida via Prisma.'))
      .catch((err) => this.logger.warn(`⚠️ Prisma se conectará en la primera consulta: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔌 Conexión a PostgreSQL cerrada.');
  }
}
