import pino from 'pino';

export const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

export const logger = {
  info: (...args: any[]) => pinoLogger.info({ args }, args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')),
  error: (...args: any[]) => pinoLogger.error({ args }, args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')),
  warn: (...args: any[]) => pinoLogger.warn({ args }, args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')),
  child: (bindings: any) => pinoLogger.child(bindings),
};

export const getTenantLogger = (tenantId: string) => {
  return logger.child({ tenantId });
};
