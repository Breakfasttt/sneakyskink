import axios from 'axios';
import * as dotenv from 'dotenv';
import { prisma } from '../src/database/client.js';

dotenv.config();

async function run() {
  const apiKey = process.env.BB3_API_KEY;
  console.log('API Key:', apiKey ? 'FOUND' : 'MISSING');

  // Trouver une compétition qui a des matchs en base
  await prisma.$connect();
  const matchSample = await prisma.match.findFirst({
    select: { competitionId: true }
  });

  if (!matchSample) {
    console.log('Aucun match en base locale, recherche classique d\'une compétition...');
  }

  const compId = matchSample?.competitionId;
  const comp = compId
    ? await prisma.competition.findUnique({ where: { id: compId }, select: { id: true, name: true } })
    : await prisma.competition.findFirst({ select: { id: true, name: true } });

  if (!comp) {
    console.log('Aucune compétition en base locale.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Compétition choisie : ${comp.name} (${comp.id})`);


  // Appel sans start
  const url1 = `https://web.cyanide-studio.com/ws/bb3/matches/?key=${apiKey}&bb=3&competition_id=${comp.id}&limit=5`;
  const res1 = await axios.get(url1);
  const m1 = res1.data.matches || [];
  console.log('\nAppel sans start (limit=5) :');
  m1.forEach((m: any, idx: number) => {
    console.log(`[${idx}] Match ID: ${m.id || m.uuid}, Date: ${m.started || m.match_date || m.date}`);
  });

  // Appel avec limit=5,5
  const url2 = `https://web.cyanide-studio.com/ws/bb3/matches/?key=${apiKey}&bb=3&competition_id=${comp.id}&limit=5,5`;
  const res2 = await axios.get(url2);
  const m2 = res2.data.matches || [];
  console.log('\nAppel avec limit=5,5 (offset=5) :');
  m2.forEach((m: any, idx: number) => {
    console.log(`[${idx}] Match ID: ${m.id || m.uuid}, Date: ${m.started || m.match_date || m.date}`);
  });

  await prisma.$disconnect();
}

run().catch(console.error);
