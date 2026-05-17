import { handleFetchCompetition } from '../src/queue/worker.js';
import { prisma } from '../src/database/client.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('🏁 Démarrage de la synchronisation synchrone directe de la compétition...');
  
  try {
    // 1. Assurer la connexion aux services
    await prisma.$connect();

    // 2. Exécuter la synchronisation en direct
    const compId = '51000000-0000-0000-0000-000000000032'; // OPEN_LADDER
    logger.info(`⚡ Lancement de handleFetchCompetition pour l'ID: ${compId}`);
    await handleFetchCompetition(compId);

    logger.info('🎉 Fin de la synchronisation directe !');
  } catch (err: any) {
    logger.error(`❌ Échec de la synchronisation directe : ${err.message}`);
    console.error(err);
  } finally {
    // 3. Déconnexion propre
    await prisma.$disconnect();
    logger.info('🔌 Connexions fermées.');
    process.exit(0);
  }
}

main();
