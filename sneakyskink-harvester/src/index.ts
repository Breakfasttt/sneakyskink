import { prisma } from './database/client.js';
import { redisConnection, harvesterWorker, initScheduler } from './queue/index.js';
import { logger } from './utils/logger.js';
import { ConsoleDashboard } from './utils/dashboard.js';
import { apiKeyManager } from './services/api-key-manager.js';
import { cyanideHealthService } from './services/cyanide-health.service.js';

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

    // Récupérer le dernier élément inséré dans la base de données pour l'afficher sur le dashboard
    try {
      const [lastMatch, lastTeam, lastComp, lastLeague, lastCoach] = await Promise.all([
        prisma.match.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, id: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } }, homeScore: true, awayScore: true } }),
        prisma.team.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, id: true, name: true } }),
        prisma.competition.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, id: true, name: true, status: true } }),
        prisma.league.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, id: true, name: true } }),
        prisma.coach.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true, id: true, name: true } })
      ]);

      const candidates = [
        { type: 'Match', date: lastMatch?.createdAt, details: lastMatch ? `ID: ${lastMatch.id} - ${lastMatch.homeTeam?.name || 'Inconnu'} vs ${lastMatch.awayTeam?.name || 'Inconnu'} (${lastMatch.homeScore}-${lastMatch.awayScore})` : '' },
        { type: 'Équipe', date: lastTeam?.createdAt, details: lastTeam ? `Nom: "${lastTeam.name}" (${lastTeam.id})` : '' },
        { type: 'Compétition', date: lastComp?.createdAt, details: lastComp ? `Nom: "${lastComp.name}" (${lastComp.id}) - Statut: ${lastComp.status}` : '' },
        { type: 'Ligue', date: lastLeague?.createdAt, details: lastLeague ? `Nom: "${lastLeague.name}" (${lastLeague.id})` : '' },
        { type: 'Coach', date: lastCoach?.createdAt, details: lastCoach ? `Nom: "${lastCoach.name}" (${lastCoach.id})` : '' }
      ].filter(c => c.date);

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.date!.getTime() - a.date!.getTime());
        const latest = candidates[0];
        ConsoleDashboard.setLastInserted(latest.type, latest.details);
      }
    } catch (e: any) {
      logger.warn(`⚠️ [Database] Impossible d'initialiser le dernier élément inséré : ${e.message}`);
    }

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
    
    // 3.5. Démarrer le worker manuellement en arrière-plan pour ne pas bloquer le bootstrap
    harvesterWorker.run().catch((err: any) => {
      logger.error(`❌ [Worker] Erreur fatale du worker : ${err.message}`);
      ConsoleDashboard.addAlert('FATAL', `Worker crash: ${err.message}`);
    });
    ConsoleDashboard.updateStatus('worker', 'IDLE');
    logger.info('✅ [Worker] Worker démarré et à l\'écoute des jobs.');

    // 3.6. Initialiser le service de santé de l'API de Cyanide
    cyanideHealthService.setWorker(harvesterWorker);
    await cyanideHealthService.initialize();

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
