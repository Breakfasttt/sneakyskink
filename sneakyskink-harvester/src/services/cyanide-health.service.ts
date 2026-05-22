/**
 * Commentaires en-tête : Service de surveillance de la santé de l'API de Cyanide.
 * Gère la mise en pause et la reprise du worker, l'état dans Redis et le test toutes les 15 minutes.
 */

import { redisConnection } from '../queue/connection.js';
import { bb3ApiClient } from './bb3-api-client.js';
import { logger } from '../utils/logger.js';
import { ConsoleDashboard } from '../utils/dashboard.js';

export class CyanideHealthService {
  private worker: any = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
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
    const isCurrentlyAvailable = availableVal !== 'false';

    if (!isCurrentlyAvailable) {
      logger.warn('⚠️ [CyanideHealth] L\'API Cyanide était marquée indisponible lors du dernier arrêt. Application de la pause...');
      await this.pauseHarvester('Restauration du statut indisponible au démarrage.');
    } else {
      // S'assurer que le statut est bien synchronisé
      await redisConnection.set(CyanideHealthService.REDIS_KEY, 'true');
    }

    // Toujours démarrer le scheduler de vérification périodique de 15 minutes
    this.startPeriodicCheck();
  }

  /**
   * Indique si l'API est actuellement marquée disponible.
   */
  public async isApiAvailable(): Promise<boolean> {
    const val = await redisConnection.get(CyanideHealthService.REDIS_KEY);
    return val !== 'false';
  }

  /**
   * Met en pause le Harvester (Worker BullMQ + statut Redis).
   */
  public async pauseHarvester(reason: string): Promise<void> {
    const now = Date.now();
    logger.warn(`🚨 [CyanideHealth] Mise en pause du Harvester. Raison : ${reason}`);
    
    // 1. Mettre à jour Redis
    await redisConnection.set(CyanideHealthService.REDIS_KEY, 'false');
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

    ConsoleDashboard.addAlert('ERROR', `API Cyanide indisponible ! Harvester mis en pause.`);
    ConsoleDashboard.updateStatus('worker', 'PAUSED');
  }

  /**
   * Reprend le Harvester (Worker BullMQ + statut Redis).
   */
  public async resumeHarvester(): Promise<void> {
    logger.info('✅ [CyanideHealth] Rétablissement de l\'API Cyanide. Reprise du Harvester...');

    // 1. Mettre à jour Redis
    await redisConnection.set(CyanideHealthService.REDIS_KEY, 'true');
    await redisConnection.del(CyanideHealthService.REDIS_SINCE_KEY);

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
    const isHealthy = await bb3ApiClient.checkApiAvailability();
    if (!isHealthy) {
      await this.pauseHarvester(`Échec de la requête de test général. Erreur d'origine: ${errorMsg}`);
    } else {
      logger.info(`🔍 [CyanideHealth] Diagnostic : L'API générale répond correctement. L'échec précédent était probablement local ou temporaire.`);
    }
  }

  /**
   * Démarre la vérification périodique toutes les 15 minutes.
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Tester l'API toutes les 15 minutes
    this.checkInterval = setInterval(async () => {
      logger.info('⏰ [CyanideHealth] Cycle de vérification automatique de la santé de l\'API...');
      
      const isCurrentlyAvailable = await this.isApiAvailable();
      const isHealthy = await bb3ApiClient.checkApiAvailability();

      if (!isCurrentlyAvailable && isHealthy) {
        // L'API était indisponible mais est revenue à la vie
        await this.resumeHarvester();
      } else if (isCurrentlyAvailable && !isHealthy) {
        // L'API était disponible mais vient de tomber en panne
        await this.pauseHarvester('Vérification automatique périodique en échec.');
      } else {
        logger.info(`⏰ [CyanideHealth] Santé de l'API stable (Disponible: ${isCurrentlyAvailable}, Test de connexion: ${isHealthy ? 'OK' : 'KO'})`);
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
