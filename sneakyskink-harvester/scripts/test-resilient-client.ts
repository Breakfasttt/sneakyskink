import { bb3ApiClient } from '../src/services/bb3-api-client.js';
import { apiKeyManager } from '../src/services/api-key-manager.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('🏁 Démarrage du test de résilience et de rotation client...');

  try {
    // 1. Afficher l'état initial des clés
    logger.info('📊 État initial des clés API :');
    console.table(apiKeyManager.getStatusList());

    // 2. Tester l'endpoint 'status' (méthode de healthcheck)
    logger.info('🔍 Appel de l\'endpoint status...');
    const statusData = await bb3ApiClient.get('status');
    logger.info(`✅ Succès de l'appel status ! Serveurs en vie. Réponse brute: ${JSON.stringify(statusData)}`);

    // 3. Tester l'endpoint 'rules' pour récupérer les compétences
    logger.info('📚 Appel de l\'endpoint rules (ruleset: skills)...');
    const rulesData = await bb3ApiClient.get('rules', { rule: 'skills' });
    
    if (rulesData && rulesData.skills) {
      const skillsCount = Object.keys(rulesData.skills).length;
      logger.info(`✅ Succès de l'appel rules ! Nombre de compétences trouvées : ${skillsCount}`);
    } else {
      logger.warn('⚠️ Succès de l\'appel rules mais structure de compétences inattendue.');
    }

    // 4. Afficher l'état des clés après succès
    logger.info('📊 État final des clés API :');
    console.table(apiKeyManager.getStatusList());

  } catch (error: any) {
    logger.error(`❌ Échec critique du test de validation : ${error.message}`);
  }
}

main();
