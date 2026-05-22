import { queueCoachFetch, queueLeagueFetch, queueCompetitionFetch, harvesterQueue, redisConnection } from '../lib/queue.js';
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
    await queueLeagueFetch(leagueId, 'high');
    return {
      success: true,
      message: `La demande de synchronisation pour la ligue ${leagueId} a été ajoutée à la file d'attente (priorité Haute).`,
      enqueuedAt: new Date(),
    };
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

    // Check if Cyanide API is reachable
    let cyanideOnline = false;
    try {
      await axios.get('https://web.cyanide-studio.com/ws/cya/status/', { timeout: 4000 });
      cyanideOnline = true;
    } catch (err: any) {
      if (err.response) {
        cyanideOnline = true; // Got a response (even 400/403), so the server is reachable!
      } else {
        cyanideOnline = false; // Connection timeout or network error
      }
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
