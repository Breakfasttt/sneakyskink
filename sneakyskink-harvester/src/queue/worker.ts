/**
 * Worker BullMQ pour traiter les tâches d'aspiration de données du Harvester.
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { 
  harvesterQueue, 
  QUEUE_NAME, 
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

        case 'search-leagues':
          return await handleSearchLeagues(id);

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
  }
);

/**
 * 1. Traitement de la récupération d'un Coach
 */
export async function handleFetchCoach(coachId: string) {
  logger.info(`🔍 [Fetch] Récupération du coach ${coachId}...`);
  
  // Appeler l'API de Cyanide via lookup (l'endpoint /coaches filtre mal par ID individuel)
  const response = await bb3ApiClient.get('/lookup', { coach_id: coachId });
  const coachesList = response.coaches || [];
  
  if (coachesList.length === 0) {
    throw new Error(`Aucun coach trouvé avec l'ID ${coachId} via lookup sur l'API Cyanide.`);
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
export async function handleFetchLeague(leagueId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
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

    // D. Si la compétition est active (InProgress ou Scheduled), on planifie automatiquement une synchronisation des matchs
    if (compUpsert.create.status === 'InProgress' || compUpsert.create.status === 'Scheduled') {
      await queueCompetitionFetch(rawComp.id, triggerPriority);
    }
  }

  // E. Enfiler la récupération des rosters détaillés de chaque équipe de la ligue
  logger.info(`🔍 [Fetch] Récupération des équipes inscrites dans la ligue ${leagueId}...`);
  const teamsResponse = await bb3ApiClient.get('/teams', { league: leagueId });
  const teams = teamsResponse.teams || [];

  for (const t of teams) {
    await queueTeamFetch(t.id.toString(), leagueId, triggerPriority);
  }
}

/**
 * 3. Traitement de la récupération d'une Compétition (Matchs / Contests)
 */
export async function handleFetchCompetition(competitionId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`🔍 [Fetch] Récupération des matchs pour la compétition ${competitionId}...`);

  // 1. Chercher le dernier match importé pour cette compétition (Delta Sync)
  const lastMatch = await prisma.match.findFirst({
    where: { competitionId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true }
  });

  const params: any = { competition_id: competitionId, limit: 100 };
  
  if (lastMatch?.startedAt) {
    // L'API `/matches` accepte le format YYYY-MM-DD
    params.start = lastMatch.startedAt.toISOString().split('T')[0];
    logger.info(`📅 [Fetch] Dernier match trouvé le ${params.start}. Mode Delta activé.`);
  } else {
    logger.info(`📅 [Fetch] Aucun match précédent trouvé. Synchronisation globale.`);
  }

  // 2. Récupérer la liste des matchs joués via /matches
  const response = await bb3ApiClient.get('/matches', params);
  let contests = response.matches || [];
  
  // Formatage de compatibilité pour la boucle existante
  contests = contests.map((m: any) => ({
    ...m,
    match_id: m.id || m.uuid
  }));
  
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

    // Enfiler le job d'aspiration détaillé du match
    await queueMatchFetch(matchId, competitionId, c, triggerPriority);
  }
}

/**
 * 4. Traitement de la récupération d'une Équipe (Roster)
 */
export async function handleFetchTeam(teamId: string, leagueId: string, triggerPriority: 'high' | 'medium' | 'low' = 'medium') {
  logger.info(`🔍 [Fetch] Initialisation du roster complet de l'équipe ID ${teamId}...`);
  
  // Appeler le roster complet
  const detailResponse = await bb3ApiClient.get('/team', { id: teamId, roster: 1, skills: 1, casualties: 1 });
  if (!detailResponse.team) {
    logger.warn(`⚠️ [Fetch] Impossible d'aspirer le roster de l'équipe ID ${teamId}.`);
    return;
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
    return;
  }

  // Récupérer le payload détaillé du match
  const matchDetailResponse = await bb3ApiClient.get('/match', { id: matchId, rosters: 1 });
  if (!matchDetailResponse.match) {
    logger.warn(`⚠️ [Fetch] Impossible d'aspirer la feuille de match ${matchId}. Tentative de sauvegarde en tant que match fantôme/abandonné...`);
    await saveGhostMatch(contest, competitionId);
    return;
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
      const homeScore = home.team.score || 0;
      const awayScore = away.team.score || 0;
      const status = c.contest_status || c.status || 'ABANDONED';

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
