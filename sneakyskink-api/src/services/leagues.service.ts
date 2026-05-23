/**
 * Service pour la gestion des ligues dans la base de données.
 */

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { harvesterQueue, interactiveQueue } from '../lib/queue.js';

export class LeaguesService {
  static async getAllLeagues(
    active?: boolean,
    limit: number = 20,
    offset: number = 0,
    search?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    minGamerCount?: number
  ) {
    const where: any = {};
    if (active !== undefined) {
      where.active = active;
    }

    if (search && search.trim() !== '') {
      where.name = {
        contains: search.trim(),
        mode: 'insensitive'
      };
    }

    if (minGamerCount !== undefined) {
      where.gamerCount = {
        gte: minGamerCount
      };
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'matchesCount') {
        orderBy = { matches: { _count: order } };
      } else if (sortBy === 'competitionsCount') {
        orderBy = { competitions: { _count: order } };
      } else if (sortBy === 'lastMatch') {
        orderBy = { updatedAt: order };
      } else if (['name', 'active', 'isPriority', 'createdAt', 'updatedAt', 'gamerCount'].includes(sortBy)) {
        orderBy = { [sortBy]: order };
      }
    }

    const [total, leagues] = await Promise.all([
      prisma.league.count({ where }),
      prisma.league.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          _count: {
            select: {
              competitions: true,
              matches: true,
            },
          },
          matches: {
            orderBy: {
              finishedAt: 'desc',
            },
            take: 1,
            select: {
              finishedAt: true,
            },
          },
        },
      }),
    ]);

    // Transformer pour un format plus explicite si nécessaire
    const data = leagues.map(league => ({
      id: league.id,
      name: league.name,
      logo: league.logo,
      gamerCount: league.gamerCount,
      active: league.active,
      isPriority: league.isPriority,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
      competitionsCount: league._count.competitions,
      matchesCount: league._count.matches,
      lastMatchDate: league.matches[0]?.finishedAt || null,
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getLeagueById(id: string, includeCompetitions: boolean = true) {
    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        competitions: includeCompetitions
          ? {
              orderBy: { updatedAt: 'desc' },
              include: {
                _count: {
                  select: {
                    matches: true,
                  },
                },
              },
            }
          : false,
        _count: {
          select: {
            competitions: true,
            matches: true,
          },
        },
      },
    });

    if (!league) {
      throw new ApiError(404, `La ligue avec l'ID ${id} n'existe pas dans la base de données.`);
    }

    // Récupérer dynamiquement le nombre d'équipes réelles par compétition via les matches si non défini en BDD
    const teamsCountMap = new Map<string, number>();
    if (includeCompetitions && league.competitions && league.competitions.length > 0) {
      const realTeamsCountRaw = await prisma.$queryRaw<{ competitionId: string; teamCount: number }[]>`
        SELECT 
          m.competition_id AS "competitionId", 
          COUNT(DISTINCT team_id)::int AS "teamCount"
        FROM (
          SELECT competition_id, home_team_id AS team_id FROM matches WHERE league_id = ${id} AND home_team_id IS NOT NULL
          UNION
          SELECT competition_id, away_team_id AS team_id FROM matches WHERE league_id = ${id} AND away_team_id IS NOT NULL
        ) AS m
        GROUP BY m.competition_id
      `;
      realTeamsCountRaw.forEach(item => {
        teamsCountMap.set(item.competitionId, item.teamCount);
      });
    }

    const competitionsEnriched = includeCompetitions && league.competitions
      ? league.competitions.map(comp => ({
          id: comp.id,
          name: comp.name,
          format: comp.format,
          status: comp.status,
          round: comp.round,
          roundsCount: comp.roundsCount,
          turnDuration: comp.turnDuration,
          timeBonusDuration: comp.timeBonusDuration,
          teamsMax: comp.teamsMax,
          teamsCount: comp.teamsCount || teamsCountMap.get(comp.id) || 0,
          matchesCount: (comp as any)._count?.matches ?? 0,
          leagueId: comp.leagueId,
          historySynced: comp.historySynced,
          historyLastDate: comp.historyLastDate,
          createdAt: comp.createdAt,
          updatedAt: comp.updatedAt,
        }))
      : undefined;

    return {
      id: league.id,
      name: league.name,
      logo: league.logo,
      gamerCount: league.gamerCount,
      active: league.active,
      isPriority: league.isPriority,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
      competitionsCount: league._count.competitions,
      matchesCount: league._count.matches,
      competitions: competitionsEnriched,
    };
  }

  static async searchCyanideLeagues(query: string) {
    if (!query || query.trim().length === 0) {
      return { data: [] };
    }

    try {
      const job = await interactiveQueue.add(
        `search-leagues-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        { type: 'search-leagues', id: query }
      );

      // Attendre la complétion du job par le harvester
      let attempts = 0;
      const maxAttempts = 300; // 30 secondes max
      
      while (attempts < maxAttempts) {
        const state = await job.getState();
        if (state === 'completed') {
          const finishedJob = await interactiveQueue.getJob(job.id!);
          return { data: finishedJob?.returnvalue || [] };
        }
        if (state === 'failed') {
          const finishedJob = await interactiveQueue.getJob(job.id!);
          throw new Error(finishedJob?.failedReason || "La recherche de ligues sur Cyanide a échoué.");
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      throw new Error("La recherche de ligues sur Cyanide a expiré.");
    } catch (error: any) {
      throw new ApiError(500, `Erreur lors de la recherche déléguée au Harvester : ${error.message}`);
    }
  }

  static async toggleLeagueActive(id: string, active: boolean) {
    // Vérifier si la ligue existe
    const league = await prisma.league.findUnique({ where: { id } });
    if (!league) {
      throw new ApiError(404, `La ligue avec l'ID ${id} n'existe pas.`);
    }

    const updated = await prisma.league.update({
      where: { id },
      data: { active },
    });

    return updated;
  }
}
