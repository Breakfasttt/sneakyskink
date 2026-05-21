import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('📡 Fetching extra/remaining endpoints...');
  const apiKey = process.env.BB3_API_KEY;
  if (!apiKey) {
    console.error('No API key found in .env');
    process.exit(1);
  }

  const outputDir = path.join(__dirname, '../docs/all-endpoints-samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const savePayload = (name: string, data: any) => {
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Saved: docs/all-endpoints-samples/${name}.json`);
  };

  const headers = { 'Accept-Encoding': 'gzip, deflate, br' };

  // 1. gamecount
  try {
    const url = `https://web.cyanide-studio.com/ws/bb3/gamecount/?key=${apiKey}&bb=3`;
    console.log('Querying gamecount...');
    const res = await axios.get(url, { headers });
    savePayload('gamecount', res.data);
  } catch (err: any) {
    console.error(`Failed gamecount: ${err.message}`);
  }

  // 2. gamestats
  try {
    const url = `https://web.cyanide-studio.com/ws/bb3/gamestats/?key=${apiKey}&bb=3&competitionId=50000000-0000-0000-0000-000000000052`;
    console.log('Querying gamestats...');
    const res = await axios.get(url, { headers });
    savePayload('gamestats', res.data);
  } catch (err: any) {
    console.error(`Failed gamestats: ${err.message}`);
  }

  // 3. sprintranking
  try {
    const url = `https://web.cyanide-studio.com/ws/bb3/sprintranking/?key=${apiKey}&bb=3&competition_id=50000000-0000-0000-0000-000000000052&match_threshold=20`;
    console.log('Querying sprintranking...');
    const res = await axios.get(url, { headers });
    savePayload('sprintranking', res.data);
  } catch (err: any) {
    console.error(`Failed sprintranking: ${err.message}`);
  }

  // 4. stats
  try {
    // let's try with stat=global
    const url = `https://web.cyanide-studio.com/ws/bb3/stats/?key=${apiKey}&bb=3&stat=global`;
    console.log('Querying stats (stat=global)...');
    const res = await axios.get(url, { headers });
    savePayload('stats-global', res.data);
  } catch (err: any) {
    console.error(`Failed stats: ${err.message}`);
  }

  // 5. rss
  try {
    const url = `https://web.cyanide-studio.com/ws/bb3/rss/?key=${apiKey}&bb=3`;
    console.log('Querying rss...');
    const res = await axios.get(url, { headers });
    savePayload('rss', res.data);
  } catch (err: any) {
    console.error(`Failed rss: ${err.message}`);
  }

  // 6. welcome
  try {
    const url = `https://web.cyanide-studio.com/ws/cya/welcome/?key=${apiKey}&bb=3`;
    console.log('Querying welcome...');
    const res = await axios.get(url, { headers });
    savePayload('welcome', res.data);
  } catch (err: any) {
    console.error(`Failed welcome: ${err.message}`);
  }

  console.log('🎉 Done fetching extra endpoints!');
}

main();
