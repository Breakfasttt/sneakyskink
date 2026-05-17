import { queueCoachFetch, queueLeagueFetch, harvesterQueue } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

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
    };
  }
}
