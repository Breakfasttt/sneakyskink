import { prisma } from '../database/client.js';
import { queueLeagueFetch, harvesterQueue } from './queue.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';
import { ActivityTracker } from '../utils/activity-tracker.js';
import { bb3ApiClient } from '../services/bb3-api-client.js';

/**
 * Déclenche une synchronisation immédiate de toutes les ligues actives de la BDD
 */
export async function triggerPeriodicSync() {
  logger.info('🔄 [Scheduler] Démarrage de la synchronisation périodique des ligues actives...');
  // Marquer l'activité pour éviter que le détecteur d'inactivité ne s'active immédiatement
  ActivityTracker.touch();

  // A. Étape de découverte automatique des ligues actives via l'API Cyanide /leagues avec gamers_count=15
  logger.info('🔍 [Scheduler] Découverte automatique des ligues actives sur Cyanide (gamers_count=15)...');
  try {
    const leaguesResponse = await bb3ApiClient.get('/leagues', { gamers_count: 15 });
    const discoveredLeagues = leaguesResponse.leagues || [];
    logger.info(`🔍 [Scheduler] ${discoveredLeagues.length} ligues découvertes sur l'API Cyanide.`);

    for (const rawLeague of discoveredLeagues) {
      const id = rawLeague.id;
      if (!id) continue;
      const name = rawLeague.name !== undefined && rawLeague.name !== null ? rawLeague.name.toString() : 'Ligue sans nom';
      const logo = rawLeague.logo || null;
      const gamerCount = rawLeague.gamer_count ?? rawLeague.team_count ?? 0;

      // Déterminer si elle est officielle ou non
      const isOfficial = name.toLowerCase().includes('official league');

      // Si la ligue existe déjà, on ne veut pas écraser active ou isPriority si l'utilisateur les a configurés
      const existingLeague = await prisma.league.findUnique({
        where: { id },
        select: { active: true, isPriority: true }
      });

      const isPriority = existingLeague ? existingLeague.isPriority : isOfficial;
      const shouldBeActive = existingLeague ? existingLeague.active : true;

      await prisma.league.upsert({
        where: { id },
        create: {
          id,
          name,
          logo,
          gamerCount,
          active: shouldBeActive,
          isPriority,
        },
        update: {
          name,
          logo,
          gamerCount,
        }
      });
    }
  } catch (err: any) {
    logger.error(`❌ [Scheduler] Erreur lors de la découverte automatique des ligues : ${err.message}`);
  }

  // B. Planifier la mise à jour des ligues actives enregistrées
  try {
    // Récupérer toutes les ligues marquées comme actives
    const activeLeagues = await prisma.league.findMany({
      where: { active: true },
      select: { id: true, name: true, isPriority: true },
    });

    logger.info(`📊 [Scheduler] ${activeLeagues.length} ligues actives trouvées en base de données.`);

    for (const league of activeLeagues) {
      logger.info(`➕ [Scheduler] Planification de la mise à jour pour la ligue "${league.name}" (${league.id})`);
      
      const isOfficial = league.name.toLowerCase().includes('official league');
      const priority = (isOfficial || league.isPriority) ? 'high' : 'medium';
      
      // Enfiler le job de mise à jour avec la priorité appropriée
      await queueLeagueFetch(league.id, priority);
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
