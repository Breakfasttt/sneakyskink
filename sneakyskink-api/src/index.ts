import app from './app.js';
import { env } from './config/environment.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function startServer() {
  try {
    logger.info('⏳ [API] Initialisation de la connexion à la base de données PostgreSQL...');
    await prisma.$connect();
    logger.info('🔌 [Database] Connexion réussie à PostgreSQL via Prisma.');

    const port = env.port;
    app.listen(port, () => {
      logger.info(`🚀 [API] Le serveur REST est démarré avec succès.`);
      logger.info(`📡 [API] URL d'accès : http://localhost:${port}`);
      logger.info(`🦎 [API] Mode : ${env.nodeEnv}`);
    });
  } catch (error) {
    logger.error(error as Error, '❌ [API] Erreur fatale lors du démarrage du serveur REST :');
    process.exit(1);
  }
}

startServer();
