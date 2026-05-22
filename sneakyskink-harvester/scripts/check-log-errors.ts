import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('logs/harvester.log');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const errors: any[] = [];
  const warnings: any[] = [];
  const starts: any[] = [];
  const dbMsgs: any[] = [];

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      if (data.msg && data.msg.includes('démarrage') || data.msg && data.msg.includes('Démarrage') || data.msg && data.msg.includes('operational') || data.msg && data.msg.includes('opérationnel')) {
        starts.push(data);
      }
      if (data.level >= 50) {
        errors.push(data);
      } else if (data.level === 40) {
        warnings.push(data);
      }
      if (data.msg && data.msg.includes('[DB]') || data.msg && data.msg.includes('[Database]')) {
        dbMsgs.push(data);
      }
    } catch (e) {
      // Ignorer
    }
  }

  console.log('--- DERNIERS DÉMARRAGES ---');
  starts.slice(-5).forEach(s => console.log(`[${new Date(s.time).toISOString()}] ${s.msg}`));

  console.log('\n--- DERNIERS MESSAGES DB/DATABASE ---');
  dbMsgs.slice(-10).forEach(s => console.log(`[${new Date(s.time).toISOString()}] ${s.msg}`));

  console.log('\n--- DERNIERS WARNINGS ---');
  warnings.slice(-5).forEach(w => console.log(`[${new Date(w.time).toISOString()}] ${w.msg}`));

  console.log('\n--- DERNIÈRES ERREURS ---');
  errors.slice(-5).forEach(e => console.log(`[${new Date(e.time).toISOString()}] ${e.msg}`));
}

main();
