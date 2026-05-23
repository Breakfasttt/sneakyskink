import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class StatsService {
  // Cache en mémoire pour éviter de recalculer les statistiques globales à chaque appel
  private static globalStatsCache: Record<string, { data: any; timestamp: number }> = {};
  private static CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

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
        isForfeit: true,
        forfeitTeamId: true,
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

      // Concession / Forfait commis
      if (m.isForfeit && m.forfeitTeamId === myTeamId) {
        forfeits++;
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
        isForfeit: true,
        forfeitTeamId: true,
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
      if (m.isForfeit) {
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

    // Compter le nombre de matchs total et forfaits de manière très légère
    const [totalMatches, forfeits] = await Promise.all([
      prisma.match.count({
        where: {
          leagueId,
          homeCoachId: { not: null },
          awayCoachId: { not: null }
        }
      }),
      prisma.match.count({
        where: {
          leagueId,
          isForfeit: true
        }
      })
    ]);

    // Récupérer la dernière activité
    const lastMatch = await prisma.match.findFirst({
      where: {
        leagueId,
        homeCoachId: { not: null },
        awayCoachId: { not: null }
      },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true }
    });
    const lastActivity = lastMatch?.startedAt || null;

    // Récupérer uniquement les 5 derniers matchs pour l'affichage
    const recentMatches = await prisma.match.findMany({
      where: {
        leagueId,
        homeCoachId: { not: null },
        awayCoachId: { not: null }
      },
      take: 5,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        homeScore: true,
        awayScore: true,
        startedAt: true,
        homeCoachId: true,
        awayCoachId: true,
        homeTeam: { select: { name: true, raceId: true } },
        awayTeam: { select: { name: true, raceId: true } },
        homeCoach: { select: { name: true } },
        awayCoach: { select: { name: true } },
        competition: { select: { name: true } },
      }
    });

    // 1. Nombre de coachs distincts via SQL brut (évite de charger et trier 2000 coachs en Node)
    const coachesCountRes = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(DISTINCT coach_id)::int AS count
      FROM (
        SELECT home_coach_id AS coach_id FROM matches WHERE league_id = ${leagueId} AND home_coach_id IS NOT NULL
        UNION
        SELECT away_coach_id AS coach_id FROM matches WHERE league_id = ${leagueId} AND away_coach_id IS NOT NULL
      ) AS temp
    `;
    const coachesCount = Number(coachesCountRes[0]?.count || 0);

    // 2. Rosters joués via SQL brut
    const rostersPlayed = await prisma.$queryRaw<{ raceId: number; teamCount: number }[]>`
      SELECT t.race_id AS "raceId", COUNT(DISTINCT t.id)::int AS "teamCount"
      FROM teams t
      WHERE t.id IN (
        SELECT home_team_id FROM matches WHERE league_id = ${leagueId} AND home_team_id IS NOT NULL
        UNION
        SELECT away_team_id FROM matches WHERE league_id = ${leagueId} AND away_team_id IS NOT NULL
      )
      GROUP BY t.race_id
      ORDER BY "teamCount" DESC
    `;

    // 3. Compétences globales les plus choisies via SQL brut (évite de charger 30 000 joueurs en JS)
    const popularSkills = await prisma.$queryRaw<{ skillName: string; count: number }[]>`
      SELECT skill AS "skillName", COUNT(*)::int AS count
      FROM (
        SELECT unnest(acquired_skills) AS skill
        FROM players
        WHERE team_id IN (
          SELECT home_team_id FROM matches WHERE league_id = ${leagueId} AND home_team_id IS NOT NULL
          UNION
          SELECT away_team_id FROM matches WHERE league_id = ${leagueId} AND away_team_id IS NOT NULL
        )
        AND acquired_skills IS NOT NULL
      ) AS s
      WHERE LOWER(skill) NOT LIKE 'loner%' AND TRIM(skill) != ''
      GROUP BY skill
      ORDER BY count DESC
    `;

    // 4. Compétences par roster via SQL brut
    const skillsByRosterRaw = await prisma.$queryRaw<{ raceId: number; skillName: string; count: number }[]>`
      SELECT race_id AS "raceId", skill AS "skillName", COUNT(*)::int AS count
      FROM (
        SELECT t.race_id, unnest(p.acquired_skills) AS skill
        FROM players p
        JOIN teams t ON p.team_id = t.id
        WHERE p.team_id IN (
          SELECT home_team_id FROM matches WHERE league_id = ${leagueId} AND home_team_id IS NOT NULL
          UNION
          SELECT away_team_id FROM matches WHERE league_id = ${leagueId} AND away_team_id IS NOT NULL
        )
        AND p.acquired_skills IS NOT NULL
      ) AS s
      WHERE LOWER(skill) NOT LIKE 'loner%' AND TRIM(skill) != ''
      GROUP BY race_id, skill
      ORDER BY race_id, count DESC
    `;

    const skillsByRosterMap = new Map<number, { skillName: string; count: number }[]>();
    skillsByRosterRaw.forEach(item => {
      if (!skillsByRosterMap.has(item.raceId)) {
        skillsByRosterMap.set(item.raceId, []);
      }
      skillsByRosterMap.get(item.raceId)!.push({
        skillName: item.skillName,
        count: item.count,
      });
    });

    const skillsByRoster = Array.from(skillsByRosterMap.entries()).map(([raceId, skills]) => ({
      raceId,
      skills,
    }));

    // 5. Récupérer les matches de manière plate en SQL brut (évite les jointures lentes de Prisma)
    const allMatchesRaw = await prisma.$queryRaw<{
      id: string;
      homeScore: number;
      awayScore: number;
      homeTeamId: string;
      awayTeamId: string;
      homeRaceId: number;
      awayRaceId: number;
      homeCoachId: string | null;
      awayCoachId: string | null;
    }[]>`
      SELECT 
        m.id, 
        m.home_score AS "homeScore", 
        m.away_score AS "awayScore", 
        m.home_team_id AS "homeTeamId", 
        m.away_team_id AS "awayTeamId",
        th.race_id AS "homeRaceId",
        ta.race_id AS "awayRaceId",
        m.home_coach_id AS "homeCoachId",
        m.away_coach_id AS "awayCoachId"
      FROM matches m
      JOIN teams th ON m.home_team_id = th.id
      JOIN teams ta ON m.away_team_id = ta.id
      WHERE m.league_id = ${leagueId}
        AND m.home_coach_id IS NOT NULL
        AND m.away_coach_id IS NOT NULL
    `;

    // Calculer les winrates par roster
    const winrateMap = new Map<number, { raceId: number; wins: number; draws: number; losses: number }>();
    allMatchesRaw.forEach(m => {
      const homeRaceId = m.homeRaceId;
      const awayRaceId = m.awayRaceId;

      if (homeRaceId !== undefined) {
        if (!winrateMap.has(homeRaceId)) winrateMap.set(homeRaceId, { raceId: homeRaceId, wins: 0, draws: 0, losses: 0 });
        const stats = winrateMap.get(homeRaceId)!;
        if (m.homeScore > m.awayScore) stats.wins++;
        else if (m.homeScore === m.awayScore) stats.draws++;
        else stats.losses++;
      }

      if (awayRaceId !== undefined) {
        if (!winrateMap.has(awayRaceId)) winrateMap.set(awayRaceId, { raceId: awayRaceId, wins: 0, draws: 0, losses: 0 });
        const stats = winrateMap.get(awayRaceId)!;
        if (m.awayScore > m.homeScore) stats.wins++;
        else if (m.awayScore === m.homeScore) stats.draws++;
        else stats.losses++;
      }
    });
    const rosterWinrates = Array.from(winrateMap.values());

    const simplifiedMatches = allMatchesRaw.map(m => ({
      id: m.id,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homeRaceId: m.homeRaceId,
      awayRaceId: m.awayRaceId,
      homeCoachId: m.homeCoachId,
      awayCoachId: m.awayCoachId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));

    return {
      league: {
        id: league.id,
        name: league.name,
        logo: league.logo,
      },
      summary: {
        totalMatches,
        forfeits,
        coachesCount,
        lastActivity,
      },
      matches: recentMatches,
      coaches: [], // Tableau vide pour des raisons de performances (non affiché sur le front de la page ligue)
      rostersPlayed,
      rosterWinrates,
      allMatches: simplifiedMatches,
      popularSkills,
      skillsByRoster,
    };
  }

  /**
   * Récupère les statistiques globales (avec option filtrage compétitions officielles)
   */
  static async getGlobalStats(isOfficial: boolean = false) {
    const cacheKey = isOfficial ? 'official' : 'global';
    const now = Date.now();

    if (
      this.globalStatsCache[cacheKey] &&
      (now - this.globalStatsCache[cacheKey].timestamp) < this.CACHE_DURATION_MS
    ) {
      return this.globalStatsCache[cacheKey].data;
    }
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
          isForfeit: true,
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
          isForfeit: true,
          forfeitTeamId: true,
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

    const result = {
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

    // Mettre en cache le résultat
    this.globalStatsCache[cacheKey] = {
      data: result,
      timestamp: now,
    };

    return result;
  }

  static async getActivityStats(leagueId?: string, competitionId?: string, coachId?: string) {
    const where: any = {
      homeCoachId: { not: null },
      awayCoachId: { not: null }
    };

    if (leagueId) where.leagueId = leagueId;
    if (competitionId) where.competitionId = competitionId;
    if (coachId) {
      where.OR = [
        { homeCoachId: coachId },
        { awayCoachId: coachId }
      ];
    }

    // Récupérer toutes les dates de début des matchs pour calculs temporels (sans IA)
    const matches = await prisma.match.findMany({
      where,
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
   * Récupère uniquement les dates des matchs joués les dernières 24 heures (avec filtres optionnels)
   */
  static async getActivity24h(leagueId?: string, competitionId?: string, coachId?: string) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where: any = {
      startedAt: {
        gte: yesterday,
      },
      homeCoachId: { not: null },
      awayCoachId: { not: null },
    };

    if (leagueId) where.leagueId = leagueId;
    if (competitionId) where.competitionId = competitionId;
    if (coachId) {
      where.OR = [
        { homeCoachId: coachId },
        { awayCoachId: coachId }
      ];
    }

    const matches = await prisma.match.findMany({
      where,
      select: {
        startedAt: true,
      },
      orderBy: {
        startedAt: 'asc',
      },
    });

    return matches;
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

      if (m.isForfeit && m.forfeitTeamId === teamId) {
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
