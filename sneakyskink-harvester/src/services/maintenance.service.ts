/**
 * Service de maintenance et d'audit pour la base de données de SneakySkink.
 * Permet de nettoyer les doublons, corriger les informations incomplètes
 * et synchroniser à nouveau les coachs et équipes corrompus.
 */

import { prisma, Prisma } from '../database/client.js';
import { logger } from '../utils/logger.js';
import { bb3ApiClient } from './bb3-api-client.js';
import { queueCoachFetch, queueCompetitionFetch, queueLeagueFetch } from '../queue/queue.js';
import { TeamParser } from '../parsers/bb3/team.parser.js';

export class MaintenanceService {
  /**
   * Nettoie les doublons de matchs en base de données.
   */
  private static async cleanDuplicates() {
    let found = 0;
    let fixed = 0;
    const details: any[] = [];

    // Récupérer les matchs pour identification des doublons
    const matches = await prisma.match.findMany({
      select: {
        id: true,
        startedAt: true,
        homeTeamId: true,
        awayTeamId: true,
        competitionId: true,
        homeStats: true,
        awayStats: true,
        _count: {
          select: { playerStats: true }
        }
      }
    });

    const groups: { [key: string]: typeof matches } = {};
    for (const m of matches) {
      const timeKey = Math.floor(m.startedAt.getTime() / 1000);
      const key = `${timeKey}_${m.homeTeamId}_${m.awayTeamId}_${m.competitionId}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(m);
    }

    for (const group of Object.values(groups)) {
      if (group.length <= 1) continue;

      found += (group.length - 1);

      // Trier : privilégier les matchs avec statistiques et le plus de playerStats
      group.sort((a, b) => {
        const aHasStats = a.homeStats && a.awayStats ? 1 : 0;
        const bHasStats = b.homeStats && b.awayStats ? 1 : 0;
        if (aHasStats !== bHasStats) return bHasStats - aHasStats;

        const aStatsCount = a._count.playerStats;
        const bStatsCount = b._count.playerStats;
        if (aStatsCount !== bStatsCount) return bStatsCount - aStatsCount;

        return a.id.localeCompare(b.id);
      });

      const keep = group[0];
      const toDelete = group.slice(1);

      for (const d of toDelete) {
        try {
          await prisma.match.delete({
            where: { id: d.id }
          });
          fixed++;
          details.push({
            type: 'duplicate_match_removed',
            deletedId: d.id,
            keptId: keep.id,
            startedAt: d.startedAt,
            homeTeamId: d.homeTeamId,
            awayTeamId: d.awayTeamId
          });
        } catch (err: any) {
          logger.error(`❌ [Maintenance] Erreur lors de la suppression du doublon de match ${d.id}: ${err.message}`);
        }
      }
    }

    return { found, fixed, details };
  }

  /**
   * Identifie les entités incomplètes (matches récents sans stats, compétitions sans rounds, équipes sans joueurs)
   * et déclenche leur ré-aspiration.
   */
  private static async syncIncomplete() {
    let found = 0;
    let fixed = 0;
    const details: any[] = [];

    // 1. Matchs incomplets (PLAYED/VALIDATED mais sans stats, créés il y a moins de 7 jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const incompleteMatches = await prisma.match.findMany({
      where: {
        status: { in: ['PLAYED', 'VALIDATED'] },
        homeStats: { equals: Prisma.DbNull },
        awayStats: { equals: Prisma.DbNull },
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        id: true,
        competitionId: true
      }
    });

    for (const m of incompleteMatches) {
      found++;
      try {
        await prisma.match.delete({
          where: { id: m.id }
        });
        await queueCompetitionFetch(m.competitionId, 'low');
        fixed++;
        details.push({
          type: 'incomplete_match_deleted_for_re-sync',
          matchId: m.id,
          competitionId: m.competitionId
        });
      } catch (err: any) {
        logger.error(`❌ [Maintenance] Erreur lors de la suppression du match incomplet ${m.id}: ${err.message}`);
      }
    }

    // 2. Compétitions sans rounds
    const incompleteCompetitions = await prisma.competition.findMany({
      where: {
        OR: [
          { round: null },
          { roundsCount: null },
          { round: 0 },
          { roundsCount: 0 }
        ]
      },
      select: {
        id: true,
        leagueId: true,
        name: true
      }
    });

    for (const c of incompleteCompetitions) {
      found++;
      try {
        await queueLeagueFetch(c.leagueId, 'low');
        fixed++;
        details.push({
          type: 'incomplete_competition_re-sync',
          competitionId: c.id,
          competitionName: c.name,
          leagueId: c.leagueId
        });
      } catch (err: any) {
        logger.error(`❌ [Maintenance] Erreur lors du ré-enfilement de la compétition ${c.id}: ${err.message}`);
      }
    }

    // 3. Équipes actives sans joueurs (reconstruction synchrone)
    const teamsWithoutPlayers = await prisma.team.findMany({
      where: {
        players: { none: {} }
      },
      select: {
        id: true,
        name: true
      }
    });

    for (const t of teamsWithoutPlayers) {
      found++;
      try {
        logger.info(`🔍 [Maintenance] Équipe sans joueurs détectée : ${t.name} (${t.id}). Récupération du roster...`);
        const detailResponse = await bb3ApiClient.get('/team', { id: t.id, roster: 1, skills: 1, casualties: 1 });
        if (detailResponse.team) {
          await prisma.$transaction(async (tx: any) => {
            const teamUpsert = TeamParser.parseTeam(detailResponse);
            await tx.team.upsert(teamUpsert);

            const players = detailResponse.roster || [];
            for (const p of players) {
              const playerUpsert = TeamParser.parsePlayer(p, detailResponse.team.id);
              await tx.player.upsert(playerUpsert);
            }
          });
          fixed++;
          details.push({
            type: 'team_roster_rebuilt',
            teamId: t.id,
            teamName: t.name,
            playersCount: detailResponse.roster?.length || 0
          });
        }
      } catch (err: any) {
        logger.error(`❌ [Maintenance] Erreur lors de la reconstruction du roster pour l'équipe ${t.id}: ${err.message}`);
      }
    }

    return { found, fixed, details };
  }

  /**
   * Identifie les coachs avec des informations manquantes ou génériques
   * et relance leur synchronisation.
   */
  private static async fixMismatchedCoaches() {
    let found = 0;
    let fixed = 0;
    const details: any[] = [];

    const mismatchedCoaches = await prisma.coach.findMany({
      where: {
        OR: [
          { name: '' },
          { name: 'Coach Inconnu' },
          { lastLang: null },
          { country: null }
        ]
      },
      select: {
        id: true,
        name: true
      }
    });

    for (const c of mismatchedCoaches) {
      found++;
      try {
        await queueCoachFetch(c.id, 'low');
        fixed++;
        details.push({
          type: 'coach_sync_triggered',
          coachId: c.id,
          currentName: c.name
        });
      } catch (err: any) {
        logger.error(`❌ [Maintenance] Erreur lors de la planification de la correction du coach ${c.id}: ${err.message}`);
      }
    }

    return { found, fixed, details };
  }

  /**
   * Exécute l'ensemble des tâches de maintenance et enregistre un rapport d'audit.
   */
  public static async runMaintenance(trigger: 'AUTOMATIC' | 'MANUAL') {
    const startTime = Date.now();
    logger.info(`🧹 [Maintenance] Démarrage de la routine de maintenance (déclencheur : ${trigger})...`);

    let duplicatesFound = 0;
    let duplicatesFixed = 0;
    let incompleteFound = 0;
    let incompleteFixed = 0;
    let mismatchedFound = 0;
    let mismatchedFixed = 0;
    let detailsList: any[] = [];
    let status = 'SUCCESS';

    try {
      // 1. Nettoyage des doublons
      const dupRes = await this.cleanDuplicates();
      duplicatesFound = dupRes.found;
      duplicatesFixed = dupRes.fixed;
      detailsList.push(...dupRes.details);

      // 2. Traitement des données incomplètes
      const incRes = await this.syncIncomplete();
      incompleteFound = incRes.found;
      incompleteFixed = incRes.fixed;
      detailsList.push(...incRes.details);

      // 3. Correction des coachs
      const misRes = await this.fixMismatchedCoaches();
      mismatchedFound = misRes.found;
      mismatchedFixed = misRes.fixed;
      detailsList.push(...misRes.details);

      logger.info(`🧹 [Maintenance] Fin de la maintenance. Doublons: ${duplicatesFixed}/${duplicatesFound}, Incomplets: ${incompleteFixed}/${incompleteFound}, Coachs planifiés: ${mismatchedFixed}/${mismatchedFound}`);
    } catch (err: any) {
      status = 'FAILED';
      detailsList.push({ error: err.message, stack: err.stack });
      logger.error(`❌ [Maintenance] Échec de la routine de maintenance : ${err.message}`);
    }

    const durationMs = Date.now() - startTime;

    // Enregistrer le rapport d'audit dans la base de données
    const report = await prisma.auditReport.create({
      data: {
        trigger,
        status,
        durationMs,
        duplicatesFound,
        duplicatesFixed,
        incompleteFound,
        incompleteFixed,
        mismatchedFound,
        mismatchedFixed,
        details: detailsList as any
      }
    });

    return report;
  }
}
