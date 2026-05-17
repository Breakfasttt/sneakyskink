import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { harvesterQueue, QUEUE_NAME, JobData, queueCoachFetch, queueCompetitionFetch } from './queue.js';
import { prisma } from '../database/client.js';
import { bb3ApiClient } from '../services/bb3-api-client.js';
import { LeagueParser } from '../parsers/bb3/league.parser.js';
import { TeamParser } from '../parsers/bb3/team.parser.js';
import { MatchParser } from '../parsers/bb3/match.parser.js';
import { logger } from '../utils/logger.js';

export const harvesterWorker = new Worker<JobData>(
  QUEUE_NAME,
  async (job: Job<JobData>) => {
    const { type, id } = job.data;
    logger.info(`🚀 [Worker] Traitement du job [${job.id}] : ${type} pour l'ID ${id}`);

    try {
      switch (type) {
        case 'fetch-coach':
          await handleFetchCoach(id);
          break;

        case 'fetch-league':
          await handleFetchLeague(id);
          break;

        case 'fetch-competition':
          await handleFetchCompetition(id);
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
    concurrency: 1, // Exécuter séquentiellement pour respecter scrupuleusement les quotas d'API
  }
);

/**
 * 1. Traitement de la récupération d'un Coach
 */
export async function handleFetchCoach(coachId: string) {
  logger.info(`🔍 [Fetch] Récupération du coach ${coachId}...`);
  
  // Appeler l'API de Cyanide
  const response = await bb3ApiClient.get('/coaches', { idcoaches: coachId });
  const coachesList = response.coaches || [];
  
  if (coachesList.length === 0) {
    throw new Error(`Aucun coach trouvé avec l'ID ${coachId} sur l'API Cyanide.`);
  }

  const rawCoach = coachesList[0];
  const upsertArgs = TeamParser.parseCoach(rawCoach, coachId);

  // Sauvegarder en base de données
  await prisma.coach.upsert(upsertArgs);
  logger.info(`💾 [DB] Coach ${upsertArgs.create.name} (${coachId}) sauvegardé.`);
}

/**
 * 2. Traitement de la récupération d'une Ligue
 */
export async function handleFetchLeague(leagueId: string) {
  logger.info(`🔍 [Fetch] Récupération des détails de la ligue ${leagueId}...`);
  
  // A. Récupérer et sauvegarder les détails de la ligue
  const leagueResponse = await bb3ApiClient.get('/league', { id: leagueId });
  if (!leagueResponse.league) {
    throw new Error(`Aucune ligue trouvée avec l'ID ${leagueId} sur l'API Cyanide.`);
  }

  const leagueUpsert = LeagueParser.parseLeague(leagueResponse.league);
  await prisma.league.upsert(leagueUpsert);
  logger.info(`💾 [DB] Ligue "${leagueUpsert.create.name}" (${leagueId}) sauvegardée.`);

  // B. Si la ligue n'est pas active, on s'arrête là
  if (!leagueUpsert.create.active) {
    logger.info(`ℹ️ [Fetch] Ligue "${leagueUpsert.create.name}" inactive. Pas d'aspiration de compétitions.`);
    return;
  }

  // C. Récupérer et sauvegarder les compétitions associées
  logger.info(`🔍 [Fetch] Récupération des compétitions pour la ligue ${leagueId}...`);
  const compsResponse = await bb3ApiClient.get('/competitions', { league: leagueId });
  const competitions = compsResponse.competitions || [];

  for (const rawComp of competitions) {
    const compUpsert = LeagueParser.parseCompetition(rawComp, leagueId);
    await prisma.competition.upsert(compUpsert);
    logger.info(`💾 [DB] Compétition "${compUpsert.create.name}" sauvegardée.`);

    // D. Si la compétition est active (InProgress), on planifie automatiquement une synchronisation des matchs
    if (compUpsert.create.status === 'InProgress' || compUpsert.create.status === 'Scheduled') {
      await queueCompetitionFetch(rawComp.id, 'medium');
    }
  }

  // E. Récupérer et initialiser le roster de toutes les équipes de la ligue
  logger.info(`🔍 [Fetch] Récupération des équipes inscrites dans la ligue ${leagueId}...`);
  const teamsResponse = await bb3ApiClient.get('/teams', { league: leagueId });
  const teams = teamsResponse.teams || [];

  for (const t of teams) {
    logger.info(`🔍 [Fetch] Initialisation du roster complet de l'équipe ID ${t.id}...`);
    // Appeler le roster complet
    const detailResponse = await bb3ApiClient.get('/team', { id: t.id, roster: 1, skills: 1, casualties: 1 });
    if (!detailResponse.team) continue;

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
        await queueCoachFetch(coachId, 'low');
      }
    }

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

    logger.info(`💾 [DB] Équipe "${detailResponse.team.name}" et ses ${detailResponse.roster?.length || 0} joueurs initialisés en BD.`);
  }
}

/**
 * 3. Traitement de la récupération d'une Compétition (Matchs / Contests)
 */
export async function handleFetchCompetition(competitionId: string) {
  logger.info(`🔍 [Fetch] Récupération des matchs pour la compétition ${competitionId}...`);

  // Récupérer la liste des matchs (contests)
  const response = await bb3ApiClient.get('/contests', { competition: competitionId });
  let contests = response.contests || [];
  
  if (contests.length === 0) {
    logger.info(`ℹ️ [Fetch] Aucun contest planifié trouvé. Tentative de récupération via /matches...`);
    const matchesResponse = await bb3ApiClient.get('/matches', { competition_id: competitionId });
    const matchesList = matchesResponse.matches || [];
    contests = matchesList.map((m: any) => ({
      ...m,
      match_id: m.id || m.uuid
    }));
  }
  
  logger.info(`📊 [Fetch] ${contests.length} matchs trouvés dans la compétition.`);

  for (const c of contests) {
    const matchId = c.match_id;
    if (!matchId) {
      // Match pas encore joué ou planifié
      continue;
    }

    // A. Vérifier si le match est déjà enregistré en BDD
    const existing = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (existing) {
      // Match déjà importé et immuable, pas besoin de gaspiller des appels d'API !
      continue;
    }

    logger.info(`📥 [Fetch] Nouveau match détecté (${matchId}). Aspiration de la feuille détaillée...`);

    // B. Récupérer le payload détaillé du match
    const matchDetailResponse = await bb3ApiClient.get('/match', { id: matchId, rosters: 1 });
    if (!matchDetailResponse.match) {
      logger.warn(`⚠️ [Fetch] Impossible d'aspirer le match ${matchId}. Passé.`);
      continue;
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
          await queueCoachFetch(coachId, 'low');
        }
      }
    }

    // C. Sauvegarder le match et mettre à jour les joueurs de façon transactionnelle
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
      for (const team of rawMatch.teams || []) {
        const coachId = rawMatch.coaches.find((c: any) => c.coachname === team.coachname)?.idcoach || '';
        const teamUpsert = TeamParser.parseTeam({
          team: {
            id: team.idteamlisting,
            idcoach: coachId,
            idraces: team.idraces,
            name: team.teamname,
            value: team.value,
            cash: 0, // Optionnel lors du match
          },
          coach: {
            idcoach: coachId,
            name: team.coachname || 'Coach Inconnu',
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
          const playerUpsert = TeamParser.parsePlayer(p, team.idteamlisting);
          await tx.player.upsert(playerUpsert);

          // B. Enregistrer ses statistiques pour ce match précis
          const statsData = MatchParser.parsePlayerMatchStats(p, rawMatch.id, team.idteamlisting);
          await tx.playerMatchStats.create({
            data: statsData,
          });

          // C. Mettre à jour sa fiche de vie globale (XP, niveau, blessures)
          const lifeUpdate = MatchParser.preparePlayerLifeUpdate(p);
          await tx.player.update(lifeUpdate);
        }
      }
    });

    logger.info(`💾 [DB] Match ${matchId} importé avec succès et fiches de vie des joueurs mises à jour.`);
  }
}
