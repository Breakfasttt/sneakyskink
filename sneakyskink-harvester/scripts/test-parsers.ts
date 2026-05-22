import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../src/utils/logger.js';
import { LeagueParser } from '../src/parsers/bb3/league.parser.js';
import { TeamParser } from '../src/parsers/bb3/team.parser.js';
import { MatchParser } from '../src/parsers/bb3/match.parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  logger.info('🏁 Démarrage de la suite de tests de validation des parseurs...');

  const docsDir = path.join(__dirname, '../docs');
  const teamDetailPath = path.join(docsDir, 'sample-team-detail.json');
  const matchDetailPath = path.join(docsDir, 'sample-match-detail.json');

  if (!fs.existsSync(teamDetailPath) || !fs.existsSync(matchDetailPath)) {
    logger.error('❌ Fichiers de payloads modèles manquants ! Exécutez npm run test:client d\'abord.');
    process.exit(1);
  }

  // ============================================================
  // 1. Validation du Team Parser
  // ============================================================
  logger.info('🧪 [1/3] Validation du TeamParser...');
  try {
    const rawTeamDetail = JSON.parse(fs.readFileSync(teamDetailPath, 'utf-8'));
    
    // Test Coach Parser
    logger.info('  👉 Parsing du coach...');
    const coachUpsert = TeamParser.parseCoach(rawTeamDetail.coach, rawTeamDetail.team.idcoach);
    console.log(`    ✅ Coach parse : ID = ${coachUpsert.where.id}, Nom = ${coachUpsert.create.name}, Twitch = ${coachUpsert.create.twitch}`);

    // Test Team Parser
    logger.info('  👉 Parsing de l\'équipe...');
    const teamUpsert = TeamParser.parseTeam(rawTeamDetail);
    console.log(`    ✅ Équipe parsée : ID = ${teamUpsert.where.id}, Nom = ${teamUpsert.create.name}, RaceID = ${teamUpsert.create.raceId}, Rerolls = ${teamUpsert.create.rerolls}`);

    // Test Players Parser
    logger.info(`  👉 Parsing du roster (${rawTeamDetail.roster?.length || 0} joueurs)...`);
    const players = rawTeamDetail.roster || [];
    if (players.length > 0) {
      const playerUpsert = TeamParser.parsePlayer(players[0], rawTeamDetail.team.id, 'test-match-id');
      console.log(`    ✅ Premier joueur parse : ID = ${playerUpsert.where.id}, Nom = ${playerUpsert.create.name}, Positional = ${playerUpsert.create.type}, Niveau = ${playerUpsert.create.level}`);
      console.log(`       Stats physiques : MA = ${playerUpsert.create.ma}, ST = ${playerUpsert.create.st}, AG = ${playerUpsert.create.ag}, PA = ${playerUpsert.create.pa}, AV = ${playerUpsert.create.av}`);
      console.log(`       Compétences innées (${(playerUpsert.create.innateSkills as string[])?.length || 0}) :`, playerUpsert.create.innateSkills);
    }
    logger.info('✅ TeamParser validé avec succès !');
  } catch (err: any) {
    logger.error(`❌ Échec de validation du TeamParser : ${err.message}`);
    console.error(err);
  }

  console.log('');

  // ============================================================
  // 2. Validation du Match Parser
  // ============================================================
  logger.info('🧪 [2/3] Validation du MatchParser...');
  try {
    const rawMatchDetail = JSON.parse(fs.readFileSync(matchDetailPath, 'utf-8'));

    // Test Match Parser
    logger.info('  👉 Parsing du match global...');
    const matchUpsert = MatchParser.parseMatch(rawMatchDetail);
    console.log(`    ✅ Match parsé : ID = ${matchUpsert.where.id}, Date = ${matchUpsert.create.startedAt}, Journée = ${matchUpsert.create.round}`);
    console.log(`       Score : ${matchUpsert.create.homeScore} - ${matchUpsert.create.awayScore}`);

    // Test Player Match Stats & Life Updates
    logger.info('  👉 Parsing des feuilles de statistiques individuelles...');
    const firstRoster = rawMatchDetail.match.teams[0].roster || [];
    if (firstRoster.length > 0) {
      const firstPlayer = firstRoster[0];
      const stats = MatchParser.parsePlayerMatchStats(firstPlayer, rawMatchDetail.match.id, rawMatchDetail.match.teams[0].idteamlisting);
      console.log(`    ✅ Stats de match parsées pour le joueur ${firstPlayer.name} (${firstPlayer.type}) :`);
      console.log(`       Joué = ${stats.matchPlayed}, MVP = ${stats.mvp}, XP gagné = ${stats.xpGained}`);
      console.log(`       Blocages réussis = ${stats.blocksSucceeded}, Touchdowns = ${stats.touchdowns}`);
      console.log(`       Nouvelle blessure subie lors de ce match :`, stats.newCasualties);

      const lifeUpdate = MatchParser.preparePlayerLifeUpdate(firstPlayer, rawMatchDetail.match.teams[0].idteamlisting, rawMatchDetail.match.id);
      console.log(`    ✅ Préparation de la mise à jour de vie du joueur :`);
      console.log(`       Niveau = ${lifeUpdate.data.level}, Compétences innées = ${(lifeUpdate.data.innateSkills as string[])?.length || 0}`);
    }
    logger.info('✅ MatchParser validé avec succès !');
  } catch (err: any) {
    logger.error(`❌ Échec de validation du MatchParser : ${err.message}`);
    console.error(err);
  }

  console.log('');

  // ============================================================
  // 3. Validation de l'intégrité globale du modèle
  // ============================================================
  logger.info('🧪 [3/3] Validation du LeagueParser...');
  try {
    const leaguesSamplePath = path.join(docsDir, 'sample-leagues.json');
    if (fs.existsSync(leaguesSamplePath)) {
      const rawLeagues = JSON.parse(fs.readFileSync(leaguesSamplePath, 'utf-8'));
      const leagues = rawLeagues.leagues || [];
      if (leagues.length > 0) {
        const leagueUpsert = LeagueParser.parseLeague(leagues[0]);
        console.log(`    ✅ Ligue parsée : ID = ${leagueUpsert.where.id}, Nom = ${leagueUpsert.create.name}, Coachs = ${leagueUpsert.create.gamerCount}`);
      }
    }
    logger.info('✅ LeagueParser validé avec succès !');
  } catch (err: any) {
    logger.error(`❌ Échec de validation du LeagueParser : ${err.message}`);
    console.error(err);
  }

  logger.info('🎉 Fin des validations unitaires des parseurs de données !');
}

main();
