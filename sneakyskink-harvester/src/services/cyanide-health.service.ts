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
    
    // Lire le statut en cache
    const availableVal = await redisConnection.get(CyanideHealthService.REDIS_KEY);
    const isCurrentlyAvailable = availableVal === 'OK' || availableVal === 'true' || availableVal === null || availableVal === undefined;

    if (!isCurrentlyAvailable) {
      logger.warn('⚠️ [CyanideHealth] L\'API Cyanide était marquée indisponible lors du dernier arrêt. Application de la pause...');
      const oldStatus = (availableVal === 'false' || availableVal === 'DOWN') ? 'DOWN' : 'QUOTA_EXCEEDED';
      await this.pauseHarvester('Restauration du statut indisponible au démarrage.', oldStatus);
    } else {
      // S'assurer que le statut est bien synchronisé
      await redisConnection.set(CyanideHealthService.REDIS_KEY, 'OK');
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

    // Tester l'API toutes les heures
    this.checkInterval = setInterval(async () => {
      logger.info('⏰ [CyanideHealth] Cycle de vérification automatique de la santé de l\'API...');
      
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
   * Nettoie les ressources (principalement pour les tests ou shutdowns).
   */
  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const cyanideHealthService = new CyanideHealthService();
export default cyanideHealthService;
