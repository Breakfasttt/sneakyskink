import { queueCoachFetch, queueLeagueFetch, harvesterQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import axios from 'axios';

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

  static async getQueueStatus() {
    const counts = await harvesterQueue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
    
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

    // Fetch active and waiting jobs for monitoring
    let activeJobs: any[] = [];
    let waitingJobs: any[] = [];
    try {
      const active = await harvesterQueue.getActive();
      const waiting = await harvesterQueue.getWaiting(0, 9); // Les 10 premiers

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

    return {
      success: true,
      counts: {
        waiting: counts.waiting,
        active: counts.active,
        delayed: counts.delayed,
        failed: counts.failed,
        completed: counts.completed,
      },
      hasPendingCalls: counts.waiting > 0 || counts.active > 0,
      harvesterRunning,
      cyanideOnline,
      activeJobs,
      waitingJobs,
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
}
