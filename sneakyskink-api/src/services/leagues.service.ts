import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

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
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getLeagueById(id: string, includeCompetitions: boolean = false) {
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
}
