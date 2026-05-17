import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testApiCall() {
  console.log('\n======================================================');
  console.log('       SNEAKYSKINK - TEST D\'APPELS API BB3');
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

  // 1. Tester l'endpoint 'leagues'
  try {
    const urlLeagues = `https://web.cyanide-studio.com/ws/bb3/leagues/?key=${apiKey}&bb=3&limit=1`;
    console.log(`📡 Appel : leagues (limit = 1)...`);
    const resLeagues = await axios.get(urlLeagues);
    
    const leaguesPath = path.join(docsDir, 'sample-leagues.json');
    fs.writeFileSync(leaguesPath, JSON.stringify(resLeagues.data, null, 2), 'utf-8');
    console.log(`✅ leagues récupéré et sauvegardé dans : docs/sample-leagues.json`);
  } catch (err: any) {
    console.error(`❌ Échec de l'appel leagues : ${err.message}`);
  }

  // 2. Tester l'endpoint 'competitions'
  try {
    const urlCompetitions = `https://web.cyanide-studio.com/ws/bb3/competitions/?key=${apiKey}&bb=3&limit=1`;
    console.log(`📡 Appel : competitions (limit = 1)...`);
    const resCompetitions = await axios.get(urlCompetitions);
    
    const competitionsPath = path.join(docsDir, 'sample-competitions.json');
    fs.writeFileSync(competitionsPath, JSON.stringify(resCompetitions.data, null, 2), 'utf-8');
    console.log(`✅ competitions récupéré et sauvegardé dans : docs/sample-competitions.json`);
  } catch (err: any) {
    console.error(`❌ Échec de l'appel competitions : ${err.message}`);
  }

  // 3. Tester l'endpoint 'rules' pour voir les skills
  try {
    const urlRules = `https://web.cyanide-studio.com/ws/bb3/rules/?key=${apiKey}&bb=3&rule=skills`;
    console.log(`📡 Appel : rules (rule = skills)...`);
    const resRules = await axios.get(urlRules);
    
    const rulesPath = path.join(docsDir, 'sample-rules-skills.json');
    fs.writeFileSync(rulesPath, JSON.stringify(resRules.data, null, 2), 'utf-8');
    console.log(`✅ rules (skills) récupéré et sauvegardé dans : docs/sample-rules-skills.json`);
  } catch (err: any) {
    console.error(`❌ Échec de l'appel rules : ${err.message}`);
  }

  console.log('\n======================================================\n');
}

testApiCall();
