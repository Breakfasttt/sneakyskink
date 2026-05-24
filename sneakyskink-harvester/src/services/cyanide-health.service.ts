/**
 * Service de surveillance de la santé de l'API de Cyanide.
 * Gère la mise en pause et la reprise du worker, l'état dans Redis et le test toutes les heures.
 */

import { redisConnection } from '../queue/connection.js';
import { bb3ApiClient } from './bb3-api-client.js';
import { apiKeyManager } from './api-key-manager.js';
import { logger } from '../utils/logger.js';
import { ConsoleDashboard } from '../utils/dashboard.js';

export class CyanideHealthService {
  private worker: any = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private subConnection: any = null;
  private static readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 heure (60 minutes)
  private static readonly REDIS_KEY = 'sneakyskink:cyanide_api:available';
  private static readonly REDIS_SINCE_KEY = 'sneakyskink:cyanide_api:unavailable_since';

  /**
   * Associe le worker BullMQ à ce service pour pouvoir le suspendre/reprendre.
   */
  public setWorker(worker: any): void {
    this.worker = worker;
  }

  /**
   * Initialise le service de santé au démarrage.
   * Vérifie le statut enregistré dans Redis et applique la pause si nécessaire.
   */
  public async initialize(): Promise<void> {
    logger.info('🔌 [CyanideHealth] Initialisation du service de surveillance...');
    
    // Enregistrer le gestionnaire de panne dans le client API
    bb3ApiClient.setFailureHandler((msg) => {
      this.handleApiFailure(msg).catch(err => {
        logger.error(`❌ [CyanideHealth] Échec du traitement de la panne API : ${err.message}`);
      });
    });

    // Écouter les commandes d'administration Redis
    this.listenToCommands().catch(err => {
      logger.error(`❌ [CyanideHealth] Échec abonnement commandes: ${err.message}`);
    });

    // Lire le statut en cache
    const availableVal = await redisConnection.get(CyanideHealthService.REDIS_KEY);
    const isCurrentlyAvailable = availableVal === 'OK' || availableVal === 'true' || availableVal === null || availableVal === undefined;

    if (!isCurrentlyAvailable) {
      logger.warn('⚠️ [CyanideHealth] L\'API Cyanide était marquée indisponible lors du dernier arrêt. Application de la pause...');
      const oldStatus = (availableVal === 'false' || availableVal === 'DOWN') ? 'DOWN' : 'QUOTA_EXCEEDED';
      ConsoleDashboard.setApiStatus(oldStatus);
      await this.pauseHarvester('Restauration du statut indisponible au démarrage.', oldStatus);
    } else {
      // S'assurer que le statut est bien synchronisé
      await redisConnection.set(CyanideHealthService.REDIS_KEY, 'OK');
      ConsoleDashboard.setApiStatus('OK');
    }

    // Toujours démarrer le scheduler de vérification périodique d'une heure
    this.startPeriodicCheck();
  }

  /**
   * Indique si l'API est actuellement marquée disponible.
   */
  public async isApiAvailable(): Promise<boolean> {
    const val = await redisConnection.get(CyanideHealthService.REDIS_KEY);
    return val === 'OK' || val === 'true' || val === null || val === undefined;
  }

  /**
   * Met en pause le Harvester (Worker BullMQ + statut Redis).
   */
  public async pauseHarvester(reason: string, status: 'QUOTA_EXCEEDED' | 'DOWN'): Promise<void> {
    const now = Date.now();
    logger.warn(`🚨 [CyanideHealth] Mise en pause du Harvester. Raison : ${reason} (Statut: ${status})`);
    
    // 1. Mettre à jour Redis
    await redisConnection.set(CyanideHealthService.REDIS_KEY, status);
    const existingSince = await redisConnection.get(CyanideHealthService.REDIS_SINCE_KEY);
    if (!existingSince) {
      await redisConnection.set(CyanideHealthService.REDIS_SINCE_KEY, new Date(now).toISOString());
    }

    // Mettre à jour le dashboard
    ConsoleDashboard.setApiStatus(status);

    // 2. Mettre en pause le worker BullMQ
    if (this.worker) {
      try {
        await this.worker.pause();
        logger.info('⚙️ [Worker] Worker mis en pause avec succès.');
      } catch (err: any) {
        logger.error(`❌ [CyanideHealth] Échec de la mise en pause du worker : ${err.message}`);
      }
    }

    ConsoleDashboard.addAlert('ERROR', `API Cyanide indisponible (${status}) ! Harvester mis en pause.`);
    ConsoleDashboard.updateStatus('worker', 'PAUSED');
  }

  /**
   * Reprend le Harvester (Worker BullMQ + statut Redis).
   */
  public async resumeHarvester(): Promise<void> {
    logger.info('✅ [CyanideHealth] Rétablissement de l\'API Cyanide. Reprise du Harvester...');

    // 1. Mettre à jour Redis
    await redisConnection.set(CyanideHealthService.REDIS_KEY, 'OK');
    await redisConnection.del(CyanideHealthService.REDIS_SINCE_KEY);

    // Mettre à jour le dashboard
    ConsoleDashboard.setApiStatus('OK');

    // 1.5. Réinitialiser les quotas car l'API est à nouveau disponible
    try {
      await apiKeyManager.resetAllQuotas();
    } catch (err: any) {
      logger.error(`❌ [CyanideHealth] Échec de la réinitialisation des quotas : ${err.message}`);
    }

    // 2. Reprendre le worker BullMQ
    if (this.worker) {
      try {
        await this.worker.resume();
        logger.info('⚙️ [Worker] Worker réactivé avec succès.');
      } catch (err: any) {
        logger.error(`❌ [CyanideHealth] Échec de la reprise du worker : ${err.message}`);
      }
    }

    ConsoleDashboard.addAlert('WARN', `API Cyanide rétablie. Reprise du Harvester.`);
    ConsoleDashboard.updateStatus('worker', 'IDLE');
  }

  /**
   * Analyse et réagit à un échec potentiel de l'API.
   * Si la santé de l'API est effectivement mauvaise, met en pause.
   */
  public async handleApiFailure(errorMsg: string): Promise<void> {
    // Si l'API est déjà en pause, inutile de refaire le diagnostic
    const alreadyPaused = !(await this.isApiAvailable());
    if (alreadyPaused) return;

    logger.info('🔍 [CyanideHealth] Échec détecté sur une requête. Lancement du diagnostic de santé de l\'API...');
    
    // Faire un appel de test sur le endpoint status
    const status = await bb3ApiClient.checkApiAvailability();
    if (status !== 'OK') {
      await this.pauseHarvester(`Échec de la requête de test général. Erreur d'origine: ${errorMsg}`, status);
    } else {
      logger.info(`🔍 [CyanideHealth] Diagnostic : L'API générale répond correctement. L'échec précédent était probablement local ou temporaire.`);
    }
  }

  /**
   * Démarre la vérification périodique toutes les heures.
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    const updateNextCheckRedis = async () => {
      const nextCheck = Date.now() + CyanideHealthService.CHECK_INTERVAL_MS;
      try {
        await redisConnection.set('sneakyskink:cyanide_api:next_check', nextCheck.toString());
        ConsoleDashboard.setNextHealthCheckTime(nextCheck);
      } catch (err: any) {
        logger.warn(`⚠️ [CyanideHealth] Impossible d'écrire next_check dans Redis: ${err.message}`);
      }
    };

    // Initialiser le prochain check dans Redis au démarrage
    updateNextCheckRedis();

    // Tester l'API toutes les heures
    this.checkInterval = setInterval(async () => {
      logger.info('⏰ [CyanideHealth] Cycle de vérification automatique de la santé de l\'API...');
      
      // Mettre à jour le prochain check dans Redis pour le cycle suivant
      await updateNextCheckRedis();

      const isCurrentlyAvailable = await this.isApiAvailable();
      const status = await bb3ApiClient.checkApiAvailability();

      if (!isCurrentlyAvailable && status === 'OK') {
        // L'API était indisponible mais est revenue à la vie
        await this.resumeHarvester();
      } else if (isCurrentlyAvailable && status !== 'OK') {
        // L'API était disponible mais vient de tomber en panne
        await this.pauseHarvester('Vérification automatique périodique en échec.', status);
      } else {
        logger.info(`⏰ [CyanideHealth] Santé de l'API stable (Disponible: ${isCurrentlyAvailable}, Statut actuel: ${status})`);
      }
    }, CyanideHealthService.CHECK_INTERVAL_MS);
    
    // Rendre l'intervalle non bloquant pour le process Node
    this.checkInterval.unref();
  }

  /**
   * Force un diagnostic immédiat et une éventuelle remise en route du Harvester.
   */
  public async forceHealthCheck(): Promise<'OK' | 'QUOTA_EXCEEDED' | 'DOWN'> {
    logger.info('⚡ [CyanideHealth] Diagnostic forcé de la santé de l\'API...');
    
    ConsoleDashboard.setActivity('Diagnostic de santé forcé...');

    const isCurrentlyAvailable = await this.isApiAvailable();
    const status = await bb3ApiClient.checkApiAvailability();

    if (status === 'OK') {
      if (!isCurrentlyAvailable) {
        await this.resumeHarvester();
      }
      logger.info('✅ [CyanideHealth] Diagnostic forcé : API en ligne.');
    } else {
      if (isCurrentlyAvailable) {
        await this.pauseHarvester('Diagnostic forcé en échec.', status);
      }
      logger.warn(`❌ [CyanideHealth] Diagnostic forcé : API indisponible (${status}).`);
    }

    // Réinitialiser le timer d'une heure
    this.startPeriodicCheck();

    return status;
  }

  /**
   * S'abonne aux commandes d'administration Redis Pub/Sub.
   */
  private async listenToCommands(): Promise<void> {
    const { env } = await import('../config/environment.js');
    const { Redis } = await import('ioredis');

    try {
      this.subConnection = new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password,
      });

      this.subConnection.on('error', (err: any) => {
        logger.error(`❌ [CyanideHealth] Erreur de connexion Redis Sub: ${err.message}`);
      });

      await this.subConnection.subscribe('sneakyskink:cyanide_api:commands');
      logger.info('🔑 [CyanideHealth] Abonné aux commandes Redis sur "sneakyskink:cyanide_api:commands"');

      this.subConnection.on('message', async (channel: string, message: string) => {
        if (channel === 'sneakyskink:cyanide_api:commands' && message === 'force-check') {
          try {
            await this.forceHealthCheck();
          } catch (err: any) {
            logger.error(`❌ [CyanideHealth] Erreur lors du check forcé : ${err.message}`);
          }
        }
      });
    } catch (err: any) {
      logger.error(`❌ [CyanideHealth] Échec d'initialisation de l'abonnement : ${err.message}`);
    }
  }

  /**
   * Nettoie les ressources (principalement pour les tests ou shutdowns).
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this.subConnection) {
      this.subConnection.quit().catch(() => {});
      this.subConnection = null;
    }
  }
}

export const cyanideHealthService = new CyanideHealthService();
export default cyanideHealthService;
