import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('logs/harvester.log');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const starts: any[] = [];

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      if (data.msg && (data.msg.includes('Bootstrap de l\'application') || data.msg.includes('🚀 Démarrage du démon'))) {
        starts.push({ time: new Date(data.time).toISOString(), msg: data.msg });
      }
    } catch (e) {
      // Ignorer
    }
  }

  console.log('--- TOUS LES DÉMARRAGES ENREGISTRÉS ---');
  starts.forEach(s => console.log(`[${s.time}] ${s.msg}`));
}

main();
