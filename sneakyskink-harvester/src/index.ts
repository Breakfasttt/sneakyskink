import { prisma } from './database/client.js';
import { redisConnection, harvesterWorker, initScheduler } from './queue/index.js';
import { logger } from './utils/logger.js';

const BANNER = `
    ███████╗███╗   ██╗███████╗ █████╗ ██╗  ██╗██╗   ██╗███████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗
    ██╔════╝████╗  ██║██╔════╝██╔══██╗██║ ██╔╝╚██╗ ██╔╝██╔════╝██║ ██╔╝██║████╗  ██║██║ ██╔╝
    ███████╗██╔██╗ ██║█████╗  ███████║█████╔╝  ╚████╔╝ ███████╗█████╔╝ ██║██╔██╗ ██║█████╔╝ 
    ╚════██║██║╚██╗██║██╔══╝  ██╔══██║██╔═██╗   ╚██╔╝  ╚════██║██╔═██╗ ██║██║╚██╗██║██╔═██╗ 
    ███████║██║ ╚████║███████╗██║  ██║██║  ██╗   ██║   ███████║██║  ██╗██║██║ ╚████║██║  ██╗
    ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
                    🦎   S N E A K Y   S K I N K   -   H A R V E S T E R   🦎
`;

async function bootstrap() {
  console.log(BANNER);
  logger.info('🚀 Démarrage du démon SneakySkink-harvester...');

  try {
    // 1. Tester la connexion à PostgreSQL
    logger.info('🔌 [Database] Connexion à PostgreSQL...');
    await prisma.$connect();
    logger.info('✅ [Database] PostgreSQL connecté avec succès !');

    // 2. Tester la connexion à Redis
    logger.info('🔌 [Redis] Connexion à Redis...');
    await redisConnection.ping();
    logger.info('✅ [Redis] Redis connecté avec succès !');

    // 3. Démarrer le Worker BullMQ
    logger.info('⚙️ [Worker] Démarrage du worker de traitement...');
    harvesterWorker.on('active', (job) => {
      logger.info(`⚡ Job ${job.id} est maintenant actif.`);
    });
    harvesterWorker.on('completed', (job) => {
      logger.info(`✨ Job ${job.id} complété.`);
    });
    harvesterWorker.on('failed', (job, err) => {
      logger.error(`❌ Job ${job?.id} a échoué avec l'erreur : ${err.message}`);
    });
    
    // Le worker démarre automatiquement lors de son instanciation
    logger.info('✅ [Worker] Worker démarré et à l\'écoute des jobs.');

    // 4. Démarrer le Scheduler de synchronisation périodique (toutes les 2h)
    initScheduler();

    logger.info('🎉 SneakySkink-harvester est entièrement opérationnel et prêt à collecter !');

  } catch (err: any) {
    logger.fatal(`❌ Échec critique lors du démarrage : ${err.message}`);
    process.exit(1);
  }
}

// Gestion de l'arrêt propre (Graceful Shutdown)
async function shutdown(signal: string) {
  logger.info(`🛑 Signal ${signal} reçu. Arrêt propre du démon...`);

  try {
    // Fermer le worker
    logger.info('⚙️ [Worker] Fermeture du worker BullMQ...');
    await harvesterWorker.close();
    
    // Fermer la connexion Redis
    logger.info('🔌 [Redis] Fermeture de la connexion...');
    await redisConnection.quit();

    // Fermer le client Prisma
    logger.info('🔌 [Database] Fermeture de la connexion...');
    await prisma.$disconnect();

    logger.info('👋 SneakySkink-harvester s\'est arrêté proprement. À bientôt !');
    process.exit(0);
  } catch (err: any) {
    logger.error(`❌ Erreur lors de l'arrêt propre : ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap();
