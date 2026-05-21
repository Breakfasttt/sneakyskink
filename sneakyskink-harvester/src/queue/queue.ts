/**
 * Gestion de la file d'attente BullMQ et priorisation des tâches pour l'aspirateur.
 */

import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import { logger } from '../utils/logger.js';

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
export async function queueLeagueFetch(leagueId: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement de la ligue ${leagueId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-league-${leagueId}`,
    { type: 'fetch-league', id: leagueId, priority },
    { priority: calculateJobPriority('fetch-league', priority) }
  );
}

/**
 * Envoie un job d'aspiration de compétition dans la file d'attente
 */
export async function queueCompetitionFetch(competitionId: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement de la compétition ${competitionId} (priorité : ${priority})`);
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
  logger.info(`📥 [Queue] Enfilement du coach ${coachId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-coach-${coachId}`,
    { type: 'fetch-coach', id: coachId, priority },
    { priority: calculateJobPriority('fetch-coach', priority) }
  );
}

/**
 * Envoie un job d'aspiration d'équipe dans la file d'attente
 */
export async function queueTeamFetch(teamId: string, leagueId: string, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement de l'équipe ${teamId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-team-${teamId}`,
    { type: 'fetch-team', id: teamId, leagueId, priority },
    { priority: calculateJobPriority('fetch-team', priority) }
  );
}

/**
 * Envoie un job d'aspiration de match dans la file d'attente
 */
export async function queueMatchFetch(matchId: string, competitionId: string, contest: any, priority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Queue] Enfilement du match ${matchId} (priorité : ${priority})`);
  await harvesterQueue.add(
    `fetch-match-${matchId}`,
    { type: 'fetch-match', id: matchId, competitionId, contest, priority },
    { priority: calculateJobPriority('fetch-match', priority) }
  );
}

