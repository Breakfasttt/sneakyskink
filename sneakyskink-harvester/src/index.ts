import { prisma } from './database/client.js';
import { redisConnection, harvesterWorker, initScheduler } from './queue/index.js';
import { logger } from './utils/logger.js';
import { ConsoleDashboard } from './utils/dashboard.js';
import { apiKeyManager } from './services/api-key-manager.js';

async function bootstrap() {
  // Lancer le dashboard TUI immédiatement
  ConsoleDashboard.start();
  ConsoleDashboard.setActivity('Bootstrap de l\'application...');
  logger.info('🚀 Démarrage du démon SneakySkink-harvester...');

  try {
    // 1. Tester la connexion à PostgreSQL
    ConsoleDashboard.updateStatus('db', 'CONNECTING');
    logger.info('🔌 [Database] Connexion à PostgreSQL...');
    await prisma.$connect();
    ConsoleDashboard.updateStatus('db', 'OK');
    logger.info('✅ [Database] PostgreSQL connecté avec succès !');

    // 2. Tester la connexion à Redis
    ConsoleDashboard.updateStatus('redis', 'CONNECTING');
    logger.info('🔌 [Redis] Connexion à Redis...');
    await redisConnection.ping();
    ConsoleDashboard.updateStatus('redis', 'OK');
    logger.info('✅ [Redis] Redis connecté avec succès !');

    // 2.5. Restaurer les quotas depuis Redis
    ConsoleDashboard.setActivity('Restauration des quotas API...');
    await apiKeyManager.initialize();

    // 3. Démarrer le Worker BullMQ
    ConsoleDashboard.updateStatus('worker', 'INITIALIZING');
    logger.info('⚙️ [Worker] Démarrage du worker de traitement...');
    
    harvesterWorker.on('active', (job) => {
      ConsoleDashboard.updateStatus('worker', 'RUNNING');
      ConsoleDashboard.setActivity(`Job ${job.id} [${job.name}] actif`);
      logger.info(`⚡ Job ${job.id} est maintenant actif.`);
    });
    harvesterWorker.on('completed', (job) => {
      ConsoleDashboard.updateStatus('worker', 'IDLE');
      ConsoleDashboard.setActivity('En attente de jobs...');
      logger.info(`✨ Job ${job.id} complété.`);
    });
    harvesterWorker.on('failed', (job, err) => {
      ConsoleDashboard.updateStatus('worker', 'IDLE');
      ConsoleDashboard.setActivity(`Échec du job ${job?.id}`);
      logger.error(`❌ Job ${job?.id} a échoué avec l'erreur : ${err.message}`);
    });
    
    ConsoleDashboard.updateStatus('worker', 'IDLE');
    logger.info('✅ [Worker] Worker démarré et à l\'écoute des jobs.');

    // 4. Démarrer le Scheduler de synchronisation périodique
    ConsoleDashboard.updateStatus('scheduler', 'INITIALIZING');
    initScheduler();
    ConsoleDashboard.updateStatus('scheduler', 'RUNNING');

    ConsoleDashboard.setActivity('Démon entièrement opérationnel. En attente...');
    logger.info('🎉 SneakySkink-harvester est entièrement opérationnel et prêt à collecter !');

  } catch (err: any) {
    ConsoleDashboard.addAlert('FATAL', `Erreur démarrage: ${err.message}`);
    logger.fatal(`❌ Échec critique lors du démarrage : ${err.message}`);
    ConsoleDashboard.stop();
    process.exit(1);
  }
}

// Gestion de l'arrêt propre (Graceful Shutdown)
async function shutdown(signal: string) {
  logger.info(`🛑 Signal ${signal} reçu. Arrêt propre du démon...`);
  ConsoleDashboard.setActivity(`Arrêt en cours (${signal})...`);

  try {
    // Fermer le worker
    ConsoleDashboard.updateStatus('worker', 'STOPPING');
    logger.info('⚙️ [Worker] Fermeture du worker BullMQ...');
    await harvesterWorker.close();
    ConsoleDashboard.updateStatus('worker', 'STOPPED');
    
    // Fermer la connexion Redis
    ConsoleDashboard.updateStatus('redis', 'STOPPING');
    logger.info('🔌 [Redis] Fermeture de la connexion...');
    await redisConnection.quit();
    ConsoleDashboard.updateStatus('redis', 'STOPPED');

    // Fermer le client Prisma
    ConsoleDashboard.updateStatus('db', 'STOPPING');
    logger.info('🔌 [Database] Fermeture de la connexion...');
    await prisma.$disconnect();
    ConsoleDashboard.updateStatus('db', 'STOPPED');

    ConsoleDashboard.setActivity('Arrêté.');
    ConsoleDashboard.stop();
    logger.info('👋 SneakySkink-harvester s\'est arrêté proprement. À bientôt !');
    process.exit(0);
  } catch (err: any) {
    ConsoleDashboard.addAlert('ERROR', `Échec shutdown: ${err.message}`);
    logger.error(`❌ Erreur lors de l'arrêt propre : ${err.message}`);
    ConsoleDashboard.stop();
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap();

// Triggering reload for Delta match synchronization
