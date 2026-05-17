import { Prisma } from 'sneakyskink-bdd';
import { logger } from '../../utils/logger.js';

/**
 * Interface pour le payload brut d'une ligue
 */
export interface RawLeague {
  id: string;
  name: string;
  logo?: string | null;
  gamer_count?: number | null;
  team_count?: number | null;
}

/**
 * Interface pour le payload brut d'une compétition
 */
export interface RawCompetition {
  id: string;
  name: string;
  format?: string | null;
  status_name?: string | null;
  round?: number | null;
  rounds_count?: number | null;
  turn_duration?: number | null;
  time_bonus_duration?: number | null;
  teams_max?: number | null;
  teams_count?: number | null;
  league?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
}

export class LeagueParser {
  /**
   * Parse une ligue brute en objet d'écriture Prisma
   */
  static parseLeague(raw: RawLeague): Prisma.LeagueUpsertArgs {
    const id = raw.id;
    const name = raw.name || 'Ligue sans nom';
    const logo = raw.logo || null;
    const gamerCount = raw.gamer_count ?? raw.team_count ?? 0;

    const data: Prisma.LeagueCreateInput = {
      id,
      name,
      logo,
      gamerCount,
      active: true,
    };

    return {
      where: { id },
      create: data,
      update: {
        name,
        logo,
        gamerCount,
      },
    };
  }

  /**
   * Parse une compétition brute en objet d'écriture Prisma
   */
  static parseCompetition(raw: RawCompetition, defaultLeagueId?: string): Prisma.CompetitionUpsertArgs {
    const id = raw.id;
    const name = raw.name || 'Compétition sans nom';
    const format = raw.format || 'Ladder';
    const status = raw.status_name || 'InProgress';
    const round = raw.round || null;
    const roundsCount = raw.rounds_count || null;
    const turnDuration = raw.turn_duration ?? 120;
    const timeBonusDuration = raw.time_bonus_duration ?? 450;
    const teamsMax = raw.teams_max || null;
    const teamsCount = raw.teams_count || null;

    // Déterminer la ligue associée
    const leagueId = raw.league?.id || defaultLeagueId;
    if (!leagueId) {
      throw new Error(`Impossible de parser la compétition ${id} (${name}) : aucun leagueId trouvé ou fourni.`);
    }

    const createData: Prisma.CompetitionCreateInput = {
      id,
      name,
      format,
      status,
      round,
      roundsCount,
      turnDuration,
      timeBonusDuration,
      teamsMax,
      teamsCount,
      league: {
        connect: { id: leagueId },
      },
    };

    const updateData: Prisma.CompetitionUpdateInput = {
      name,
      format,
      status,
      round,
      roundsCount,
      turnDuration,
      timeBonusDuration,
      teamsMax,
      teamsCount,
    };

    return {
      where: { id },
      create: createData,
      update: updateData,
    };
  }
}
