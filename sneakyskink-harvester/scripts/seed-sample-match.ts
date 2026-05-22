import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/database/client.js';
import { TeamParser } from '../src/parsers/bb3/team.parser.js';
import { MatchParser } from '../src/parsers/bb3/match.parser.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  logger.info('🏁 Démarrage de l\'importation du match modèle dans la base de données PostgreSQL...');
  
  try {
    await prisma.$connect();
    
    const docsDir = path.join(__dirname, '../docs');
    const matchDetailPath = path.join(docsDir, 'sample-match-detail.json');
    
    if (!fs.existsSync(matchDetailPath)) {
      logger.error('❌ Fichier sample-match-detail.json manquant !');
      process.exit(1);
    }
    
    const rawMatchDetail = JSON.parse(fs.readFileSync(matchDetailPath, 'utf-8'));
    const rawMatch = rawMatchDetail.match;
    const matchId = rawMatch.id;
    
    // 1. S'assurer de la présence de la ligue dans la base de données
    const leagueId = rawMatch.idleague;
    await prisma.league.upsert({
      where: { id: leagueId },
      create: {
        id: leagueId,
        name: rawMatch.leaguename || 'Official league',
        logo: 'Logo_BlackOrc_01',
        gamerCount: 1,
        active: true,
      },
      update: {},
    });
    logger.info(`✨ Ligue ${leagueId} validée en base de données.`);

    // 2. S'assurer de la présence de la compétition dans la base de données
    const competitionId = rawMatch.idcompetition;
    await prisma.competition.upsert({
      where: { id: competitionId },
      create: {
        id: competitionId,
        name: rawMatch.competitionname || 'OPEN_LADDER_SEASON_11',
        format: 'Ladder',
        status: 'InProgress',
        round: 1,
        roundsCount: 1,
        turnDuration: 120,
        timeBonusDuration: 450,
        teamsMax: 0,
        teamsCount: 0,
        leagueId: leagueId,
      },
      update: {},
    });
    logger.info(`✨ Compétition ${competitionId} validée en base de données.`);

    // Nettoyer les anciennes statistiques et matchs pour éviter les violations de clés primaires/doublons
    await prisma.playerMatchStats.deleteMany({
      where: { matchId: matchId },
    });
    await prisma.match.deleteMany({
      where: { id: matchId },
    });

    // 3. Exécuter la transaction d'importation du match
    await prisma.$transaction(async (tx: any) => {
      // A. Assurer la présence des deux coachs
      for (const coach of rawMatch.coaches || []) {
        const coachUpsert = TeamParser.parseCoach({
          idcoach: coach.idcoach,
          name: coach.coachname,
          lastlang: coach.lastlang,
        });
        await tx.coach.upsert(coachUpsert);
      }

      // B. Assurer la présence des deux équipes
      const teams = rawMatch.teams || [];
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        const coach = rawMatch.coaches[i];
        const coachId = coach?.idcoach || '';
        const coachName = coach?.coachname || 'Coach Inconnu';
        
        const teamUpsert = TeamParser.parseTeam({
          team: {
            id: team.idteamlisting,
            idcoach: coachId,
            idraces: team.idraces,
            name: team.teamname,
            value: team.value,
            cash: 0,
          },
          coach: {
            idcoach: coachId,
            name: coachName,
          },
        });
        await tx.team.upsert(teamUpsert);
      }

      // C. Parser et sauvegarder le match global
      const matchUpsert = MatchParser.parseMatch(rawMatchDetail);
      await tx.match.upsert(matchUpsert);

      // D. Parser les statistiques de chaque joueur et mettre à jour leur XP / Niveau / Blessures
      for (const team of rawMatch.teams || []) {
        const players = team.roster || [];
        for (const p of players) {
          // I. S'assurer que le joueur existe dans la table Player (si manquant)
          const playerUpsert = TeamParser.parsePlayer(p, team.idteamlisting, rawMatch.id);
          await tx.player.upsert(playerUpsert);

          // II. Enregistrer ses statistiques pour ce match précis
          const statsData = MatchParser.parsePlayerMatchStats(p, rawMatch.id, team.idteamlisting);
          await tx.playerMatchStats.create({
            data: statsData,
          });

          // III. Mettre à jour sa fiche de vie globale (XP, niveau, blessures)
          const lifeUpdate = MatchParser.preparePlayerLifeUpdate(p, team.idteamlisting, rawMatch.id);
          await tx.player.update(lifeUpdate);
        }
      }
    });

    logger.info(`🎉 Match ${matchId} importé avec succès et fiches de vie des joueurs mises à jour !`);
  } catch (err: any) {
    logger.error(`❌ Échec de l'importation : ${err.message}`);
    console.error(err);
  } finally {
    await prisma.$disconnect();
    logger.info('🔌 Connexions fermées.');
    process.exit(0);
  }
}

main();
