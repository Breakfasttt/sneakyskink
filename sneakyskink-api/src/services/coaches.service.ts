import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class CoachesService {
  static async getAllCoaches(
    search?: string,
    limit: number = 20,
    offset: number = 0,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    leagueId?: string
  ) {
    const where: any = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }
    if (leagueId) {
      where.OR = [
        { homeMatches: { some: { leagueId } } },
        { awayMatches: { some: { leagueId } } },
      ];
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'teams') {
        orderBy = { teams: { _count: order } };
      } else if (sortBy === 'name') {
        orderBy = { name: order };
      }
    }

    const [total, coaches] = await Promise.all([
      prisma.coach.count({ where }),
      prisma.coach.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          _count: {
            select: {
              teams: true,
            },
          },
        },
      }),
    ]);

    const data = coaches.map(coach => ({
      id: coach.id,
      name: coach.name,
      lastLang: coach.lastLang,
      country: coach.country,
      twitch: coach.twitch,
      youtube: coach.youtube,
      teamsCount: coach._count.teams,
      createdAt: coach.createdAt,
      updatedAt: coach.updatedAt,
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getCoachById(id: string, includeTeams: boolean = false) {
    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        teams: includeTeams
          ? {
              orderBy: { updatedAt: 'desc' },
              include: {
                _count: {
                  select: { players: { where: { status: 'ACTIVE' } } },
                },
              },
            }
          : false,
        _count: {
          select: {
            teams: true,
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    if (!coach) {
      throw new ApiError(404, `Le coach avec l'ID ${id} n'existe pas.`);
    }

    return {
      id: coach.id,
      name: coach.name,
      lastLang: coach.lastLang,
      country: coach.country,
      twitch: coach.twitch,
      youtube: coach.youtube,
      teamsCount: coach._count.teams,
      matchesCount: coach._count.homeMatches + coach._count.awayMatches,
      createdAt: coach.createdAt,
      updatedAt: coach.updatedAt,
      teams: includeTeams
        ? coach.teams.map(team => ({
            id: team.id,
            name: team.name,
            raceId: team.raceId,
            logo: team.logo,
            value: team.value,
            wins: team.wins,
            draws: team.draws,
            losses: team.losses,
            score: team.score,
            activePlayersCount: (team as any)._count.players,
            updatedAt: team.updatedAt,
          }))
        : undefined,
    };
  }
}
