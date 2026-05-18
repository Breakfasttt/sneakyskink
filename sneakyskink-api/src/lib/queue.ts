import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/environment.js';
import { logger } from './logger.js';

export const QUEUE_NAME = 'harvester-queue';

export type JobType = 'fetch-league' | 'fetch-competition' | 'fetch-coach' | 'search-leagues';

export interface JobData {
  type: JobType;
  id: string;
}

// Configuration de la connexion Redis partagée
export const redisConnection = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null, // Obligatoire pour BullMQ
});

redisConnection.on('error', (err) => {
  logger.error(err, '❌ [Redis] Erreur de connexion dans l\'API :');
});

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
export async function queueLeagueFetch(leagueId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue API] Enfilement de la ligue ${leagueId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-league-${leagueId}`,
    { type: 'fetch-league', id: leagueId },
    { priority: PRIORITY_MAP[priority] }
  );
}

/**
 * Envoie un job d'aspiration de compétition dans la file d'attente
 */
export async function queueCompetitionFetch(competitionId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue API] Enfilement de la compétition ${competitionId} (priorité : ${priority})`);
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
  logger.info(`📥 [Queue API] Enfilement du coach ${coachId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-coach-${coachId}`,
    { type: 'fetch-coach', id: coachId },
    { priority: PRIORITY_MAP[priority] }
  );
}
