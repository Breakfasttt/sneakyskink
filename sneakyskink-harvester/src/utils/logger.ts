import pino from 'pino';
import { env } from '../config/environment.js';

const isDev = env.nodeEnv === 'development';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

logger.info(`ℹ️ [Logger] Initialisé avec succès (niveau : ${logger.level}).`);
export default logger;
