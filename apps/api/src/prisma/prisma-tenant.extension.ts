import { Prisma } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';

// Modelos que tienen la columna organizationId directamente
const tenantModels = [
  'User',
  'BotInstance',
  'Subscription',
  'KnowledgeDocument',
  'SemanticMemoryCache',
  'Invoice',
];

// Operaciones donde se debe inyectar el filtro de tenant
const tenantOperations = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
];

export const tenantExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const cls = ClsServiceManager.getClsService();
          // Solo si estamos en el contexto de una petición (ej. middleware de API)
          if (cls && cls.isActive()) {
            const tenantId = cls.get('tenantId');
            
            if (tenantId && tenantModels.includes(model) && tenantOperations.includes(operation)) {
              // Interceptar los args para inyectar organizationId en el 'where'
              const anyArgs = args as any;
              anyArgs.where = {
                ...(anyArgs.where || {}),
                organizationId: tenantId,
              };
            }
          }
          
          return query(args);
        },
      },
    },
  });
});
