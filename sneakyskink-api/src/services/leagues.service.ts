import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';
import { harvesterQueue } from '../lib/queue.js';

export class LeaguesService {
  static async getAllLeagues(active?: boolean, limit: number = 20, offset: number = 0) {
    const where: any = {};
    if (active !== undefined) {
      where.active = active;
    }

    const [total, leagues] = await Promise.all([
      prisma.league.count({ where }),
      prisma.league.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
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

    return {
      id: league.id,
      name: league.name,
      logo: league.logo,
      gamerCount: league.gamerCount,
      active: league.active,
      createdAt: league.createdAt,
      updatedAt: league.updatedAt,
      competitionsCount: league._count.competitions,
      matchesCount: league._count.matches,
      competitions: includeCompetitions ? league.competitions : undefined,
    };
  }

  static async searchCyanideLeagues(query: string) {
    if (!query || query.trim().length === 0) {
      return { data: [] };
    }

    try {
      const job = await harvesterQueue.add(
        `search-leagues-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        { type: 'search-leagues', id: query },
        { priority: 1 } // Haute priorité
      );

      // Attendre la complétion du job par le harvester
      let attempts = 0;
      const maxAttempts = 150; // 15 secondes max
      
      while (attempts < maxAttempts) {
        const state = await job.getState();
        if (state === 'completed') {
          const finishedJob = await harvesterQueue.getJob(job.id!);
          return { data: finishedJob?.returnvalue || [] };
        }
        if (state === 'failed') {
          const finishedJob = await harvesterQueue.getJob(job.id!);
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
