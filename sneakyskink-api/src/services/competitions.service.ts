import { prisma } from '../lib/prisma.js';
import { Prisma } from 'sneakyskink-bdd';
import { ApiError } from '../middlewares/error.middleware.js';

export class CompetitionsService {
  static async getAllCompetitions(
    leagueId?: string,
    format?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0,
    search?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) {
    const where: any = {};
    if (leagueId) where.leagueId = leagueId;
    if (format) where.format = format;
    if (status) where.status = status;

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      where.OR = [
        { name: { contains: cleanSearch, mode: 'insensitive' } },
        { league: { name: { contains: cleanSearch, mode: 'insensitive' } } }
      ];
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'name') {
        orderBy = { name: order };
      } else if (sortBy === 'status') {
        orderBy = { status: order };
      } else if (sortBy === 'teams') {
        orderBy = { teamsCount: order };
      } else if (sortBy === 'league') {
        orderBy = { league: { name: order } };
      }
    }

    const [total, competitions] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy,
        include: {
          league: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              matches: true,
            },
          },
        },
      }),
    ]);

    const compIds = competitions.map(c => c.id);
    const teamsCountMap = new Map<string, number>();

    if (compIds.length > 0) {
      const realTeamsCountRaw = await prisma.$queryRaw<{ competitionId: string; teamCount: number }[]>`
        SELECT 
          m.competition_id AS "competitionId", 
          COUNT(DISTINCT team_id)::int AS "teamCount"
        FROM (
          SELECT competition_id, home_team_id AS team_id FROM matches WHERE competition_id IN (${Prisma.join(compIds)}) AND home_team_id IS NOT NULL
          UNION
          SELECT competition_id, away_team_id AS team_id FROM matches WHERE competition_id IN (${Prisma.join(compIds)}) AND away_team_id IS NOT NULL
        ) AS m
        GROUP BY m.competition_id
      `;
      realTeamsCountRaw.forEach(item => {
        teamsCountMap.set(item.competitionId, item.teamCount);
      });
    }

    const data = competitions.map(comp => ({
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
      leagueId: comp.leagueId,
      leagueName: comp.league.name,
      matchesCount: comp._count.matches,
      createdAt: comp.createdAt,
      updatedAt: comp.updatedAt,
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getCompetitionById(id: string, includeMatches: boolean = true) {
    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        league: {
          select: {
            name: true,
          },
        },
        matches: includeMatches
          ? {
              orderBy: { round: 'desc' },
              include: {
                homeTeam: { select: { name: true, logo: true, raceId: true } },
                awayTeam: { select: { name: true, logo: true, raceId: true } },
                homeCoach: { select: { name: true } },
                awayCoach: { select: { name: true } },
              },
            }
          : false,
        _count: {
          select: {
            matches: true,
          },
        },
      },
    });

    if (!competition) {
      throw new ApiError(404, `La compétition avec l'ID ${id} n'existe pas.`);
    }

    let realTeamsCount = competition.teamsCount;
    if (!realTeamsCount) {
      const countRes = await prisma.$queryRaw<{ teamCount: number }[]>`
        SELECT COUNT(DISTINCT team_id)::int AS "teamCount"
        FROM (
          SELECT home_team_id AS team_id FROM matches WHERE competition_id = ${id} AND home_team_id IS NOT NULL
          UNION
          SELECT away_team_id AS team_id FROM matches WHERE competition_id = ${id} AND away_team_id IS NOT NULL
        ) AS m
      `;
      realTeamsCount = countRes[0]?.teamCount || 0;
    }

    return {
      id: competition.id,
      name: competition.name,
      format: competition.format,
      status: competition.status,
      round: competition.round,
      roundsCount: competition.roundsCount,
      turnDuration: competition.turnDuration,
      timeBonusDuration: competition.timeBonusDuration,
      teamsMax: competition.teamsMax,
      teamsCount: realTeamsCount,
      leagueId: competition.leagueId,
      leagueName: competition.league.name,
      matchesCount: competition._count.matches,
      createdAt: competition.createdAt,
      updatedAt: competition.updatedAt,
      matches: includeMatches ? competition.matches : undefined,
    };
  }
}
