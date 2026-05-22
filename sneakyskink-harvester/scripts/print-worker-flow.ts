import fs from 'fs';
import readline from 'readline';

async function main() {
  const fileStream = fs.createReadStream('logs/harvester.log');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const lines: string[] = [];
  let foundLastStart = false;

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      if (data.msg && data.msg.includes('Bootstrap de l\'application') || data.msg && data.msg.includes('🚀 Démarrage du démon')) {
        lines.length = 0;
        foundLastStart = true;
      }
      if (foundLastStart && data.msg && (data.msg.includes('Traitement du job') || data.msg.includes('démarré') || data.msg.includes('a échoué') || data.msg.includes('complété') || data.msg.includes('erreur') || data.msg.includes('inséré') || data.msg.includes('mise à jour') || data.msg.includes('importé'))) {
        const formattedTime = new Date(data.time).toISOString();
        lines.push(`[${formattedTime}] ${data.msg}`);
      }
    } catch (e) {
      // Ignorer
    }
  }

  console.log(`--- DÉROULEMENT DU WORKER DEPUIS BOOT (${lines.length} lignes) ---`);
  lines.forEach(l => console.log(l));
}

main();
