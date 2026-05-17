import { prisma } from '../database/client.js';
import { queueLeagueFetch } from './queue.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

/**
 * Déclenche une synchronisation immédiate de toutes les ligues actives de la BDD
 */
export async function triggerPeriodicSync() {
  logger.info('🔄 [Scheduler] Démarrage de la synchronisation périodique des ligues actives...');

  try {
    // Récupérer toutes les ligues marquées comme actives
    const activeLeagues = await prisma.league.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    logger.info(`📊 [Scheduler] ${activeLeagues.length} ligues actives trouvées en base de données.`);

    for (const league of activeLeagues) {
      logger.info(`➕ [Scheduler] Planification de la mise à jour pour la ligue "${league.name}" (${league.id})`);
      // Enfiler le job de mise à jour avec une priorité moyenne (cycle régulier configurable)
      await queueLeagueFetch(league.id, 'medium');
    }

    logger.info('✅ [Scheduler] Tous les jobs de synchronisation ont été planifiés.');
  } catch (err: any) {
    logger.error(`❌ [Scheduler] Erreur lors de la planification périodique : ${err.message}`);
  }
}

/**
 * Initialise le planificateur récurrent.
 */
export function initScheduler() {
  logger.info(`⏰ [Scheduler] Planificateur récurrent initialisé (Synchro toutes les ${env.syncIntervalMinutes} minutes).`);

  // Configurer un setInterval en mémoire basé sur l'intervalle configuré dans le .env
  const syncIntervalMs = env.syncIntervalMinutes * 60 * 1000;
  
  setInterval(async () => {
    logger.info(`⏰ [Scheduler] Déclenchement automatique du cycle de ${env.syncIntervalMinutes} minutes...`);
    await triggerPeriodicSync();
  }, syncIntervalMs);

  // Déclencher immédiatement une première synchronisation des ligues actives lors du démarrage du daemon
  // pour s'assurer que notre base locale est à jour !
  setTimeout(async () => {
    logger.info('⏰ [Scheduler] Synchro initiale de démarrage...');
    await triggerPeriodicSync();
  }, 5000);
}
