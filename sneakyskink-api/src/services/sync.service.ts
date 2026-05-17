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
    };
  }
}
