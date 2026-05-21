import { bb3ApiClient } from '../src/services/bb3-api-client.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('🏁 Démarrage du test pour l\'endpoint welcome...');

  try {
    const welcomeData = await bb3ApiClient.get('welcome');
    logger.info(`✅ Succès de l'appel welcome ! Réponse reçue :`);
    console.log(JSON.stringify(welcomeData, null, 2));
  } catch (error: any) {
    logger.error(`❌ Échec de l'appel welcome : ${error.message}`);
  }
}

main();
