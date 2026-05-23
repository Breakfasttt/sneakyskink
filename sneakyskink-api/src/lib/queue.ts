/**
 * Alignement de la file d'attente BullMQ et des priorités avec le Harvester.
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/environment.js';
import { logger } from './logger.js';

export const QUEUE_NAME = 'harvester-queue';

export type JobType = 
  | 'fetch-league' 
  | 'fetch-competition' 
  | 'fetch-coach' 
  | 'fetch-team'
  | 'fetch-match'
  | 'search-leagues' 
  | 'maintenance-task';

export interface JobData {
  type: JobType;
  id: string;
  leagueId?: string;
  competitionId?: string;
  contest?: any;
  priority?: 'high' | 'medium' | 'low';
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

export const INTERACTIVE_QUEUE_NAME = 'interactive-queue';

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

// Définir la file d'attente interactive et prioritaire
// removeOnComplete: false pour que l'API puisse relire le returnvalue après complétion
export const interactiveQueue = new Queue<JobData>(INTERACTIVE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
    attempts: 2,
  },
});

/**
 * Calcule la priorité numérique native de BullMQ.
 * Chez BullMQ, plus la valeur numérique est basse, plus le job est prioritaire (1 = ultra prioritaire).
 */
export function calculateJobPriority(type: JobType, triggerPriority: 'high' | 'medium' | 'low' = 'medium'): number {
  let base = 60; // Par défaut pour les autres tâches
  switch (type) {
    case 'maintenance-task':
      base = 5;
      break;
    case 'fetch-coach':
      base = 10;
      break;
    case 'fetch-league':
      base = 20;
      break;
    case 'fetch-competition':
      base = 30;
      break;
    case 'fetch-match':
      base = 40;
      break;
    case 'fetch-team':
      base = 50;
      break;
  }
  const offset = triggerPriority === 'high' ? -2 : triggerPriority === 'low' ? 2 : 0;
  return base + offset;
}

/**
 * Envoie un job d'aspiration de ligue dans la file d'attente
 */
export async function queueLeagueFetch(leagueId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue API] Enfilement de la ligue ${leagueId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-league-${leagueId}`,
    { type: 'fetch-league', id: leagueId, priority },
    { priority: calculateJobPriority('fetch-league', priority) }
  );
}

/**
 * Envoie un job d'aspiration de compétition dans la file d'attente
 */
export async function queueCompetitionFetch(competitionId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue API] Enfilement de la compétition ${competitionId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-competition-${competitionId}`,
    { type: 'fetch-competition', id: competitionId, priority },
    { priority: calculateJobPriority('fetch-competition', priority) }
  );
}

/**
 * Envoie un job d'aspiration de coach dans la file d'attente
 */
export async function queueCoachFetch(coachId: string, priority: 'high' | 'medium' | 'low' = 'high') {
  logger.info(`📥 [Queue API] Enfilement du coach ${coachId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-coach-${coachId}`,
    { type: 'fetch-coach', id: coachId, priority },
    { priority: calculateJobPriority('fetch-coach', priority) }
  );
}

/**
 * Envoie un job de maintenance dans la file d'attente.
 */
export async function queueMaintenanceRun(trigger: 'AUTOMATIC' | 'MANUAL' = 'MANUAL') {
  logger.info(`📥 [Queue API] Enfilement d'un job de maintenance (déclencheur : ${trigger})`);
  const job = await harvesterQueue.add(
    `maintenance-${Date.now()}`,
    { type: 'maintenance-task', id: 'manual-trigger', trigger } as any,
    { priority: calculateJobPriority('maintenance-task', 'high') }
  );
  return job.id;
}
