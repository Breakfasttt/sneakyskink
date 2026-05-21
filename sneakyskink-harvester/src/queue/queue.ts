import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import { logger } from '../utils/logger.js';

export const QUEUE_NAME = 'harvester-queue';

export type JobType = 'fetch-league' | 'fetch-competition' | 'fetch-coach' | 'search-leagues' | 'maintenance-task';

export interface JobData {
  type: JobType;
  id: string;
}

// Définir la file d'attente globale
export const harvesterQueue = new Queue<JobData>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: { count: 1000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

/**
 * Associe les priorités sémantiques aux valeurs de priorité natives de BullMQ.
 * Chez BullMQ, plus la valeur numérique est basse, plus le job est prioritaire (1 = ultra prioritaire).
 */
const PRIORITY_MAP = {
  high: 1,     // Pour les requêtes à la demande (missing coaches, leagues, competitions)
  medium: 5,   // Pour les synchronisations planifiées toutes les 2h
  low: 10,     // Pour l'aspiration historique / bulk import
};

/**
 * Envoie un job d'aspiration de ligue dans la file d'attente
 */
export async function queueLeagueFetch(leagueId: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement de la ligue ${leagueId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-league-${leagueId}`,
    { type: 'fetch-league', id: leagueId },
    { priority: PRIORITY_MAP[priority] }
  );
}

/**
 * Envoie un job d'aspiration de compétition dans la file d'attente
 */
export async function queueCompetitionFetch(competitionId: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement de la compétition ${competitionId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-competition-${competitionId}`,
    { type: 'fetch-competition', id: competitionId },
    { priority: PRIORITY_MAP[priority] }
  );
}

/**
 * Envoie un job d'aspiration de coach dans la file d'attente
 */
export async function queueCoachFetch(coachId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue] Enfilement du coach ${coachId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-coach-${coachId}`,
    { type: 'fetch-coach', id: coachId },
    { priority: PRIORITY_MAP[priority] }
  );
}
