import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class TeamsService {
  static async getAllTeams(
    raceId?: number,
    coachId?: string,
    search?: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const where: any = {};
    if (raceId !== undefined) where.raceId = raceId;
    if (coachId) where.coachId = coachId;
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [total, teams] = await Promise.all([
      prisma.team.count({ where }),
      prisma.team.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          coach: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              players: {
                where: { status: 'ACTIVE' },
              },
            },
          },
        },
      }),
    ]);

    const data = teams.map(team => ({
      id: team.id,
      name: team.name,
      raceId: team.raceId,
      logo: team.logo,
      value: team.value,
      cash: team.cash,
      cheerleaders: team.cheerleaders,
      assistantCoaches: team.assistantCoaches,
      popularity: team.popularity,
      rerolls: team.rerolls,
      apothecary: team.apothecary,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      score: team.score,
      coachId: team.coachId,
      coachName: team.coach.name,
      activePlayersCount: team._count.players,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getTeamById(id: string, includePlayers: boolean = false) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        coach: {
          select: {
            name: true,
            country: true,
          },
        },
        players: includePlayers
          ? {
              orderBy: { number: 'asc' },
            }
          : false,
        _count: {
          select: {
            players: true,
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    if (!team) {
      throw new ApiError(404, `L'équipe avec l'ID ${id} n'existe pas.`);
    }

    return {
      id: team.id,
      name: team.name,
      raceId: team.raceId,
      logo: team.logo,
      value: team.value,
      cash: team.cash,
      cheerleaders: team.cheerleaders,
      assistantCoaches: team.assistantCoaches,
      popularity: team.popularity,
      rerolls: team.rerolls,
      apothecary: team.apothecary,
      wins: team.wins,
      draws: team.draws,
      losses: team.losses,
      score: team.score,
      coachId: team.coachId,
      coachName: team.coach.name,
      coachCountry: team.coach.country,
      playersCount: team._count.players,
      matchesCount: team._count.homeMatches + team._count.awayMatches,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      players: includePlayers ? team.players : undefined,
    };
  }
}
