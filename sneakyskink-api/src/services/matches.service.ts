/**
 * Service de gestion des matchs et de leurs statistiques détaillées.
 */

import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';


export class MatchesService {
  static async getAllMatches(
    leagueId?: string,
    competitionId?: string,
    teamId?: string,
    coachId?: string,
    status?: string,
    limit: number = 20,
    offset: number = 0
  ) {
    const andConditions: any[] = [
      { homeCoachId: { not: null } },
      { awayCoachId: { not: null } }
    ];

    if (leagueId) andConditions.push({ leagueId });
    if (competitionId) andConditions.push({ competitionId });
    if (status) andConditions.push({ status });

    if (teamId) {
      andConditions.push({
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      });
    }

    if (coachId) {
      andConditions.push({
        OR: [{ homeCoachId: coachId }, { awayCoachId: coachId }],
      });
    }

    const where = { AND: andConditions };

    const [total, matches] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { startedAt: 'desc' },
        include: {
          league: { select: { name: true } },
          competition: { select: { name: true, round: true } },
          homeTeam: { select: { name: true, logo: true } },
          awayTeam: { select: { name: true, logo: true } },
          homeCoach: { select: { name: true } },
          awayCoach: { select: { name: true } },
        },
      }),
    ]);

    const data = matches.map(match => ({
      id: match.id,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      round: match.round,
      platform: match.platform,
      status: match.status,
      leagueId: match.leagueId,
      leagueName: match.league.name,
      competitionId: match.competitionId,
      competitionName: match.competition.name,
      isForfeit: match.isForfeit,
      forfeitTeamId: match.forfeitTeamId,
      homeTeam: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
        logo: match.homeTeam.logo,
        score: match.homeScore,
        coachName: match.homeCoach?.name || 'Inconnu',
      },
      awayTeam: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
        logo: match.awayTeam.logo,
        score: match.awayScore,
        coachName: match.awayCoach?.name || 'Inconnu',
      },
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    }));

    return {
      total,
      limit,
      offset,
      data,
    };
  }

  static async getMatchById(id: string) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        league: { select: { name: true } },
        competition: { select: { name: true, round: true, format: true } },
        homeTeam: { select: { name: true, logo: true, raceId: true } },
        awayTeam: { select: { name: true, logo: true, raceId: true } },
        homeCoach: { select: { name: true, country: true } },
        awayCoach: { select: { name: true, country: true } },
        playerStats: {
          include: {
            player: {
              select: {
                name: true,
                number: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new ApiError(404, `Le match avec l'ID ${id} n'existe pas.`);
    }

    // Répartir les statistiques des joueurs entre l'équipe domicile et l'équipe extérieur
    const homePlayerStats = match.playerStats
      .filter(ps => ps.teamId === match.homeTeamId)
      .map(ps => ({
        playerId: ps.playerId,
        name: ps.player.name,
        number: ps.player.number,
        type: ps.player.type,
        matchPlayed: ps.matchPlayed,
        mvp: ps.mvp,
        xpGained: ps.xpGained,
        touchdowns: ps.touchdowns,
        passes: ps.passes,
        catches: ps.catches,
        interceptions: ps.interceptions,
        yardsRunning: ps.yardsRunning,
        yardsPassing: ps.yardsPassing,
        blocksSucceeded: ps.blocksSucceeded,
        blocksSustained: ps.blocksSustained,
        armourBreaks: ps.armourBreaks,
        tackles: ps.tackles,
        pushouts: ps.pushouts,
        casualtiesInflicted: ps.casualtiesInflicted,
        koInflicted: ps.koInflicted,
        injuriesInflicted: ps.injuriesInflicted,
        deadInflicted: ps.deadInflicted,
        casualtiesSustained: ps.casualtiesSustained,
        koSustained: ps.koSustained,
        injuriesSustained: ps.injuriesSustained,
        deadSustained: ps.deadSustained,
        sustainedExpulsions: ps.sustainedExpulsions,
        newCasualties: ps.newCasualties,
      }));

    const awayPlayerStats = match.playerStats
      .filter(ps => ps.teamId === match.awayTeamId)
      .map(ps => ({
        playerId: ps.playerId,
        name: ps.player.name,
        number: ps.player.number,
        type: ps.player.type,
        matchPlayed: ps.matchPlayed,
        mvp: ps.mvp,
        xpGained: ps.xpGained,
        touchdowns: ps.touchdowns,
        passes: ps.passes,
        catches: ps.catches,
        interceptions: ps.interceptions,
        yardsRunning: ps.yardsRunning,
        yardsPassing: ps.yardsPassing,
        blocksSucceeded: ps.blocksSucceeded,
        blocksSustained: ps.blocksSustained,
        armourBreaks: ps.armourBreaks,
        tackles: ps.tackles,
        pushouts: ps.pushouts,
        casualtiesInflicted: ps.casualtiesInflicted,
        koInflicted: ps.koInflicted,
        injuriesInflicted: ps.injuriesInflicted,
        deadInflicted: ps.deadInflicted,
        casualtiesSustained: ps.casualtiesSustained,
        koSustained: ps.koSustained,
        injuriesSustained: ps.injuriesSustained,
        deadSustained: ps.deadSustained,
        sustainedExpulsions: ps.sustainedExpulsions,
        newCasualties: ps.newCasualties,
      }));

    return {
      id: match.id,
      startedAt: match.startedAt,
      finishedAt: match.finishedAt,
      round: match.round,
      platform: match.platform,
      status: match.status,
      leagueId: match.leagueId,
      leagueName: match.league.name,
      competitionId: match.competitionId,
      competitionName: match.competition.name,
      competitionFormat: match.competition.format,
      isForfeit: match.isForfeit,
      forfeitTeamId: match.forfeitTeamId,
      homeTeam: {
        id: match.homeTeamId,
        name: match.homeTeam.name,
        logo: match.homeTeam.logo,
        raceId: match.homeTeam.raceId,
        score: match.homeScore,
        coach: match.homeCoach
          ? {
              id: match.homeCoachId,
              name: match.homeCoach.name,
              country: match.homeCoach.country,
            }
          : null,
        stats: match.homeStats,
        players: homePlayerStats,
      },
      awayTeam: {
        id: match.awayTeamId,
        name: match.awayTeam.name,
        logo: match.awayTeam.logo,
        raceId: match.awayTeam.raceId,
        score: match.awayScore,
        coach: match.awayCoach
          ? {
              id: match.awayCoachId,
              name: match.awayCoach.name,
              country: match.awayCoach.country,
            }
          : null,
        stats: match.awayStats,
        players: awayPlayerStats,
      },
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
    };
  }
}
