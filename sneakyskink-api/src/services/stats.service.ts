import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class StatsService {
  /**
   * Récupère les statistiques détaillées pour un coach (Dashboard Coach)
   */
  static async getCoachStats(coachId: string) {
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
      select: { id: true, name: true, country: true },
    });

    if (!coach) {
      throw new ApiError(404, `Le coach avec l'ID ${coachId} n'existe pas.`);
    }

    // Récupérer toutes les équipes créées par ce coach
    const teams = await prisma.team.findMany({
      where: { coachId },
      select: {
        id: true,
        name: true,
        raceId: true,
        logo: true,
        value: true,
      },
    });

    // Récupérer tous les matchs impliquant ce coach (sans IA)
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeCoachId: coachId, awayCoachId: { not: null } },
          { awayCoachId: coachId, homeCoachId: { not: null } },
        ],
      },
      select: {
        id: true,
        homeCoachId: true,
        awayCoachId: true,
        homeScore: true,
        awayScore: true,
        homeStats: true,
        awayStats: true,
        startedAt: true,
        homeTeamId: true,
        awayTeamId: true,
        homeCoach: { select: { id: true, name: true } },
        awayCoach: { select: { id: true, name: true } },
        homeTeam: { select: { name: true, raceId: true } },
        awayTeam: { select: { name: true, raceId: true } },
        league: { select: { id: true, name: true } },
        competition: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Récupérer la somme des statistiques de tous les joueurs de ce coach (matchs officiels humains)
    const playerStatsSum = await prisma.playerMatchStats.aggregate({
      where: {
        player: {
          team: { coachId },
        },
        match: {
          homeCoachId: { not: null },
          awayCoachId: { not: null },
        },
      },
      _sum: {
        touchdowns: true,
        passes: true,
        catches: true,
        interceptions: true,
        yardsRunning: true,
        yardsPassing: true,
        blocksSucceeded: true,
        blocksSustained: true,
        armourBreaks: true,
        tackles: true,
        casualtiesInflicted: true,
        koInflicted: true,
        injuriesInflicted: true,
        deadInflicted: true,
        casualtiesSustained: true,
        koSustained: true,
        injuriesSustained: true,
        deadSustained: true,
      },
    });

    // Traitement des données récoltées en une seule passe O(N)
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let forfeits = 0;
    const hourlyActivity = Array(24).fill(0);
    const rosterUsage: { [raceId: number]: { raceId: number; matches: number; wins: number; draws: number; losses: number } } = {};
    const leaguesMap = new Map<string, { id: string; name: string }>();
    const competitionsMap = new Map<string, { id: string; name: string }>();
    let lastMatch: any = null;

    for (const m of matches) {
      if (m.league) leaguesMap.set(m.league.id, m.league);
      if (m.competition) competitionsMap.set(m.competition.id, m.competition);

      if (!lastMatch || m.startedAt > lastMatch.startedAt) {
        lastMatch = m;
      }

      // Activité horaire (basée sur la date de début)
      const hour = new Date(m.startedAt).getHours();
      hourlyActivity[hour]++;

      const isHome = m.homeCoachId === coachId;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const myTeamId = isHome ? m.homeTeamId : m.awayTeamId;

      const teamInfo = teams.find(t => t.id === myTeamId);
      const raceId = teamInfo?.raceId ?? 0;

      if (raceId) {
        if (!rosterUsage[raceId]) {
          rosterUsage[raceId] = { raceId, matches: 0, wins: 0, draws: 0, losses: 0 };
        }
        rosterUsage[raceId].matches++;
      }

      if (myScore > oppScore) {
        wins++;
        if (raceId) rosterUsage[raceId].wins++;
      } else if (myScore === oppScore) {
        draws++;
        if (raceId) rosterUsage[raceId].draws++;
      } else {
        losses++;
        if (raceId) rosterUsage[raceId].losses++;
      }

      // Concession / Forfait subi ou commis
      const myStats = isHome ? m.homeStats : m.awayStats;
      if (myStats && typeof myStats === 'object') {
        if ((myStats as any).conceded === true) {
          forfeits++;
        }
      }
    }

    const totalMatches = matches.length;
    const winrate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      coach: {
        id: coach.id,
        name: coach.name,
        country: coach.country,
      },
      summary: {
        totalMatches,
        wins,
        draws,
        losses,
        winrate: Number(winrate.toFixed(2)),
        forfeits,
        activeTeamsCount: teams.length,
        leaguesPlayedCount: leaguesMap.size,
        competitionsPlayedCount: competitionsMap.size,
      },
      lastMatch: lastMatch
        ? {
            id: lastMatch.id,
            startedAt: lastMatch.startedAt,
            leagueName: lastMatch.league?.name || 'Inconnue',
            competitionName: lastMatch.competition?.name || 'Inconnue',
            result:
              (lastMatch.homeCoachId === coachId && lastMatch.homeScore > lastMatch.awayScore) ||
              (lastMatch.awayCoachId === coachId && lastMatch.awayScore > lastMatch.homeScore)
                ? 'WIN'
                : lastMatch.homeScore === lastMatch.awayScore
                ? 'DRAW'
                : 'LOSS',
            score: `${lastMatch.homeScore} - ${lastMatch.awayScore}`,
          }
        : null,
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
          casualtiesSustained: sums.casualtiesSustained || 0,
          koSustained: sums.koSustained || 0,
          injuriesSustained: sums.injuriesSustained || 0,
          deadSustained: sums.deadSustained || 0,
        };
      })(),
      rosterUsage: Object.values(rosterUsage).sort((a, b) => b.matches - a.matches),
      activity: {
        hourlyActivity,
      },
      matches,
      players: await prisma.player.findMany({
        where: { team: { coachId } },
        select: {
          id: true,
          name: true,
          number: true,
          type: true,
          level: true,
          innateSkills: true,
          acquiredSkills: true,
          team: { select: { id: true, name: true, raceId: true } }
        }
      }),
    };
  }

  /**
   * Récupère les statistiques consolidées pour une compétition
   */
  static async getCompetitionStats(competitionId: string) {
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        leagueId: true,
        league: { select: { name: true } },
      },
    });

    if (!comp) {
      throw new ApiError(404, `La compétition avec l'ID ${competitionId} n'existe pas.`);
    }

    const matches = await prisma.match.findMany({
      where: {
        competitionId,
        homeCoachId: { not: null },
        awayCoachId: { not: null }
      },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        homeStats: true,
        awayStats: true,
        startedAt: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { name: true, raceId: true } },
        awayTeam: { select: { name: true, raceId: true } },
        competition: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const playerStatsSum = await prisma.playerMatchStats.aggregate({
      where: {
        match: {
          competitionId,
          homeCoachId: { not: null },
          awayCoachId: { not: null }
        },
      },
      _sum: {
        touchdowns: true,
        passes: true,
        catches: true,
        interceptions: true,
        yardsRunning: true,
        yardsPassing: true,
        blocksSucceeded: true,
        blocksSustained: true,
        armourBreaks: true,
        tackles: true,
        casualtiesInflicted: true,
        koInflicted: true,
        injuriesInflicted: true,
        deadInflicted: true,
        casualtiesSustained: true,
        koSustained: true,
        injuriesSustained: true,
        deadSustained: true,
      },
    });

    let forfeits = 0;
    const rosterUsage: { [raceId: number]: { raceId: number; matches: number; wins: number; draws: number; losses: number } } = {};
    
    for (const m of matches) {
      const homeConceded = m.homeStats && typeof m.homeStats === 'object' && (m.homeStats as any).conceded === true;
      const awayConceded = m.awayStats && typeof m.awayStats === 'object' && (m.awayStats as any).conceded === true;
      if (homeConceded || awayConceded) {
        forfeits++;
      }

      const homeRaceId = m.homeTeam?.raceId;
      const awayRaceId = m.awayTeam?.raceId;

      if (homeRaceId) {
        if (!rosterUsage[homeRaceId]) rosterUsage[homeRaceId] = { raceId: homeRaceId, matches: 0, wins: 0, draws: 0, losses: 0 };
        rosterUsage[homeRaceId].matches++;
        if (m.homeScore > m.awayScore) rosterUsage[homeRaceId].wins++;
        else if (m.homeScore === m.awayScore) rosterUsage[homeRaceId].draws++;
        else rosterUsage[homeRaceId].losses++;
      }
      if (awayRaceId) {
        if (!rosterUsage[awayRaceId]) rosterUsage[awayRaceId] = { raceId: awayRaceId, matches: 0, wins: 0, draws: 0, losses: 0 };
        rosterUsage[awayRaceId].matches++;
        if (m.awayScore > m.homeScore) rosterUsage[awayRaceId].wins++;
        else if (m.awayScore === m.homeScore) rosterUsage[awayRaceId].draws++;
        else rosterUsage[awayRaceId].losses++;
      }
    }

    return {
      competition: {
        id: comp.id,
        name: comp.name,
        format: comp.format,
        status: comp.status,
        leagueId: comp.leagueId,
        leagueName: comp.league?.name || 'Inconnue',
      },
      summary: {
        totalMatches: matches.length,
        forfeits,
      },
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
        };
      })(),
      rosterUsage: Object.values(rosterUsage).sort((a, b) => b.matches - a.matches),
      matches,
    };
  }

  /**
   * Récupère les statistiques consolidées pour une ligue
   */
  static async getLeagueStats(leagueId: string) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    });

    if (!league) {
      throw new ApiError(404, `La ligue avec l'ID ${leagueId} n'existe pas.`);
    }

        const matches = await prisma.match.findMany({
      where: {
        leagueId,
        homeCoachId: { not: null },
        awayCoachId: { not: null }
      },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        homeStats: true,
        awayStats: true,
        startedAt: true,
        homeCoachId: true,
        awayCoachId: true,
        homeCoach: { select: { name: true } },
        awayCoach: { select: { name: true } },
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: { select: { name: true, raceId: true } },
        awayTeam: { select: { name: true, raceId: true } },
        competition: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Calculer les coachs uniques et la dernière activité
    const uniqueCoaches = new Set<string>();
    let lastActivity: Date | null = null;
    const rosterUsage: { [raceId: number]: { raceId: number; matches: number; wins: number; draws: number; losses: number } } = {};

    let forfeits = 0;
    for (const m of matches) {
      if (m.homeCoachId) uniqueCoaches.add(m.homeCoachId);
      if (m.awayCoachId) uniqueCoaches.add(m.awayCoachId);

      if (!lastActivity || m.startedAt > lastActivity) {
        lastActivity = m.startedAt;
      }

      const homeConceded = m.homeStats && typeof m.homeStats === 'object' && (m.homeStats as any).conceded === true;
      const awayConceded = m.awayStats && typeof m.awayStats === 'object' && (m.awayStats as any).conceded === true;
      if (homeConceded || awayConceded) {
        forfeits++;
      }

      const homeRaceId = m.homeTeam?.raceId;
      const awayRaceId = m.awayTeam?.raceId;

      if (homeRaceId) {
        if (!rosterUsage[homeRaceId]) rosterUsage[homeRaceId] = { raceId: homeRaceId, matches: 0, wins: 0, draws: 0, losses: 0 };
        rosterUsage[homeRaceId].matches++;
        if (m.homeScore > m.awayScore) rosterUsage[homeRaceId].wins++;
        else if (m.homeScore === m.awayScore) rosterUsage[homeRaceId].draws++;
        else rosterUsage[homeRaceId].losses++;
      }
      if (awayRaceId) {
        if (!rosterUsage[awayRaceId]) rosterUsage[awayRaceId] = { raceId: awayRaceId, matches: 0, wins: 0, draws: 0, losses: 0 };
        rosterUsage[awayRaceId].matches++;
        if (m.awayScore > m.homeScore) rosterUsage[awayRaceId].wins++;
        else if (m.awayScore === m.homeScore) rosterUsage[awayRaceId].draws++;
        else rosterUsage[awayRaceId].losses++;
      }
    }

    const playerStatsSum = await prisma.playerMatchStats.aggregate({
      where: {
        match: {
          leagueId,
          homeCoachId: { not: null },
          awayCoachId: { not: null }
        },
      },
      _sum: {
        touchdowns: true,
        passes: true,
        catches: true,
        interceptions: true,
        yardsRunning: true,
        yardsPassing: true,
        blocksSucceeded: true,
        blocksSustained: true,
        armourBreaks: true,
        tackles: true,
        casualtiesInflicted: true,
        koInflicted: true,
        injuriesInflicted: true,
        deadInflicted: true,
        casualtiesSustained: true,
        koSustained: true,
        injuriesSustained: true,
        deadSustained: true,
      },
    });

    return {
      league: {
        id: league.id,
        name: league.name,
        logo: league.logo,
      },
      summary: {
        totalMatches: matches.length,
        forfeits,
        coachesCount: uniqueCoaches.size,
        lastActivity,
      },
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
        };
      })(),
      rosterUsage: Object.values(rosterUsage).sort((a, b) => b.matches - a.matches),
      matches,
    };
  }

  /**
   * Récupère les statistiques globales (avec option filtrage compétitions officielles)
   */
  static async getGlobalStats(isOfficial: boolean = false) {
    const where: any = {
      homeCoachId: { not: null },
      awayCoachId: { not: null }
    };

    if (isOfficial) {
      where.league = {
        OR: [
          { name: { contains: 'Official', mode: 'insensitive' } },
          { name: { contains: 'Cyanide', mode: 'insensitive' } },
          { name: { contains: 'Ladder', mode: 'insensitive' } },
          { name: { contains: 'Arena', mode: 'insensitive' } },
          { name: { contains: 'Champions Cup', mode: 'insensitive' } },
        ],
      };
    }

    const [totalMatches, forfeitsCount, playerStatsSum, raceGroups, allMatches, recentMatches] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.count({
        where: {
          ...where,
          OR: [
            { homeStats: { path: ['conceded'], equals: true } },
            { awayStats: { path: ['conceded'], equals: true } },
          ],
        },
      }),
      prisma.playerMatchStats.aggregate({
        where: {
          match: where,
        },
        _sum: {
          touchdowns: true,
          passes: true,
          catches: true,
          interceptions: true,
          yardsRunning: true,
          yardsPassing: true,
          blocksSucceeded: true,
          blocksSustained: true,
          armourBreaks: true,
          tackles: true,
          casualtiesInflicted: true,
          koInflicted: true,
          injuriesInflicted: true,
          deadInflicted: true,
        },
      }),
      prisma.team.groupBy({
        by: ['raceId'],
        _count: { id: true },
      }),
      prisma.match.findMany({
        where,
        select: {
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { raceId: true } },
          awayTeam: { select: { raceId: true } },
        }
      }),
      prisma.match.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: 200,
        select: {
          id: true,
          startedAt: true,
          homeScore: true,
          awayScore: true,
          homeTeam: { select: { name: true, raceId: true } },
          awayTeam: { select: { name: true, raceId: true } },
          league: { select: { name: true } },
          competition: { select: { name: true } },
        }
      })
    ]);

    const racePopularity = raceGroups
      .map(g => ({
        raceId: g.raceId,
        teamCount: g._count.id,
      }))
      .sort((a, b) => b.teamCount - a.teamCount);

    let wins = 0;
    let draws = 0;
    const rosterUsage: { [raceId: number]: { raceId: number; teamCount: number; matchesCount: number; wins: number; draws: number; losses: number } } = {};

    for (const rg of raceGroups) {
      rosterUsage[rg.raceId] = {
        raceId: rg.raceId,
        teamCount: rg._count.id,
        matchesCount: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };
    }

    for (const m of allMatches) {
      if (m.homeScore !== m.awayScore) wins++;
      else draws++;

      const homeRaceId = m.homeTeam?.raceId;
      const awayRaceId = m.awayTeam?.raceId;

      if (homeRaceId) {
        if (!rosterUsage[homeRaceId]) {
          rosterUsage[homeRaceId] = { raceId: homeRaceId, teamCount: 0, matchesCount: 0, wins: 0, draws: 0, losses: 0 };
        }
        rosterUsage[homeRaceId].matchesCount++;
        if (m.homeScore > m.awayScore) rosterUsage[homeRaceId].wins++;
        else if (m.homeScore === m.awayScore) rosterUsage[homeRaceId].draws++;
        else rosterUsage[homeRaceId].losses++;
      }

      if (awayRaceId) {
        if (!rosterUsage[awayRaceId]) {
          rosterUsage[awayRaceId] = { raceId: awayRaceId, teamCount: 0, matchesCount: 0, wins: 0, draws: 0, losses: 0 };
        }
        rosterUsage[awayRaceId].matchesCount++;
        if (m.awayScore > m.homeScore) rosterUsage[awayRaceId].wins++;
        else if (m.awayScore === m.homeScore) rosterUsage[awayRaceId].draws++;
        else rosterUsage[awayRaceId].losses++;
      }
    }

    return {
      scope: isOfficial ? 'OFFICIAL_COMPETITIONS' : 'GLOBAL',
      summary: {
        totalMatches,
        forfeits: forfeitsCount,
        forfeitPercentage: totalMatches > 0 ? Number(((forfeitsCount / totalMatches) * 100).toFixed(2)) : 0,
      },
      globalWinrate: {
        wins,
        draws,
        losses: 0,
      },
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
        };
      })(),
      popularity: {
        racePopularity,
      },
      rosterUsage: Object.values(rosterUsage).sort((a, b) => b.matchesCount - a.matchesCount),
      matches: recentMatches,
    };
  }

  /**
   * Récupère la chronologie et l'activité horaire et journalière des matchs
   */
  static async getActivityStats() {
    // Récupérer toutes les dates de début des matchs pour calculs temporels (sans IA)
    const matches = await prisma.match.findMany({
      where: {
        homeCoachId: { not: null },
        awayCoachId: { not: null }
      },
      select: { startedAt: true },
    });

    const hourlyActivity = Array(24).fill(0);
    const dailyActivity: { [dateStr: string]: number } = {};

    // Remplir les dates des 30 derniers jours avec des zéros par défaut
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyActivity[dateStr] = 0;
    }

    for (const m of matches) {
      const date = new Date(m.startedAt);
      
      // Heure (0-23)
      const hour = date.getHours();
      hourlyActivity[hour]++;

      // Jour (YYYY-MM-DD)
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr in dailyActivity) {
        dailyActivity[dateStr]++;
      }
    }

    // Transformer l'activité journalière en tableau ordonné
    const dailyTimeline = Object.entries(dailyActivity).map(([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMatchesRecorded: matches.length,
      hourlyActivity,
      dailyTimeline,
    };
  }

  /**
   * Récupère les statistiques détaillées d'une équipe
   */
  static async getTeamStats(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { coach: { select: { id: true, name: true } } },
    });

    if (!team) {
      throw new ApiError(404, `L'équipe avec l'ID ${teamId} n'existe pas.`);
    }

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId },
        ],
      },
      include: {
        homeTeam: { select: { name: true, raceId: true } },
        awayTeam: { select: { name: true, raceId: true } },
        homeCoach: { select: { name: true } },
        awayCoach: { select: { name: true } },
        league: { select: { name: true } },
        competition: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const playerStatsSum = await prisma.playerMatchStats.aggregate({
      where: { teamId },
      _sum: {
        touchdowns: true,
        passes: true,
        catches: true,
        interceptions: true,
        yardsRunning: true,
        yardsPassing: true,
        blocksSucceeded: true,
        blocksSustained: true,
        armourBreaks: true,
        tackles: true,
        casualtiesInflicted: true,
        koInflicted: true,
        injuriesInflicted: true,
        deadInflicted: true,
      },
    });

    const players = await prisma.player.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        number: true,
        type: true,
        level: true,
        innateSkills: true,
        acquiredSkills: true,
        status: true,
        team: {
          select: {
            id: true,
            name: true,
            raceId: true,
          }
        }
      }
    });

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let forfeits = 0;

    for (const m of matches) {
      const isHome = m.homeTeamId === teamId;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (myScore > oppScore) wins++;
      else if (myScore === oppScore) draws++;
      else losses++;

      const myStats = isHome ? m.homeStats : m.awayStats;
      if (myStats && typeof myStats === 'object' && (myStats as any).conceded === true) {
        forfeits++;
      }
    }

    const totalMatches = matches.length;
    const winrate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      team: {
        id: team.id,
        name: team.name,
        raceId: team.raceId,
        logo: team.logo,
        value: team.value,
        coach: team.coach,
      },
      summary: {
        totalMatches,
        wins,
        draws,
        losses,
        winrate: Number(winrate.toFixed(2)),
        forfeits,
      },
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
        };
      })(),
      matches,
      players,
    };
  }

  /**
   * Récupère les statistiques détaillées d'un joueur
   */
  static async getPlayerStats(playerId: string) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            raceId: true,
            coach: { select: { id: true, name: true } }
          }
        }
      },
    });

    if (!player) {
      throw new ApiError(404, `Le joueur avec l'ID ${playerId} n'existe pas.`);
    }

    const matchStatsList = await prisma.playerMatchStats.findMany({
      where: { playerId },
      include: {
        match: {
          include: {
            homeTeam: { select: { name: true, raceId: true } },
            awayTeam: { select: { name: true, raceId: true } },
            league: { select: { name: true } },
            competition: { select: { name: true } },
          }
        }
      },
      orderBy: { match: { startedAt: 'desc' } }
    });

    const matches = matchStatsList.map(ms => ms.match);

    const playerStatsSum = await prisma.playerMatchStats.aggregate({
      where: { playerId },
      _sum: {
        touchdowns: true,
        passes: true,
        catches: true,
        interceptions: true,
        yardsRunning: true,
        yardsPassing: true,
        blocksSucceeded: true,
        blocksSustained: true,
        armourBreaks: true,
        tackles: true,
        casualtiesInflicted: true,
        koInflicted: true,
        injuriesInflicted: true,
        deadInflicted: true,
        casualtiesSustained: true,
        koSustained: true,
        injuriesSustained: true,
        deadSustained: true,
      },
    });

    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const ms of matchStatsList) {
      const m = ms.match;
      const isHome = m.homeTeamId === player.teamId;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (myScore > oppScore) wins++;
      else if (myScore === oppScore) draws++;
      else losses++;
    }

    const totalMatches = matchStatsList.length;
    const winrate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      player: {
        id: player.id,
        name: player.name,
        number: player.number,
        type: player.type,
        level: player.level,
        xp: player.xp,
        innateSkills: player.innateSkills,
        acquiredSkills: player.acquiredSkills,
        status: player.status,
        team: player.team,
      },
      summary: {
        totalMatches,
        wins,
        draws,
        losses,
        winrate: Number(winrate.toFixed(2)),
      },
      performance: (() => {
        const sums = playerStatsSum._sum || {};
        return {
          touchdowns: sums.touchdowns || 0,
          passes: sums.passes || 0,
          catches: sums.catches || 0,
          interceptions: sums.interceptions || 0,
          yardsRunning: sums.yardsRunning || 0,
          yardsPassing: sums.yardsPassing || 0,
          blocksSucceeded: sums.blocksSucceeded || 0,
          blocksSustained: sums.blocksSustained || 0,
          armourBreaks: sums.armourBreaks || 0,
          tackles: sums.tackles || 0,
          casualtiesInflicted: sums.casualtiesInflicted || 0,
          koInflicted: sums.koInflicted || 0,
          injuriesInflicted: sums.injuriesInflicted || 0,
          deadInflicted: sums.deadInflicted || 0,
          casualtiesSustained: sums.casualtiesSustained || 0,
          koSustained: sums.koSustained || 0,
          injuriesSustained: sums.injuriesSustained || 0,
          deadSustained: sums.deadSustained || 0,
        };
      })(),
      matches,
    };
  }
}
