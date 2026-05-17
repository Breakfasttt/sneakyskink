import { triggerPeriodicSync } from '../src/queue/index.js';
import { prisma } from '../src/database/client.js';
import { redisConnection } from '../src/queue/index.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('🏁 Démarrage du script de synchronisation immédiate...');
  
  try {
    // 1. Assurer la connexion aux services
    await prisma.$connect();
    await redisConnection.ping();

    // 2. Déclencher la planification immédiate
    await triggerPeriodicSync();

    logger.info('🎉 Tous les jobs ont été envoyés avec succès dans la file d\'attente Redis !');
  } catch (err: any) {
    logger.error(`❌ Échec de la synchronisation immédiate : ${err.message}`);
  } finally {
    // 3. Déconnexion propre
    await prisma.$disconnect();
    await redisConnection.quit();
    logger.info('🔌 Connexions fermées. Fin du script.');
    process.exit(0);
  }
}

main();
