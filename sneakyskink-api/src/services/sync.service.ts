import { queueCoachFetch, queueLeagueFetch, queueCompetitionFetch, harvesterQueue, redisConnection, interactiveQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class SyncService {
  static async syncCoach(coachId: string) {
    logger.info(`⚡ [Sync Service] Demande de synchronisation à la demande pour le coach : ${coachId}`);
    await queueCoachFetch(coachId, 'high');
    return {
      success: true,
      message: `La demande de synchronisation pour le coach ${coachId} a été ajoutée à la file d'attente (priorité Haute).`,
      enqueuedAt: new Date(),
    };
  }

  static async syncLeague(leagueId: string) {
    logger.info(`⚡ [Sync Service] Demande de synchronisation à la demande pour la ligue : ${leagueId}`);
    
    try {
      const job = await interactiveQueue.add(
        `fetch-league-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        { type: 'fetch-league', id: leagueId }
      );

      // Attendre la complétion du job par le harvester
      let attempts = 0;
      const maxAttempts = 300; // 30 secondes max
      
      while (attempts < maxAttempts) {
        const state = await job.getState();
        if (state === 'completed') {
          return {
            success: true,
            message: `La ligue ${leagueId} a été synchronisée/importée avec succès.`,
            jobId: job.id,
            enqueuedAt: new Date(),
          };
        }
        if (state === 'failed') {
          const finishedJob = await interactiveQueue.getJob(job.id!);
          throw new Error(finishedJob?.failedReason || "La synchronisation/importation de la ligue a échoué.");
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      throw new Error("La synchronisation/importation de la ligue a expiré.");
    } catch (error: any) {
      throw new ApiError(500, `Erreur lors de la synchronisation déléguée au Harvester : ${error.message}`);
    }
  }

  static async syncCompetition(competitionId: string) {
    logger.info(`⚡ [Sync Service] Demande de synchronisation à la demande pour la compétition : ${competitionId}`);
    await queueCompetitionFetch(competitionId, 'high');
    return {
      success: true,
      message: `La demande de synchronisation pour la compétition ${competitionId} a été ajoutée à la file d'attente (priorité Haute).`,
      enqueuedAt: new Date(),
    };
  }

  static async getQueueStatus() {
    const counts = await harvesterQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed', 'prioritized');
    
    // Check if harvester worker is active
    let harvesterRunning = false;
    try {
      const workers = await harvesterQueue.getWorkers();
      harvesterRunning = workers.length > 0;
    } catch (err) {
      harvesterRunning = false;
    }

    // Check if Cyanide API status in Redis
    let cyanideStatus: 'OK' | 'QUOTA_EXCEEDED' | 'DOWN' = 'OK';
    let cyanideOnline = false;
    try {
      const apiAvailableVal = await redisConnection.get('sneakyskink:cyanide_api:available');
      if (apiAvailableVal === 'DOWN') {
        cyanideStatus = 'DOWN';
      } else if (apiAvailableVal === 'QUOTA_EXCEEDED') {
        cyanideStatus = 'QUOTA_EXCEEDED';
      } else if (apiAvailableVal === 'false') {
        cyanideStatus = 'DOWN'; // Rétrocompatibilité
      } else {
        // Pour s'assurer de sa disponibilité réelle (si c'est marqué OK ou null/undefined), on ping le status
        try {
          await axios.get('https://web.cyanide-studio.com/ws/cya/status/', { timeout: 4000 });
          cyanideStatus = 'OK';
        } catch (err: any) {
          if (err.response) {
            if (err.response.status === 429) {
              cyanideStatus = 'QUOTA_EXCEEDED';
            } else {
              cyanideStatus = 'OK'; // Réponse reçue
            }
          } else {
            cyanideStatus = 'DOWN'; // Pas de réponse du tout
          }
        }
      }
      cyanideOnline = (cyanideStatus === 'OK' || cyanideStatus === 'QUOTA_EXCEEDED');
    } catch (err: any) {
      cyanideStatus = 'DOWN';
      cyanideOnline = false;
    }

    // Fetch active and waiting/prioritized jobs for monitoring
    let activeJobs: any[] = [];
    let waitingJobs: any[] = [];
    try {
      const active = await harvesterQueue.getActive();
      const waiting = await harvesterQueue.getJobs(['waiting', 'prioritized'], 0, 9); // Les 10 premiers

      const mapJob = (job: any) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        priority: job.opts?.priority || 0,
      });

      activeJobs = active.map(mapJob);
      waitingJobs = waiting.map(mapJob);
    } catch (err) {
      logger.error(`Erreur lors de la récupération des détails des jobs de la file d'attente: ${err}`);
    }

    // Récupérer le statut du bypass de rate pacing
    const bypass = await redisConnection.get('sneakyskink:bypass_pacing');
    const pacingBypassed = !!bypass;
    let pacingBypassRemainingSeconds = 0;
    if (pacingBypassed) {
      try {
        pacingBypassRemainingSeconds = await redisConnection.ttl('sneakyskink:bypass_pacing');
      } catch (err) {
        // ignore
      }
    }

    // Récupérer le prochain test de santé périodique de l'API Cyanide
    let cyanideNextCheck: number | undefined = undefined;
    try {
      const nextCheckVal = await redisConnection.get('sneakyskink:cyanide_api:next_check');
      if (nextCheckVal) {
        cyanideNextCheck = parseInt(nextCheckVal, 10);
      }
    } catch (err) {
      // ignore
    }

    return {
      success: true,
      counts: {
        waiting: (counts.waiting || 0) + (counts.prioritized || 0),
        active: counts.active,
        delayed: counts.delayed,
        failed: counts.failed,
        completed: counts.completed,
      },
      hasPendingCalls: ((counts.waiting || 0) + (counts.prioritized || 0)) > 0 || counts.active > 0,
      harvesterRunning,
      cyanideOnline,
      cyanideStatus,
      cyanideNextCheck,
      activeJobs,
      waitingJobs,
      pacingBypassed,
      pacingBypassRemainingSeconds,
    };
  }

  static async cleanQueue() {
    // Supprime tous les jobs complétés et échoués (grace period = 0, no limit)
    const completed = await harvesterQueue.clean(0, 0, 'completed');
    const failed = await harvesterQueue.clean(0, 0, 'failed');
    logger.info(`🧹 [Sync Service] Nettoyage de la file d'attente : ${completed.length} complétés, ${failed.length} échoués supprimés.`);
    return {
      success: true,
      cleanedCompleted: completed.length,
      cleanedFailed: failed.length,
    };
  }

  /**
   * Désactive temporairement le rate pacing pendant 1 heure (3600 secondes)
   */
  static async bypassPacing() {
    logger.info('⚡ [Sync Service] Demande de bypass temporaire du rate pacing (1 heure)');
    await redisConnection.set('sneakyskink:bypass_pacing', 'true', 'EX', 3600);
    return {
      success: true,
      message: 'Le rate pacing a été désactivé temporairement pour 1 heure (3600 secondes).',
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    };
  }

  /**
   * Réactive immédiatement le rate pacing normal
   */
  static async restorePacing() {
    logger.info('⚡ [Sync Service] Demande de restauration du rate pacing normal');
    await redisConnection.del('sneakyskink:bypass_pacing');
    return {
      success: true,
      message: 'Le rate pacing normal a été réactivé avec succès.',
    };
  }

  /**
   * Modifie la priorité d'une ligue dans la base de données locale.
   */
  static async setLeaguePriority(leagueId: string, isPriority: boolean) {
    logger.info(`⚡ [Sync Service] Modification de la priorité de la ligue ${leagueId} : ${isPriority}`);
    
    const league = await prisma.league.findUnique({
      where: { id: leagueId }
    });
    
    if (!league) {
      throw new ApiError(404, `Ligue introuvable avec l'identifiant ${leagueId}`);
    }

    const updatedLeague = await prisma.league.update({
      where: { id: leagueId },
      data: { isPriority }
    });

    return {
      success: true,
      message: `La priorité de la ligue ${leagueId} a été mise à jour avec succès à ${isPriority}.`,
      league: updatedLeague
    };
  }
}
