import { bb3ApiClient } from '../src/services/bb3-api-client.js';
import { logger } from '../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  logger.info('🏁 Démarrage du script d\'exploration exhaustive des endpoints...');

  const outputDir = path.join(__dirname, '../docs/all-endpoints-samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Identifiants par défaut pour les requêtes ciblées
  const defaultLeagueId = '50000000-0000-0000-0000-000000000025'; // Official League par défaut
  let discoveredLeagueName = 'Official League';
  let discoveredCompetitionId = '';
  let discoveredCompetitionName = '';
  let discoveredTeamId = '';
  let discoveredTeamName = '';
  let discoveredCoachId = '';
  let discoveredCoachName = '';
  let discoveredMatchId = '';

  const savePayload = (name: string, data: any) => {
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    logger.info(`💾 Sauvegardé : docs/all-endpoints-samples/${name}.json`);
  };

  // ============================================================
  // 1. healthcheck (status)
  // ============================================================
  try {
    logger.info('📡 [1/16] Querying endpoint: status...');
    const data = await bb3ApiClient.get('status');
    savePayload('status', data);
  } catch (err: any) {
    logger.error(`❌ Échec status : ${err.message}`);
  }

  // ============================================================
  // 2. leagues (List)
  // ============================================================
  try {
    logger.info('📡 [2/16] Querying endpoint: leagues...');
    const data = await bb3ApiClient.get('leagues', { limit: 5 });
    savePayload('leagues', data);
    
    const leagues = data.leagues || [];
    if (leagues.length > 0) {
      discoveredLeagueName = leagues[0].name;
    }
  } catch (err: any) {
    logger.error(`❌ Échec leagues : ${err.message}`);
  }

  // ============================================================
  // 3. league (Detail)
  // ============================================================
  try {
    logger.info(`📡 [3/16] Querying endpoint: league (${defaultLeagueId})...`);
    const data = await bb3ApiClient.get('league', { id: defaultLeagueId });
    savePayload('league', data);
  } catch (err: any) {
    logger.error(`❌ Échec league : ${err.message}`);
  }

  // ============================================================
  // 4. competitions (List)
  // ============================================================
  try {
    logger.info(`📡 [4/16] Querying endpoint: competitions pour la ligue [${discoveredLeagueName}]...`);
    const data = await bb3ApiClient.get('competitions', { league_id: defaultLeagueId, limit: 5 });
    savePayload('competitions', data);
    
    const comps = data.competitions || [];
    if (comps.length > 0) {
      discoveredCompetitionId = comps[0].id;
      discoveredCompetitionName = comps[0].name;
      logger.info(`🎯 Découverte compétition active : ID = ${discoveredCompetitionId} (${discoveredCompetitionName})`);
    }
  } catch (err: any) {
    logger.error(`❌ Échec competitions : ${err.message}`);
  }

  // ============================================================
  // 5. teams (List)
  // ============================================================
  try {
    logger.info(`📡 [5/16] Querying endpoint: teams pour la ligue [${discoveredLeagueName}]...`);
    const data = await bb3ApiClient.get('teams', { league_id: defaultLeagueId, limit: 5 });
    savePayload('teams', data);
    
    const teams = data.teams || [];
    if (teams.length > 0) {
      discoveredTeamId = teams[0].id;
      discoveredTeamName = teams[0].name;
      logger.info(`🎯 Découverte équipe active : ID = ${discoveredTeamId} (${discoveredTeamName})`);
    }
  } catch (err: any) {
    logger.error(`❌ Échec teams : ${err.message}`);
  }

  // ============================================================
  // 6. coaches (List)
  // ============================================================
  try {
    logger.info(`📡 [6/16] Querying endpoint: coaches pour la ligue [${discoveredLeagueName}]...`);
    const data = await bb3ApiClient.get('coaches', { league_id: defaultLeagueId, limit: 5 });
    savePayload('coaches', data);
    
    const coaches = data.coaches || [];
    if (coaches.length > 0) {
      discoveredCoachId = coaches[0].idcoach || coaches[0].id;
      discoveredCoachName = coaches[0].name;
      logger.info(`🎯 Découverte coach active : ID = ${discoveredCoachId} (${discoveredCoachName})`);
    }
  } catch (err: any) {
    logger.error(`❌ Échec coaches : ${err.message}`);
  }

  // ============================================================
  // 7. contests (List calendar)
  // ============================================================
  if (discoveredCompetitionId) {
    try {
      logger.info(`📡 [7/16] Querying endpoint: contests pour la compétition [${discoveredCompetitionName}]...`);
      // Rechercher les contests Validated ou Played pour récupérer de vrais matchs terminés
      const data = await bb3ApiClient.get('contests', {
        league_id: defaultLeagueId,
        competition_id: discoveredCompetitionId,
        contest_status: 'Validated',
        limit: 5,
      });
      savePayload('contests', data);
      
      const contests = data.contests || [];
      if (contests.length > 0 && contests[0].match_uuid) {
        discoveredMatchId = contests[0].match_uuid;
        logger.info(`🎯 Découverte match actif : ID = ${discoveredMatchId}`);
      }
    } catch (err: any) {
      logger.error(`❌ Échec contests : ${err.message}`);
    }
  }

  // ============================================================
  // 8. matches (List)
  // ============================================================
  try {
    logger.info(`📡 [8/16] Querying endpoint: matches pour la ligue [${discoveredLeagueName}]...`);
    const data = await bb3ApiClient.get('matches', { league_id: defaultLeagueId, limit: 5 });
    savePayload('matches', data);
    
    const matches = data.matches || [];
    if (!discoveredMatchId && matches.length > 0) {
      discoveredMatchId = matches[0].id;
      logger.info(`🎯 Découverte match actif (via matches) : ID = ${discoveredMatchId}`);
    }
  } catch (err: any) {
    logger.error(`❌ Échec matches : ${err.message}`);
  }

  // ============================================================
  // 9. match (Detail)
  // ============================================================
  if (discoveredMatchId) {
    try {
      logger.info(`📡 [9/16] Querying endpoint: match (${discoveredMatchId}) avec rosters...`);
      const data = await bb3ApiClient.get('match', { id: discoveredMatchId, rosters: 1 });
      savePayload('match-detail', data);
    } catch (err: any) {
      logger.error(`❌ Échec match detail : ${err.message}`);
    }
  }

  // ============================================================
  // 10. team (Detail)
  // ============================================================
  if (discoveredTeamId) {
    try {
      logger.info(`📡 [10/16] Querying endpoint: team (${discoveredTeamId}) complet...`);
      const data = await bb3ApiClient.get('team', {
        id: discoveredTeamId,
        coach: 1,
        roster: 1,
        stats: 1,
        skills: 1,
        casualties: 1,
      });
      savePayload('team-detail', data);
      
      const players = data.roster || [];
      if (players.length > 0) {
        const pId = players[0].id;
        // ============================================================
        // 11. player (Detail unitaire)
        // ============================================================
        try {
          logger.info(`📡 [11/16] Querying endpoint: player (${pId}) unitaire...`);
          const pData = await bb3ApiClient.get('player', { id: pId });
          savePayload('player-detail', pData);
        } catch (err: any) {
          logger.error(`❌ Échec player detail : ${err.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`❌ Échec team detail : ${err.message}`);
    }
  }

  // ============================================================
  // 12. teammatches (List pour une équipe)
  // ============================================================
  if (discoveredTeamId) {
    try {
      logger.info(`📡 [12/16] Querying endpoint: teammatches pour l'équipe [${discoveredTeamName}]...`);
      const data = await bb3ApiClient.get('teammatches', { team: discoveredTeamId, limit: 5 });
      savePayload('teammatches', data);
    } catch (err: any) {
      logger.error(`❌ Échec teammatches : ${err.message}`);
    }
  }

  // ============================================================
  // 13. ladder (Rankings)
  // ============================================================
  if (discoveredCompetitionId) {
    try {
      logger.info(`📡 [13/16] Querying endpoint: ladder pour la compétition [${discoveredCompetitionName}]...`);
      const data = await bb3ApiClient.get('ladder', {
        league_id: defaultLeagueId,
        competition_id: discoveredCompetitionId,
        limit: 10,
      });
      savePayload('ladder-rankings', data);
    } catch (err: any) {
      logger.error(`❌ Échec ladder : ${err.message}`);
    }
  }

  // ============================================================
  // 14. top (Top teams per race)
  // ============================================================
  try {
    logger.info(`📡 [14/16] Querying endpoint: top pour la ligue [${discoveredLeagueName}]...`);
    const data = await bb3ApiClient.get('top', { league_id: defaultLeagueId, limit: 5 });
    savePayload('top-teams', data);
  } catch (err: any) {
    logger.error(`❌ Échec top : ${err.message}`);
  }

  // ============================================================
  // 15. arenafinalscontenders (Playoff teams)
  // ============================================================
  try {
    logger.info('📡 [15/16] Querying endpoint: arenafinalscontenders...');
    const data = await bb3ApiClient.get('arenafinalscontenders', { season: 0 });
    savePayload('arena-finalists', data);
  } catch (err: any) {
    logger.error(`❌ Échec arenafinalscontenders : ${err.message}`);
  }

  // ============================================================
  // 16. lookup (Universal search)
  // ============================================================
  try {
    logger.info(`📡 [16/16] Querying endpoint: lookup pour l'équipe [${discoveredTeamName}]...`);
    const data = await bb3ApiClient.get('lookup', { team_name: discoveredTeamName, exact: 1 });
    savePayload('lookup-result', data);
  } catch (err: any) {
    logger.error(`❌ Échec lookup : ${err.message}`);
  }

  logger.info('🎉 Script d\'exploration exhaustive des endpoints terminé avec succès !');
}

main();
