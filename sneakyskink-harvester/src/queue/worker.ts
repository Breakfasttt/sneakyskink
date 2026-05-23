/**
 * Worker BullMQ pour traiter les tâches d'aspiration de données du Harvester.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { 
  harvesterQueue, 
  QUEUE_NAME, 
  INTERACTIVE_QUEUE_NAME,
  JobData, 
  queueCoachFetch, 
  queueCompetitionFetch,
  queueTeamFetch,
  queueMatchFetch
} from './queue.js';
import { prisma } from '../database/client.js';
import { bb3ApiClient } from '../services/bb3-api-client.js';
import { LeagueParser } from '../parsers/bb3/league.parser.js';
import { TeamParser } from '../parsers/bb3/team.parser.js';
import { MatchParser } from '../parsers/bb3/match.parser.js';
import { logger } from '../utils/logger.js';
import { MaintenanceService } from '../services/maintenance.service.js';
import { ConsoleDashboard } from '../utils/dashboard.js';
import { cyanideHealthService } from '../services/cyanide-health.service.js';

export const harvesterWorker = new Worker<JobData>(
  QUEUE_NAME,
  async (job: Job<JobData>) => {
    const { type, id, priority } = job.data;
    const triggerPriority = priority || 'medium';
    logger.info(`🚀 [Worker] Traitement du job [${job.id}] : ${type} pour l'ID ${id} (priorité déclencheur: ${triggerPriority})`);

    try {
      switch (type) {
        case 'fetch-coach':
          await handleFetchCoach(id);
          break;

        case 'fetch-league':
          await handleFetchLeague(id, triggerPriority);
          break;

        case 'fetch-competition':
          await handleFetchCompetition(id, triggerPriority);
          break;

        case 'fetch-team':
          await handleFetchTeam(id, job.data.leagueId!, triggerPriority);
          break;

        case 'fetch-match':
          await handleFetchMatch(id, job.data.competitionId!, job.data.contest, triggerPriority);
          break;

        case 'maintenance-task':
          bb3ApiClient.setMaintenanceMode(true);
          try {
            await MaintenanceService.runMaintenance((job.data as any).trigger || 'AUTOMATIC');
          } finally {
            bb3ApiClient.setMaintenanceMode(false);
          }
          break;

        default:
          throw new Error(`Type de job non supporté : ${type}`);
      }
      logger.info(`✅ [Worker] Job [${job.id}] traité avec succès !`);
    } catch (err: any) {
      logger.error(`❌ [Worker] Erreur lors du job [${job.id}] : ${err.message}`);
      throw err; // Relancer pour que BullMQ gère les retries/fails
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Exécuter séquentiellement ; BullMQ gère l'ordre par priorité native
    autorun: false, // Ne pas démarrer le worker automatiquement à l'import
  }
);

/**
 * 1. Traitement de la récupération d'un Coach
 */
export async function handleFetchCoach(coachId: string) {
  logger.info(`🔍 [Fetch] Récupération du coach ${coachId}...`);
  
  const isUuidOrId = /^[0-9a-fA-F-]{10,}$/.test(coachId) || /^\d+$/.test(coachId);
  const lookupParams = isUuidOrId ? { coach_id: coachId } : { coach_name: coachId };
  
  // Appeler l'API de Cyanide via lookup (l'endpoint /coaches filtre mal par ID individuel)
  const response = await bb3ApiClient.get('/lookup', lookupParams);
  const coachesList = response?.coaches || [];
  
  if (coachesList.length === 0) {
    throw new Error(`Aucun coach trouvé avec l'identifiant/nom "${coachId}" via lookup sur l'API Cyanide.`);
  }

  const rawCoach = coachesList[0];
  const realCoachId = (rawCoach.idcoach || rawCoach.id || (isUuidOrId ? coachId : null))?.toString();
  if (!realCoachId) {
    throw new Error(`Impossible d'obtenir l'ID réel du coach pour "${coachId}".`);
  }

  const upsertArgs = TeamParser.parseCoach(rawCoach, realCoachId);

  // Vérifier si le coach existe déjà pour ne pas notifier de fausses insertions
  const coachExists = await prisma.coach.findUnique({
    where: { id: realCoachId },
    select: { id: true }
  });

  // Sauvegarder en base de données
  await prisma.coach.upsert(upsertArgs);
  if (!coachExists) {
    logger.info(`💾 [DB] Coach ${upsertArgs.create.name} (${realCoachId}) inséré.`);
    ConsoleDashboard.setLastInserted('Coach (Créé)', `Nom: "${upsertArgs.create.name}" (${realCoachId})`);
  } else {
    logger.debug(`💾 [DB] Coach ${upsertArgs.create.name} (${realCoachId}) mis à jour.`);
    ConsoleDashboard.setLastInserted('Coach (Maj)', `Nom: "${upsertArgs.create.name}" (${realCoachId})`);
  }
}

/**
 * 2. Traitement de la récupération d'une Ligue
 */
export async function handleFetchLeague(leagueId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`🔍 [Fetch] Récupération des détails de la ligue ${leagueId}...`);
  
  const isUuidOrId = /^[0-9a-fA-F-]{10,}$/.test(leagueId) || /^\d+$/.test(leagueId);
  let realLeagueId = leagueId;

  if (!isUuidOrId) {
    logger.info(`🔍 [Fetch] Résolution du nom de ligue "${leagueId}" via lookup...`);
    const lookupRes = await bb3ApiClient.get('/lookup', { league_name: leagueId, exact: 1 });
    if (lookupRes?.league && lookupRes.league.id) {
      realLeagueId = lookupRes.league.id;
      logger.info(`🔍 [Fetch] Nom de ligue "${leagueId}" résolu en ID: ${realLeagueId}`);
    } else {
      // Fallback: essayer de chercher via /leagues
      const leaguesRes = await bb3ApiClient.get('/leagues', { league: leagueId, limit: 1 });
      const matched = leaguesRes?.leagues?.[0];
      if (matched && matched.name?.toLowerCase() === leagueId.toLowerCase()) {
        realLeagueId = matched.id;
        logger.info(`🔍 [Fetch] Nom de ligue "${leagueId}" résolu via /leagues en ID: ${realLeagueId}`);
      } else {
        throw new Error(`Impossible de résoudre la ligue "${leagueId}" sur l'API Cyanide.`);
      }
    }
  }

  // A. Récupérer et sauvegarder les détails de la ligue
  let leagueResponse;
  try {
    leagueResponse = await bb3ApiClient.get('/league', { id: realLeagueId });
    if (!leagueResponse || !leagueResponse.league) {
      throw new Error(`Aucune ligue trouvée avec l'ID ${realLeagueId} sur l'API Cyanide.`);
    }
  } catch (error: any) {
    if (error.message?.includes('retourné false') || error.message?.includes('Functional Error')) {
      logger.warn(`⚠️ [Fetch] La ligue ${realLeagueId} a retourné une réponse vide/fausse de l'API Cyanide. Analyse de la santé de l'API...`);
      ConsoleDashboard.addAlert('WARN', `Ligue ${realLeagueId} : réponse vide de l'API Cyanide.`);
      cyanideHealthService.handleApiFailure(error.message).catch(err => {
        logger.error(`❌ [Worker] Échec lors du diagnostic de l'API: ${err.message}`);
      });
      return;
    }
    throw error;
  }

  const leagueUpsert = LeagueParser.parseLeague(leagueResponse.league);

  // Vérifier si la ligue existe déjà pour ne pas notifier de fausses insertions
  const leagueExists = await prisma.league.findUnique({
    where: { id: realLeagueId },
    select: { id: true }
  });

  await prisma.league.upsert(leagueUpsert);
  if (!leagueExists) {
    logger.info(`💾 [DB] Ligue "${leagueUpsert.create.name}" (${realLeagueId}) insérée.`);
    ConsoleDashboard.setLastInserted('Ligue (Créée)', `Nom: "${leagueUpsert.create.name}" (${realLeagueId})`);
  } else {
    logger.debug(`💾 [DB] Ligue "${leagueUpsert.create.name}" (${realLeagueId}) mise à jour.`);
    ConsoleDashboard.setLastInserted('Ligue (Maj)', `Nom: "${leagueUpsert.create.name}" (${realLeagueId})`);
  }

  // B. Si la ligue n'est pas active, on s'arrête là
  if (!leagueUpsert.create.active) {
    logger.info(`ℹ️ [Fetch] Ligue "${leagueUpsert.create.name}" inactive. Pas d'aspiration de compétitions.`);
    return;
  }

  // C. Récupérer et sauvegarder les compétitions associées
  logger.info(`🔍 [Fetch] Récupération des compétitions pour la ligue ${realLeagueId}...`);
  const compsResponse = await bb3ApiClient.get('/competitions', { league: realLeagueId });
  const competitions = compsResponse.competitions || [];

  for (const rawComp of competitions) {
    const compUpsert = LeagueParser.parseCompetition(rawComp, realLeagueId);

    // Vérifier si la compétition existe déjà pour ne pas notifier de fausses insertions
    const compExists = await prisma.competition.findUnique({
      where: { id: rawComp.id },
      select: { id: true }
    });

    await prisma.competition.upsert(compUpsert);
    if (!compExists) {
      logger.info(`💾 [DB] Compétition "${compUpsert.create.name}" insérée.`);
      ConsoleDashboard.setLastInserted('Compétition (Créée)', `Nom: "${compUpsert.create.name}" (${rawComp.id}) - Statut: ${compUpsert.create.status}`);
    } else {
      logger.debug(`💾 [DB] Compétition "${compUpsert.create.name}" mise à jour.`);
      ConsoleDashboard.setLastInserted('Compétition (Maj)', `Nom: "${compUpsert.create.name}" (${rawComp.id}) - Statut: ${compUpsert.create.status}`);
    }

    // D. Si la compétition est active (InProgress ou Scheduled), on planifie automatiquement une synchronisation des matchs
    if (compUpsert.create.status === 'InProgress' || compUpsert.create.status === 'Scheduled') {
      await queueCompetitionFetch(rawComp.id, triggerPriority);
    }
  }

  // E. Enfiler la récupération des rosters détaillés de chaque équipe de la ligue
  logger.info(`🔍 [Fetch] Récupération des équipes inscrites dans la ligue ${realLeagueId}...`);
  const teamsResponse = await bb3ApiClient.get('/teams', { league: realLeagueId });
  const teams = teamsResponse.teams || [];

  for (const t of teams) {
    await queueTeamFetch(t.id.toString(), realLeagueId, triggerPriority);
  }
}

/**
 * 3. Traitement de la récupération d'une Compétition (Matchs / Contests)
 */
export async function handleFetchCompetition(competitionId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`🔍 [Fetch] Récupération des matchs pour la compétition ${competitionId}...`);

  const isUuidOrId = /^[0-9a-fA-F-]{10,}$/.test(competitionId) || /^\d+$/.test(competitionId);
  let realCompetitionId = competitionId;
  let competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { historySynced: true, historyLastDate: true }
  });

  if (!competition) {
    // Résoudre et importer via lookup
    logger.info(`🔍 [Fetch] Compétition ${competitionId} absente de la base. Tentative de résolution via lookup...`);
    const lookupParams = isUuidOrId ? { competition_id: competitionId } : { competition_name: competitionId };
    const lookupRes = await bb3ApiClient.get('/lookup', { ...lookupParams, exact: 1 });
    
    if (lookupRes?.competition && lookupRes.competition.id && lookupRes.competition.league?.id) {
      realCompetitionId = lookupRes.competition.id;
      const parentLeagueId = lookupRes.competition.league.id;
      
      logger.info(`🔍 [Fetch] Compétition résolue : "${lookupRes.competition.name}" (${realCompetitionId}). Ligue parente : ${parentLeagueId}`);
      
      // Importer d'abord la ligue parente (cela va créer la compétition en BDD)
      await handleFetchLeague(parentLeagueId, triggerPriority);
      
      // Re-vérifier si elle existe maintenant
      competition = await prisma.competition.findUnique({
        where: { id: realCompetitionId },
        select: { historySynced: true, historyLastDate: true }
      });
    } else {
      throw new Error(`Impossible de trouver la compétition "${competitionId}" via lookup.`);
    }
  } else if (!isUuidOrId) {
    // Si elle existe déjà mais que competitionId était le nom, on résout simplement l'ID localement
    const localComp = await prisma.competition.findFirst({
      where: { name: competitionId },
      select: { id: true, historySynced: true, historyLastDate: true }
    });
    if (localComp) {
      realCompetitionId = localComp.id;
      competition = localComp;
    }
  }

  if (!competition) {
    logger.warn(`⚠️ [Fetch] Compétition ${competitionId} introuvable en base après tentatives d'importation.`);
    return;
  }

  // Étape A : Synchronisation Delta (Nouveaux Matchs vers le futur)
  logger.info(`🔍 [Fetch] Étape A : Synchronisation Delta pour la compétition ${realCompetitionId}...`);
  const lastMatch = await prisma.match.findFirst({
    where: { competitionId: realCompetitionId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true }
  });

  const deltaParams: any = { competition_id: realCompetitionId, limit: 100 };
  if (lastMatch?.startedAt) {
    deltaParams.start = lastMatch.startedAt.toISOString().split('T')[0];
    logger.info(`📅 [Fetch] Dernier match trouvé le ${deltaParams.start}. Mode Delta activé.`);
  } else {
    logger.info(`📅 [Fetch] Aucun match précédent trouvé. Synchronisation globale.`);
  }

  const deltaResponse = await bb3ApiClient.get('/matches', deltaParams);
  let deltaContests = deltaResponse?.matches || [];
  
  deltaContests = deltaContests.map((m: any) => ({
    ...m,
    match_id: m.id || m.uuid
  }));
  
  logger.info(`📊 [Fetch] Delta Sync : ${deltaContests.length} matchs trouvés.`);

  for (const c of deltaContests) {
    const matchId = c.match_id;
    if (!matchId) continue;
    const existing = await prisma.match.findUnique({ where: { id: matchId } });
    if (!existing) {
      await queueMatchFetch(matchId, realCompetitionId, c, triggerPriority);
    }
  }

  // Étape B : Synchronisation Historique (Rattrapage vers le passé)
  if (!competition.historySynced) {
    logger.info(`🔍 [Fetch] Étape B : Rattrapage historique pour la compétition ${realCompetitionId}...`);
    
    // Trouver le match le plus ancien enregistré localement
    const firstLocalMatch = await prisma.match.findFirst({
      where: { competitionId: realCompetitionId },
      orderBy: { startedAt: 'asc' },
      select: { startedAt: true }
    });

    let endDate: Date;
    if (competition.historyLastDate) {
      endDate = competition.historyLastDate;
    } else if (firstLocalMatch?.startedAt) {
      endDate = firstLocalMatch.startedAt;
    } else {
      endDate = new Date();
    }

    const endStr = endDate.toISOString().split('T')[0];
    const historyParams = {
      competition_id: realCompetitionId,
      start: '2023-01-01', // Début de BB3
      end: endStr,
      limit: 100
    };

    logger.info(`📅 [Fetch] Requête historique avec end=${endStr} (start=2023-01-01).`);
    const historyResponse = await bb3ApiClient.get('/matches', historyParams);
    let historyContests = historyResponse?.matches || [];

    historyContests = historyContests.map((m: any) => ({
      ...m,
      match_id: m.id || m.uuid
    }));

    if (historyContests.length === 0) {
      logger.info(`🏁 [Fetch] Aucun match historique retourné. Rattrapage terminé pour la compétition ${realCompetitionId}.`);
      await prisma.competition.update({
        where: { id: realCompetitionId },
        data: { historySynced: true }
      });
    } else {
      let historyEnqueuedCount = 0;
      let minDate: Date | null = null;

      for (const c of historyContests) {
        const matchId = c.match_id;
        if (!matchId) continue;

        const matchDateStr = c.started || c.match_date || c.date;
        if (matchDateStr) {
          const matchDate = new Date(matchDateStr.replace(' ', 'T') + 'Z');
          if (!minDate || matchDate < minDate) {
            minDate = matchDate;
          }
        }

        const existing = await prisma.match.findUnique({ where: { id: matchId } });
        if (!existing) {
          await queueMatchFetch(matchId, realCompetitionId, c, triggerPriority);
          historyEnqueuedCount++;
        }
      }

      logger.info(`📊 [Fetch] Rattrapage Historique : ${historyContests.length} matchs retournés, ${historyEnqueuedCount} nouveaux enfilés.`);

      let targetDate = minDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      const nextEndStr = targetDate.toISOString().split('T')[0];

      if (nextEndStr === endStr) {
        targetDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
        logger.info(`🔄 [Fetch] La date de fin calculée est identique à la précédente (${endStr}). Recul d'un jour forcé.`);
      }

      logger.info(`💾 [Fetch] Mise à jour de historyLastDate = ${targetDate.toISOString()} pour le prochain cycle.`);
      await prisma.competition.update({
        where: { id: realCompetitionId },
        data: { historyLastDate: targetDate }
      });
    }
  }
}

/**
 * 4. Traitement de la récupération d'une Équipe (Roster)
 */
export async function handleFetchTeam(teamId: string, leagueId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`🔍 [Fetch] Initialisation du roster complet de l'équipe ID ${teamId}...`);
  
  // Appeler le roster complet
  let detailResponse;
  try {
    detailResponse = await bb3ApiClient.get('/team', { id: teamId, roster: 1, skills: 1, casualties: 1 });
    if (!detailResponse || !detailResponse.team) {
      logger.warn(`⚠️ [Fetch] Impossible d'aspirer le roster de l'équipe ID ${teamId}.`);
      return;
    }
  } catch (error: any) {
    if (error.message?.includes('retourné false') || error.message?.includes('Functional Error')) {
      logger.warn(`⚠️ [Fetch] L'équipe ID ${teamId} semble ne plus exister ou être inaccessible sur l'API Cyanide. Analyse de la santé de l'API...`);
      ConsoleDashboard.addAlert('WARN', `Équipe ID ${teamId} introuvable sur Cyanide. Ignorée.`);
      cyanideHealthService.handleApiFailure(error.message).catch(err => {
        logger.error(`❌ [Worker] Échec lors du diagnostic de l'API: ${err.message}`);
      });
      return;
    }
    throw error;
  }

  // Détecter si le coach de l'équipe existe déjà en base de données.
  // Si c'est un nouveau coach, on enfile un job pour charger son profil complet de manière asynchrone.
  const coachId = detailResponse.team.idcoach?.toString();
  if (coachId) {
    const coachExists = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { id: true },
    });
    if (!coachExists) {
      logger.info(`✨ [Queue] Nouveau coach détecté : ID ${coachId}. Planification d'une synchronisation complète...`);
      await queueCoachFetch(coachId, triggerPriority);
    }
  }

  // Vérifier si l'équipe existe déjà pour ne pas notifier de fausses insertions
  const teamExists = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true }
  });

  // Transaction Prisma pour insérer le coach, l'équipe et ses joueurs
  await prisma.$transaction(async (tx: any) => {
    // 1. Sauvegarder le coach
    const coachUpsert = TeamParser.parseCoach(detailResponse.coach, detailResponse.team.idcoach);
    await tx.coach.upsert(coachUpsert);

    // 2. Sauvegarder l'équipe
    const teamUpsert = TeamParser.parseTeam(detailResponse);
    await tx.team.upsert(teamUpsert);

    // 3. Sauvegarder tous les joueurs du roster
    const players = detailResponse.roster || [];
    for (const p of players) {
      const playerUpsert = TeamParser.parsePlayer(p, detailResponse.team.id);
      await tx.player.upsert(playerUpsert);
    }
  });

  if (!teamExists) {
    logger.info(`💾 [DB] Équipe "${detailResponse.team.name}" et ses ${detailResponse.roster?.length || 0} joueurs insérés.`);
    ConsoleDashboard.setLastInserted('Équipe (Créée)', `Nom: "${detailResponse.team.name}" (${teamId}) - Roster: ${detailResponse.roster?.length || 0} joueurs`);
  } else {
    logger.debug(`💾 [DB] Équipe "${detailResponse.team.name}" et ses ${detailResponse.roster?.length || 0} joueurs mis à jour.`);
    ConsoleDashboard.setLastInserted('Équipe (Maj)', `Nom: "${detailResponse.team.name}" (${teamId}) - Roster: ${detailResponse.roster?.length || 0} joueurs`);
  }
}

/**
 * 5. Traitement de la récupération d'un Match détaillé
 */
export async function handleFetchMatch(matchId: string, competitionId: string, contest: any, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`📥 [Fetch] Aspiration de la feuille détaillée du match ${matchId}...`);

  // Vérifier s'il n'a pas été créé par une autre exécution entre-temps
  const existing = await prisma.match.findUnique({
    where: { id: matchId },
  });
  if (existing) {
    logger.info(`ℹ️ [Fetch] Match ${matchId} déjà enregistré.`);
    ConsoleDashboard.setLastInserted('Match (Existe)', `ID: ${matchId}`);
    return;
  }

  // Récupérer le payload détaillé du match
  let matchDetailResponse;
  try {
    matchDetailResponse = await bb3ApiClient.get('/match', { id: matchId, rosters: 1 });
    if (!matchDetailResponse || !matchDetailResponse.match) {
      logger.warn(`⚠️ [Fetch] Impossible d'aspirer la feuille de match ${matchId}. Tentative de sauvegarde en tant que match fantôme/abandonné...`);
      await saveGhostMatch(contest, competitionId);
      return;
    }
  } catch (error: any) {
    if (error.message?.includes('retourné false') || error.message?.includes('Functional Error')) {
      logger.warn(`⚠️ [Fetch] Le match ID ${matchId} semble ne plus exister ou être inaccessible sur l'API Cyanide. Analyse de la santé de l'API...`);
      cyanideHealthService.handleApiFailure(error.message).catch(err => {
        logger.error(`❌ [Worker] Échec lors du diagnostic de l'API: ${err.message}`);
      });
      await saveGhostMatch(contest, competitionId);
      return;
    }
    throw error;
  }

  // Détecter si les coachs du match existent déjà en base de données.
  // Si c'est un nouveau coach, on enfile un job pour charger son profil complet de manière asynchrone.
  const rawMatch = matchDetailResponse.match;
  for (const coach of rawMatch.coaches || []) {
    const coachId = coach.idcoach?.toString();
    if (coachId) {
      const coachExists = await prisma.coach.findUnique({
        where: { id: coachId },
        select: { id: true },
      });
      if (!coachExists) {
        logger.info(`✨ [Queue] Nouveau coach détecté dans le match : ID ${coachId}. Planification d'une synchronisation complète...`);
        await queueCoachFetch(coachId, triggerPriority);
      }
    }
  }

  // Sauvegarder le match et mettre à jour les joueurs de façon transactionnelle
  await prisma.$transaction(async (tx: any) => {
    // 1. Assurer la présence des deux coachs
    const rawMatch = matchDetailResponse.match;
    for (const coach of rawMatch.coaches || []) {
      const coachUpsert = TeamParser.parseCoach({
        idcoach: coach.idcoach,
        name: coach.coachname,
        lastlang: coach.lastlang,
      });
      await tx.coach.upsert(coachUpsert);
    }

    // 2. Assurer la présence des deux équipes
    const teams = rawMatch.teams || [];
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const coachInfo = (rawMatch.coaches && rawMatch.coaches[i]) ? rawMatch.coaches[i] : null;
      const coachId = coachInfo ? coachInfo.idcoach : '';
      const coachName = coachInfo ? coachInfo.coachname : 'Coach Inconnu';

      const teamUpsert = TeamParser.parseTeam({
        team: {
          id: team.idteamlisting,
          idcoach: coachId,
          idraces: team.idraces,
          name: team.teamname,
          value: team.value,
          cash: 0,
        },
        coach: {
          idcoach: coachId,
          name: coachName,
        },
      });
      await tx.team.upsert(teamUpsert);
    }

    // 3. Parser et sauvegarder le match global
    const matchUpsert = MatchParser.parseMatch(matchDetailResponse);
    await tx.match.upsert(matchUpsert);

    // 4. Parser les statistiques de chaque joueur et mettre à jour leur XP / Niveau / Blessures
    for (const team of rawMatch.teams || []) {
      const players = team.roster || [];
      for (const p of players) {
        // A. S'assurer que le joueur existe dans la table Player (si manquant)
        const playerUpsert = TeamParser.parsePlayer(p, team.idteamlisting, rawMatch.id);
        await tx.player.upsert(playerUpsert);

        // B. Enregistrer ses statistiques pour ce match précis
        const statsData = MatchParser.parsePlayerMatchStats(p, rawMatch.id, team.idteamlisting);
        await tx.playerMatchStats.create({
          data: statsData,
        });

        // C. Mettre à jour sa fiche de vie globale (XP, niveau, blessures) uniquement si aucun match plus récent n'a été enregistré
        const matchStartedAt = new Date(rawMatch.started.replace(' ', 'T'));
        const playerId = (p.id || `temp-${team.idteamlisting}-match-${rawMatch.id}-${p.number}`).toString();

        const newerMatchStats = await tx.playerMatchStats.findFirst({
          where: {
            playerId: playerId,
            match: {
              startedAt: { gt: matchStartedAt }
            }
          },
          select: { id: true }
        });

        if (!newerMatchStats) {
          const lifeUpdate = MatchParser.preparePlayerLifeUpdate(p, team.idteamlisting, rawMatch.id);
          await tx.player.update(lifeUpdate);
        } else {
          logger.info(`ℹ️ [Fetch] Fiche de vie du joueur ${playerId} non mise à jour car un match plus récent existe déjà.`);
        }
      }
    }
  });

  logger.info(`💾 [DB] Match ${matchId} importé avec succès et fiches de vie des joueurs mises à jour.`);

  // Enregistrer le match inséré dans le tableau de bord
  const matchInfo = `${rawMatch.coaches?.[0]?.coachname || 'Inconnu'} vs ${rawMatch.coaches?.[1]?.coachname || 'Inconnu'} (${rawMatch.teams?.[0]?.teamname} vs ${rawMatch.teams?.[1]?.teamname}) - Score: ${rawMatch.teams?.[0]?.score}-${rawMatch.teams?.[1]?.score}`;
  ConsoleDashboard.setLastInserted('Match (Créé)', `ID: ${matchId} - ${matchInfo}`);
}


/**
 * Helper : Sauvegarde un match fantôme/abandonné à partir du résumé (contest)
 * Utile pour les abandons ou crash serveurs où la feuille de match détaillée est nulle.
 */
async function saveGhostMatch(c: any, competitionId: string) {
  try {
    const isMatchFormat = !!c.uuid;
    const matchId = c.match_id || c.match_uuid || c.uuid;
    
    let home, away;
    if (isMatchFormat && c.coaches && c.teams) {
      home = { 
        coach: { id: c.coaches[0]?.idcoach, name: c.coaches[0]?.coachname },
        team: { id: c.teams[0]?.idteamlisting, name: c.teams[0]?.teamname, logo: c.teams[0]?.teamlogo, value: c.teams[0]?.value, score: c.teams[0]?.score }
      };
      away = { 
        coach: { id: c.coaches[1]?.idcoach, name: c.coaches[1]?.coachname },
        team: { id: c.teams[1]?.idteamlisting, name: c.teams[1]?.teamname, logo: c.teams[1]?.teamlogo, value: c.teams[1]?.value, score: c.teams[1]?.score }
      };
    } else {
      home = c.opponents && c.opponents[0] ? c.opponents[0] : null;
      away = c.opponents && c.opponents[1] ? c.opponents[1] : null;
    }

    if (!home || !away || !home.team || !away.team) return;

    // Retrouver la vraie leagueId depuis la compétition locale
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { leagueId: true }
    });
    if (!comp) return;
    const homeScore = home.team.score || 0;
    const awayScore = away.team.score || 0;
    const status = c.contest_status || c.status || 'ABANDONED';

    await prisma.$transaction(async (tx: any) => {
      // 1. Upsert Coaches
      for (const opp of [home, away]) {
        if (!opp.coach?.id) continue;
        const coachName = opp.coach.name !== undefined && opp.coach.name !== null ? opp.coach.name.toString() : 'Coach Inconnu';
        await tx.coach.upsert({
          where: { id: opp.coach.id },
          create: {
            id: opp.coach.id,
            name: coachName,
            lastLang: opp.coach.lang || null,
          },
          update: {
            name: coachName,
          }
        });
      }

      // 2. Upsert Teams
      for (const opp of [home, away]) {
        if (!opp.team?.id || !opp.coach?.id) continue;
        const teamName = opp.team.name !== undefined && opp.team.name !== null ? opp.team.name.toString() : 'Équipe sans nom';
        await tx.team.upsert({
          where: { id: opp.team.id },
          create: {
            id: opp.team.id,
            name: teamName,
            raceId: 0, // Fallback technique car l'API renvoie la race en string ici
            logo: opp.team.logo || null,
            value: opp.team.value || 0,
            cash: 0,
            coach: { connect: { id: opp.coach.id } }
          },
          update: {
            name: teamName,
            value: opp.team.value || 0,
            logo: opp.team.logo || null,
          }
        });
      }

      // 3. Create the Match
      const matchDateStr = c.match_date || c.started;
      const startedAt = matchDateStr ? new Date(matchDateStr.replace(' ', 'T') + 'Z') : new Date();

      await tx.match.upsert({
        where: { id: matchId },
        create: {
          id: matchId,
          startedAt,
          finishedAt: startedAt,
          round: c.match_round || c.round || 0,
          platform: 'pc',
          status: status,
          league: { connect: { id: comp.leagueId } },
          competition: { connect: { id: competitionId } },
          homeTeam: { connect: { id: home.team.id } },
          awayTeam: { connect: { id: away.team.id } },
          homeCoach: home.coach?.id ? { connect: { id: home.coach.id } } : undefined,
          awayCoach: away.coach?.id ? { connect: { id: away.coach.id } } : undefined,
          homeScore,
          awayScore,
        },
        update: {
          status: status,
          homeScore,
          awayScore
        }
      });
    });

    logger.info(`👻 [DB] Match fantôme/abandonné ${matchId} enregistré avec succès.`);

    // Enregistrer le match fantôme/abandonné dans le tableau de bord
    ConsoleDashboard.setLastInserted('Match (Fantôme)', `ID: ${matchId} - ${home.coach?.name || 'Inconnu'} vs ${away.coach?.name || 'Inconnu'} (${home.team?.name} vs ${away.team?.name}) - Score: ${homeScore}-${awayScore} (${status})`);
  } catch (error: any) {
    logger.error(`❌ [DB] Échec sauvegarde match fantôme ${c.match_id} : ${error.message}`);
  }
}

/**
 * 4. Recherche de ligues directement sur l'API de Cyanide
 */
export async function handleSearchLeagues(query: string) {
  logger.info(`🔍 [Search] Recherche de ligues sur Cyanide avec la requête "${query}"...`);
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const response = await bb3ApiClient.get('/leagues', { league: query, limit: 10 });
    const cyanideLeagues = response.leagues || [];

    // Récupérer les ligues locales déjà importées pour les identifier
    const localLeagues = await prisma.league.findMany({
      where: {
        id: {
          in: cyanideLeagues.map((l: any) => l.id).filter(Boolean),
        },
      },
      select: {
        id: true,
      },
    });

    const localIds = new Set(localLeagues.map(l => l.id));

    // Formater et marquer si déjà importées
    const data = cyanideLeagues.map((l: any) => ({
      id: l.id,
      name: l.name,
      logo: l.logo || 'Logo_BlackOrc_01',
      gamerCount: l.gamerCount || l.gamersCount || 0,
      imported: localIds.has(l.id),
    }));

    return data;
  } catch (error: any) {
    logger.error(`❌ [Search] Erreur lors de la recherche sur Cyanide : ${error.message}`);
    throw new Error(`Erreur lors de la recherche sur l'API de Cyanide : ${error.message}`);
  }
}

export const interactiveWorker = new Worker<JobData>(
  INTERACTIVE_QUEUE_NAME,
  async (job: Job<JobData>) => {
    const { type, id } = job.data;
    logger.info(`🚀 [Interactive Worker] Traitement du job [${job.id}] : ${type}`);
    if (type === 'search-leagues') {
      return await handleSearchLeagues(id);
    }
    if (type === 'fetch-league') {
      await handleFetchLeague(id, 'high');
      return { success: true };
    }
    throw new Error(`Type de job non supporté dans le worker interactif : ${type}`);
  },
  {
    connection: redisConnection,
    concurrency: 3, // Permettre plusieurs recherches en parallèle
    autorun: false,
  }
);
