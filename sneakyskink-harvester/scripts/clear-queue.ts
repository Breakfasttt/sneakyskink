/**
 * Script pour vider la file d'attente BullMQ dans Redis
 */

import { harvesterQueue } from '../src/queue/queue.js';
import { prisma } from '../src/database/client.js';
import { redisConnection } from '../src/queue/connection.js';

async function main() {
  console.log('🧹 [Queue] Connexion à Redis...');
  await redisConnection.ping();
  
  console.log('🧹 [Queue] Vidage de la file d\'attente...');
  // Drain removes all jobs waiting or delayed, obliterate completely resets the queue
  await harvesterQueue.obliterate({ force: true });
  console.log('✅ [Queue] File d\'attente vidée avec succès !');

  await prisma.$disconnect();
  await redisConnection.quit();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
