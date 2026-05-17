import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchSampleEntities() {
  console.log('\n======================================================');
  console.log('    SNEAKYSKINK - RÉCUPÉRATION D\'ENTITÉS MODÈLES BB3');
  console.log('======================================================\n');

  const apiKey = process.env.BB3_API_KEY;

  if (!apiKey || apiKey === 'METTRE_ICI_TA_CLE' || apiKey.trim() === '') {
    console.error('❌ ERREUR : La clé d\'API de Blood Bowl 3 n\'est pas configurée dans le fichier .env !');
    process.exit(1);
  }

  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  let discoveredTeamId: string | null = null;
  let discoveredMatchId: string | null = null;

  // 1. Découverte d'équipes actives (Official League)
  try {
    const urlTeams = `https://web.cyanide-studio.com/ws/bb3/teams/?key=${apiKey}&bb=3&limit=5`;
    console.log(`📡 Découverte d'équipes actives...`);
    const resTeams = await axios.get(urlTeams);
    
    const teams = resTeams.data.teams || [];
    if (teams.length > 0) {
      discoveredTeamId = teams[0].id;
      console.log(`✅ Équipe trouvée : ID = ${discoveredTeamId} (${teams[0].name})`);
    } else {
      console.warn(`⚠️ Aucune équipe trouvée.`);
    }
  } catch (err: any) {
    console.error(`❌ Échec de la découverte des équipes : ${err.message}`);
  }

  // 2. Découverte de matchs récents (Official League)
  try {
    const urlMatches = `https://web.cyanide-studio.com/ws/bb3/matches/?key=${apiKey}&bb=3&limit=5`;
    console.log(`📡 Découverte de matchs récents...`);
    const resMatches = await axios.get(urlMatches);
    
    const matches = resMatches.data.matches || [];
    if (matches.length > 0) {
      discoveredMatchId = matches[0].id;
      console.log(`✅ Match trouvé : ID = ${discoveredMatchId}`);
    } else {
      console.warn(`⚠️ Aucun match trouvé.`);
    }
  } catch (err: any) {
    console.error(`❌ Échec de la découverte des matchs : ${err.message}`);
  }

  // 3. Aspiration des détails complets de l'équipe découverte
  if (discoveredTeamId) {
    try {
      const urlTeamDetail = `https://web.cyanide-studio.com/ws/bb3/team/?key=${apiKey}&bb=3&id=${discoveredTeamId}&coach=1&roster=1&stats=1&skills=1&casualties=1`;
      console.log(`📡 Aspiration des détails de l'équipe ${discoveredTeamId}...`);
      const resTeamDetail = await axios.get(urlTeamDetail);
      
      const teamDetailPath = path.join(docsDir, 'sample-team-detail.json');
      fs.writeFileSync(teamDetailPath, JSON.stringify(resTeamDetail.data, null, 2), 'utf-8');
      console.log(`✅ Détails de l'équipe sauvegardés dans : docs/sample-team-detail.json`);
    } catch (err: any) {
      console.error(`❌ Échec de l'aspiration des détails de l'équipe : ${err.message}`);
    }
  }

  // 4. Aspiration des détails complets du match découvert
  if (discoveredMatchId) {
    try {
      const urlMatchDetail = `https://web.cyanide-studio.com/ws/bb3/match/?key=${apiKey}&bb=3&id=${discoveredMatchId}&rosters=1`;
      console.log(`📡 Aspiration des détails du match ${discoveredMatchId}...`);
      const resMatchDetail = await axios.get(urlMatchDetail);
      
      const matchDetailPath = path.join(docsDir, 'sample-match-detail.json');
      fs.writeFileSync(matchDetailPath, JSON.stringify(resMatchDetail.data, null, 2), 'utf-8');
      console.log(`✅ Détails du match sauvegardés dans : docs/sample-match-detail.json`);
    } catch (err: any) {
      console.error(`❌ Échec de l'aspiration des détails du match : ${err.message}`);
    }
  }

  console.log('\n======================================================\n');
}

fetchSampleEntities();
