import { Prisma } from 'sneakyskink-bdd';
import { logger } from '../../utils/logger.js';

export interface RawCoach {
  id?: string | number | null;
  idcoach?: string | null;
  name: string;
  lastlang?: string | null;
  country?: string | null;
  twitch?: string | null;
  youtube?: string | null;
}

export interface RawPlayer {
  id: string;
  name?: string | null;
  number: number;
  value: number;
  xp: number;
  level: number;
  type: string;
  casualties_state?: string[] | null;
  suspended_next_match?: boolean | null;
  attributes?: {
    ma: number;
    st: number;
    ag: number;
    pa: number;
    av: number;
  } | null;
  skills?: string[] | null;
}

export interface RawTeamDetail {
  team: {
    id: string;
    idcoach: string;
    idraces: number;
    name: string;
    value: number;
    cash: number;
    cheerleaders?: number | null;
    assistantcoaches?: number | null;
    popularity?: number | null;
    rerolls?: number | null;
    apothecary?: number | null;
    logo?: string | null;
  };
  coach: RawCoach;
  roster?: RawPlayer[] | null;
}

export class TeamParser {
  /**
   * Parse un coach brut en objet d'écriture Prisma
   */
  static parseCoach(raw: RawCoach, fallbackId?: string): Prisma.CoachUpsertArgs {
    const id = (fallbackId || raw.idcoach || raw.id)?.toString();
    if (!id) {
      throw new Error(`Impossible de parser le coach: aucun ID fourni.`);
    }

    const name = raw.name !== undefined && raw.name !== null ? raw.name.toString() : 'Coach Anonyme';
    const lastLang = raw.lastlang || null;
    const country = raw.country || null;
    const twitch = raw.twitch || null;
    const youtube = raw.youtube || null;

    const createData: Prisma.CoachCreateInput = {
      id,
      name,
      lastLang,
      country,
      twitch,
      youtube,
    };

    const updateData: Prisma.CoachUpdateInput = {
      name,
      lastLang,
      country,
      twitch,
      youtube,
    };

    return {
      where: { id },
      create: createData,
      update: updateData,
    };
  }

  /**
   * Parse une équipe brute en objet d'écriture Prisma
   */
  static parseTeam(raw: RawTeamDetail): Prisma.TeamUpsertArgs {
    const teamRaw = raw.team;
    const id = teamRaw.id;
    const name = teamRaw.name !== undefined && teamRaw.name !== null ? teamRaw.name.toString() : 'Équipe sans nom';
    const raceId = teamRaw.idraces;
    const logo = teamRaw.logo || null;
    const value = teamRaw.value || 0;
    const cash = teamRaw.cash || 0;
    const cheerleaders = teamRaw.cheerleaders || 0;
    const assistantCoaches = teamRaw.assistantcoaches || 0;
    const popularity = teamRaw.popularity || 0;
    const rerolls = teamRaw.rerolls || 0;
    const apothecary = teamRaw.apothecary || 0;
    const coachId = teamRaw.idcoach?.toString();

    if (!coachId) {
      throw new Error(`Impossible de parser l'équipe ${id} (${name}) : aucun coachId associé.`);
    }

    const createData: Prisma.TeamCreateInput = {
      id,
      name,
      raceId,
      logo,
      value,
      cash,
      cheerleaders,
      assistantCoaches,
      popularity,
      rerolls,
      apothecary,
      coach: {
        connect: { id: coachId },
      },
    };

    const updateData: Prisma.TeamUpdateInput = {
      name,
      raceId,
      logo,
      value,
      cash,
      cheerleaders,
      assistantCoaches,
      popularity,
      rerolls,
      apothecary,
    };

    return {
      where: { id },
      create: createData,
      update: updateData,
    };
  }

  /**
   * Parse un joueur brut en objet d'écriture Prisma
   */
  static parsePlayer(raw: RawPlayer, teamId: string): Prisma.PlayerUpsertArgs {
    const id = raw.id;
    const name = raw.name !== undefined && raw.name !== null ? raw.name.toString() : 'Joueur sans nom';
    const number = raw.number;
    const value = raw.value || 0;
    const xp = raw.xp || 0;
    const level = raw.level || 1;
    const type = raw.type || 'unknown_player';
    const suspendedNextMatch = raw.suspended_next_match || false;

    // Attributs physiques
    const ma = raw.attributes?.ma ?? 6;
    const st = raw.attributes?.st ?? 3;
    const ag = raw.attributes?.ag ?? 3;
    const pa = raw.attributes?.pa ?? 5;
    const av = raw.attributes?.av ?? 9;

    // Compétences et blessures
    const activeCasualties = raw.casualties_state || [];
    
    // Gérer les deux formats possibles de skills (Array ou Object)
    let innateSkills: string[] = [];
    let acquiredSkills: string[] = [];
    
    if (Array.isArray(raw.skills)) {
      innateSkills = raw.skills;
    } else if (raw.skills && typeof raw.skills === 'object') {
      innateSkills = (raw.skills as any).InnateSkills || [];
      acquiredSkills = (raw.skills as any).AcquiredSkills || [];
    }

    const createData: Prisma.PlayerCreateInput = {
      id,
      name,
      number,
      value,
      xp,
      level,
      type,
      suspendedNextMatch,
      ma,
      st,
      ag,
      pa,
      av,
      innateSkills,
      acquiredSkills,
      activeCasualties,
      team: {
        connect: { id: teamId },
      },
    };

    const updateData: Prisma.PlayerUpdateInput = {
      name,
      number,
      value,
      xp,
      level,
      type,
      suspendedNextMatch,
      ma,
      st,
      ag,
      pa,
      av,
      activeCasualties,
      // Si le joueur est mis à jour depuis le roster, on met à jour ses compétences
      innateSkills,
    };

    return {
      where: { id },
      create: createData,
      update: updateData,
    };
  }
}
