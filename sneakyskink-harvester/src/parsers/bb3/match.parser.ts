// Ingestion des statistiques détaillées des matchs
import { Prisma } from 'sneakyskink-bdd';
import { logger } from '../../utils/logger.js';

export interface RawMatchPlayerStats {
  blitz_done?: number;
  blocks_succeeded?: number;
  blocks_sustained?: number;
  armour_breaks?: number;
  tackles?: number;
  pushouts?: number;
  pushouts_inflicted?: number;
  yards_running?: number;
  yards_passing?: number;
  yards_rushing?: number;
  catches?: number;
  interceptions?: number;
  passes?: number;
  
  // Dégâts infligés
  casualties_inflicted?: number;
  inflictedcasualties?: number;
  
  injuries_inflicted?: number;
  inflictedinjuries?: number;
  
  ko_inflicted?: number;
  inflictedko?: number;
  
  dead_inflicted?: number;
  deadinflicted?: number;
  
  // Dégâts subis
  casualties_sustained?: number;
  sustainedcasualties?: number;
  
  ko_sustained?: number;
  sustainedko?: number;
  
  injuries_sustained?: number;
  sustainedinjuries?: number;
  
  dead_sustained?: number;
  sustaineddead?: number;
  
  // Expulsions
  expulsions_sustained?: number;
  sustained_expulsions?: number;
  expulsions?: number;
  sustainedexpulsions?: number;

  touchdowns?: number;
}

export interface RawMatchPlayer {
  id: string;
  number: number;
  type: string;
  name?: string | null;
  level?: number;
  xp?: number;
  xp_gain?: number;
  matchplayed?: number;
  mvp?: boolean;
  attributes?: {
    ma: number;
    st: number;
    ag: number;
    pa: number;
    av: number;
  } | null;
  skills?: {
    AcquiredSkills?: string[] | null;
    InnateSkills?: string[] | null;
  } | null;
  casualties?: {
    PreviousCasualty?: string[] | null;
    NewCasualty?: string[] | null;
  } | null;
  stats?: RawMatchPlayerStats | null;
}

export interface RawMatchTeam {
  idteamlisting: string;
  teamname: string;
  idraces: number;
  teamlogo: string;
  score: number;
  roster?: RawMatchPlayer[] | null;
  statistics?: any | null;
}

export interface RawMatchCoach {
  idcoach: string;
  coachname: string;
  lastlang?: string | null;
}

export interface RawMatchInner {
  id: string;
  started: string;
  finished: string;
  round: number;
  game?: string;
  platform?: string | null;
  idleague: string;
  leaguename: string;
  idcompetition: string;
  competitionname: string;
  coaches: RawMatchCoach[];
  teams: RawMatchTeam[];
}

export interface RawMatchRoot {
  match: RawMatchInner;
}

export class MatchParser {
  /**
   * Parse la structure du match brut en arguments d'écriture Prisma
   */
  static parseMatch(root: RawMatchRoot): Prisma.MatchUpsertArgs {
    const raw = root.match;
    if (!raw) {
      throw new Error("Impossible de parser le match: l'objet root ne contient pas la clé 'match'.");
    }

    const id = raw.id;
    const startedAt = new Date(raw.started.replace(' ', 'T'));
    const finishedAt = new Date(raw.finished.replace(' ', 'T'));
    const round = raw.round || 1;
    const platform = raw.platform || 'pc';
    const status = 'VALIDATED';

    const leagueId = raw.idleague;
    const competitionId = raw.idcompetition;

    // Récupérer les deux équipes et coachs
    const homeTeamRaw = raw.teams[0];
    const awayTeamRaw = raw.teams[1];

    if (!homeTeamRaw || !awayTeamRaw) {
      throw new Error(`Impossible de parser le match ${id}: structure d'équipes incomplète.`);
    }

    const homeCoachId = raw.coaches[0]?.idcoach?.toString() || null;
    const awayCoachId = raw.coaches[1]?.idcoach?.toString() || null;

    const homeScore = homeTeamRaw.score ?? 0;
    const awayScore = awayTeamRaw.score ?? 0;

    const homeStats = homeTeamRaw.statistics || {};
    const awayStats = awayTeamRaw.statistics || {};

    const createData: Prisma.MatchCreateInput = {
      id,
      startedAt,
      finishedAt,
      round,
      platform,
      status,
      league: {
        connect: { id: leagueId },
      },
      competition: {
        connect: { id: competitionId },
      },
      homeTeam: {
        connect: { id: homeTeamRaw.idteamlisting },
      },
      awayTeam: {
        connect: { id: awayTeamRaw.idteamlisting },
      },
      homeScore,
      awayScore,
      homeStats,
      awayStats,
    };

    if (homeCoachId) {
      createData.homeCoach = { connect: { id: homeCoachId } };
    }
    if (awayCoachId) {
      createData.awayCoach = { connect: { id: awayCoachId } };
    }

    const updateData: Prisma.MatchUpdateInput = {
      startedAt,
      finishedAt,
      round,
      platform,
      status,
      homeScore,
      awayScore,
      homeStats,
      awayStats,
    };

    return {
      where: { id },
      create: createData,
      update: updateData,
    };
  }

  /**
   * Parse les statistiques de match d'un joueur en objet d'écriture Prisma
   */
  static parsePlayerMatchStats(
    playerRaw: RawMatchPlayer,
    matchId: string,
    teamId: string
  ): Prisma.PlayerMatchStatsCreateManyInput {
    const s = playerRaw.stats || {};
    // Si l'ID du joueur est absent ou nul (ex: mercenaire/journalier), générer un ID déterministe unique
    const playerId = (playerRaw.id || `temp-${teamId}-match-${matchId}-${playerRaw.number}`).toString();

    return {
      matchId,
      playerId,
      teamId,
      matchPlayed: playerRaw.matchplayed === 1,
      mvp: playerRaw.mvp || false,
      xpGained: playerRaw.xp_gain || 0,
      
      // Stats offensives
      touchdowns: s.touchdowns || 0,
      passes: s.passes || 0,
      catches: s.catches || 0,
      interceptions: s.interceptions || 0,
      yardsRunning: s.yards_running || s.yards_rushing || 0,
      yardsPassing: s.yards_passing || 0,

      // Stats physiques
      blocksSucceeded: s.blocks_succeeded || 0,
      blocksSustained: s.blocks_sustained || 0,
      armourBreaks: s.armour_breaks || 0,
      tackles: s.tackles || 0,
      pushouts: s.pushouts_inflicted || s.pushouts || 0,

      // Dégâts infligés
      casualtiesInflicted: s.casualties_inflicted || s.inflictedcasualties || 0,
      koInflicted: s.ko_inflicted || s.inflictedko || 0,
      injuriesInflicted: s.injuries_inflicted || s.inflictedinjuries || 0,
      deadInflicted: s.dead_inflicted || s.deadinflicted || 0,

      // Dégâts subis
      casualtiesSustained: s.casualties_sustained || s.sustainedcasualties || 0,
      koSustained: s.ko_sustained || s.sustainedko || 0,
      injuriesSustained: s.injuries_sustained || s.sustainedinjuries || 0,
      deadSustained: s.dead_sustained || s.sustaineddead || 0,
      sustainedExpulsions: s.expulsions_sustained || s.sustained_expulsions || s.expulsions || s.sustainedexpulsions || 0,

      // Blessures de ce match
      newCasualties: playerRaw.casualties?.NewCasualty || [],
    };
  }

  /**
   * Prépare la mise à jour des statistiques de vie d'un joueur (XP, niveau, blessures courantes)
   */
  static preparePlayerLifeUpdate(playerRaw: RawMatchPlayer, teamId: string, matchId?: string): Prisma.PlayerUpdateArgs {
    const xp = (playerRaw.xp || 0) + (playerRaw.xp_gain || 0);
    const level = playerRaw.level || 1;
    // Si l'ID du joueur est absent ou nul (ex: mercenaire/journalier), générer un ID déterministe unique
    const suffix = matchId ? `match-${matchId}` : 'roster';
    const playerId = (playerRaw.id || `temp-${teamId}-${suffix}-${playerRaw.number}`).toString();

    // Blessures combinées de la fiche
    const activeCasualties = playerRaw.casualties?.NewCasualty || [];
    const innateSkills = playerRaw.skills?.InnateSkills || [];
    const acquiredSkills = playerRaw.skills?.AcquiredSkills || [];

    const data: Prisma.PlayerUpdateInput = {
      xp,
      level,
      innateSkills,
      acquiredSkills,
    };

    // Si de nouvelles blessures sont subies, on les ajoute en BD
    if (activeCasualties.length > 0) {
      data.activeCasualties = {
        set: activeCasualties,
      };
    }

    return {
      where: { id: playerId },
      data,
    };
  }
}
