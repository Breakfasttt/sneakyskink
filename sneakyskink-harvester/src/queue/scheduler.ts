import { prisma } from '../database/client.js';
import { queueLeagueFetch, harvesterQueue } from './queue.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';
import { ActivityTracker } from '../utils/activity-tracker.js';

/**
 * Déclenche une synchronisation immédiate de toutes les ligues actives de la BDD
 */
export async function triggerPeriodicSync() {
  logger.info('🔄 [Scheduler] Démarrage de la synchronisation périodique des ligues actives...');
  // Marquer l'activité pour éviter que le détecteur d'inactivité ne s'active immédiatement
  ActivityTracker.touch();

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
 * Planifie la tâche de maintenance récurrente (tous les 2 jours à 2h00 du matin) via BullMQ repeat.
 */
export async function scheduleMaintenanceTask() {
  logger.info('⏰ [Scheduler] Planification de la tâche de maintenance récurrente...');
  try {
    // Nettoyer les anciens repeatable jobs pour éviter les doublons au redémarrage
    const repeatableJobs = await harvesterQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'maintenance-task-cron') {
        await harvesterQueue.removeRepeatableByKey(job.key);
      }
    }

    // Planifier la tâche récurrente
    await harvesterQueue.add(
      'maintenance-task-cron',
      { type: 'maintenance-task', id: 'periodic', trigger: 'AUTOMATIC' } as any,
      {
        repeat: {
          pattern: '0 2 */2 * *', // Tous les 2 jours à 2h00 du matin
        }
      }
    );
    logger.info('✅ [Scheduler] Tâche de maintenance planifiée avec succès (Tous les 2 jours à 2h00).');
  } catch (err: any) {
    logger.error(`❌ [Scheduler] Échec de la planification de la maintenance récurrente : ${err.message}`);
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

  // Détecteur d'inactivité (Idle Check) : relance la synchro si aucune activité et file vide depuis 5 minutes
  setInterval(async () => {
    const lastActivity = ActivityTracker.getLastActivityTime();
    const idleTime = Date.now() - lastActivity;
    const idleLimitMs = 5 * 60 * 1000; // 5 minutes

    if (idleTime > idleLimitMs) {
      try {
        const waitingCount = await harvesterQueue.getWaitingCount();
        const activeCount = await harvesterQueue.getActiveCount();

        if (waitingCount === 0 && activeCount === 0) {
          logger.info('🛌 [Scheduler] Aucune activité et file vide depuis plus de 5 minutes. Relance automatique de la synchronisation...');
          await triggerPeriodicSync();
        }
      } catch (err: any) {
        logger.error(`⚠️ [Scheduler] Échec de la vérification d'inactivité : ${err.message}`);
      }
    }
  }, 60000); // Vérification toutes les minutes

  // Déclencher immédiatement une première synchronisation des ligues actives lors du démarrage du daemon
  // pour s'assurer que notre base locale est à jour !
  setTimeout(async () => {
    logger.info('⏰ [Scheduler] Synchro initiale de démarrage...');
    await triggerPeriodicSync();
    await scheduleMaintenanceTask();
  }, 5000);
}
