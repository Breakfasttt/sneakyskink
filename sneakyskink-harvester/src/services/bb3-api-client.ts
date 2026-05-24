/**
 * Client API de Cyanide pour Blood Bowl 3 avec gestion du Rate Pacing
 * et résilience aux erreurs de quotas.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiKeyManager } from './api-key-manager.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';
import { ConsoleDashboard } from '../utils/dashboard.js';
import { ActivityTracker } from '../utils/activity-tracker.js';
import { redisConnection } from '../queue/connection.js';

export class CyanideFunctionalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CyanideFunctionalError';
  }
}

export class BB3ApiClient {
  private axiosInstance: AxiosInstance;
  /** Quand actif, le pacing est ignoré pour toutes les requêtes (mode maintenance) */
  private maintenanceMode = false;
  private lastPacingBypassCheck = 0;
  private cachedPacingBypass = false;
  private failureHandler: ((errorMsg: string) => void) | null = null;
  private static readonly BYPASS_CACHE_TTL = 5000; // 5 secondes
  private static readonly BASE_URL = 'https://web.cyanide-studio.com/ws/';
  private static readonly TIMEOUT_MS = 60000; // 60 secondes (les serveurs Cyanide peuvent être lents)

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: BB3ApiClient.BASE_URL,
      timeout: BB3ApiClient.TIMEOUT_MS,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SneakySkink-Harvester/1.0.0',
      },
    });
  }

  /**
   * Enregistre un gestionnaire pour être notifié des pannes globales de l'API.
   */
  public setFailureHandler(handler: (errorMsg: string) => void): void {
    this.failureHandler = handler;
  }

  /**
   * Active ou désactive le mode maintenance.
   * Quand actif, le Rate Pacing est ignoré sur TOUS les appels pour maximiser la vitesse
   * tout en respectant les quotas (getAvailableKey bloque si la limite est atteinte).
   */
  public setMaintenanceMode(enabled: boolean): void {
    this.maintenanceMode = enabled;
    logger.info(`⚡ [BB3ApiClient] Mode maintenance : ${enabled ? 'ACTIVÉ (pacing désactivé)' : 'DÉSACTIVÉ (pacing normal)'}`);
  }

  /**
   * Applique une attente de régulation (Rate Pacing) après qu'une requête a été envoyée avec succès.
   */
  private async applyPostRequestPacing(activeKey: string): Promise<void> {
    let isBypassed = this.maintenanceMode;
    if (!isBypassed) {
      const nowBypass = Date.now();
      if (nowBypass - this.lastPacingBypassCheck > BB3ApiClient.BYPASS_CACHE_TTL) {
        try {
          const bypass = await redisConnection.get('sneakyskink:bypass_pacing');
          this.cachedPacingBypass = !!bypass;
          this.lastPacingBypassCheck = nowBypass;
        } catch (err: any) {
          logger.warn(`⚠️ [BB3ApiClient] Erreur de lecture du bypass de pacing dans Redis: ${err.message}`);
        }
      }
      isBypassed = this.cachedPacingBypass;
    }

    const pacingDelay = apiKeyManager.getDynamicPacingDelay(activeKey, isBypassed);

    if (pacingDelay > 0) {
      logger.debug(
        `⏳ [BB3ApiClient] Rate pacing : attente de ${pacingDelay}ms après la requête (Bypass: ${isBypassed})...`
      );
      if (!isBypassed) {
        ConsoleDashboard.setPacing(pacingDelay, pacingDelay);
      } else {
        ConsoleDashboard.setPacing(-1, -1);
      }
      await new Promise((resolve) => setTimeout(resolve, pacingDelay));
    }
  }

  /**
   * Effectue un appel GET résilient vers l'API de Cyanide.
   * Cette méthode gère automatiquement la rotation de clés et les tentatives de ré-exécution.
   * 
   * @param method La méthode d'API ciblée (ex: 'match', 'team', 'contests')
   * @param params Les arguments sous forme de paires clé-valeur
   */
  public async get<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    await apiKeyManager.ensureInitialized();
    const cleanMethod = method.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (cleanMethod !== 'status' && cleanMethod !== 'welcome') {
      try {
        const available = await redisConnection.get('sneakyskink:cyanide_api:available');
        if (available === 'false' || available === 'DOWN' || available === 'QUOTA_EXCEEDED') {
          throw new CyanideFunctionalError(`Appel API bloqué : l'API de Cyanide est marquée comme indisponible (statut: ${available}).`);
        }
      } catch (err: any) {
        if (err instanceof CyanideFunctionalError) throw err;
        logger.warn(`⚠️ [BB3ApiClient] Impossible de lire l'état de santé dans Redis: ${err.message}`);
      }
    }

    const maxAttempts = Math.max(3, env.apiKeys.length);
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      let activeKey = '';

      try {
        // 1. Demander une clé active disponible auprès du KeyManager
        activeKey = apiKeyManager.getAvailableKey();
      } catch (err: any) {
        logger.error(`🚨 [BB3ApiClient] Échec critique d'acquisition de clé API : ${err.message}`);
        throw err;
      }

      // Masquer pour les logs
      const maskedKey = `${activeKey.substring(0, 4)}...${activeKey.substring(activeKey.length - 4)}`;

      // 2. Préparer les paramètres (obligatoires : key et bb=3)
      const queryParams = {
        ...params,
        key: activeKey,
        bb: 3,
      };

      try {
        logger.debug(
          `🚀 [BB3ApiClient] Tentative ${attempts}/${maxAttempts} sur [${method}] avec la clé [${maskedKey}]`
        );

        // 3. Exécuter l'appel
        // Cyanide utilise le format d'URL : /ws/bb3/{method}/ ou /ws/cya/{method}/
        // La plupart des services BB3 sont sous /bb3/{method}/
        const safeParams = { ...params };
        if (safeParams.key) {
          safeParams.key = '***MASKED***';
        }
        const paramsStr = JSON.stringify(safeParams);
        ConsoleDashboard.setActivity(`Appel API: [${method}] (Tentative ${attempts}/${maxAttempts}) - Params: ${paramsStr}`);
        const cleanMethod = method.replace(/^\/+|\/+$/g, '');
        const endpoint = (cleanMethod === 'status' || cleanMethod === 'welcome') ? `cya/${cleanMethod}/` : `bb3/${cleanMethod}/`;
        const response = await this.axiosInstance.get(endpoint, { params: queryParams });

        // 4. Valider le corps de réponse
        // Parfois, l'API de Cyanide retourne du HTTP 200 mais avec un payload contenant une erreur (ex: {"error": "..."})
        const data = response.data;
        if (data === false) {
          // Un retour false indique que le quota est dépassé ou que la clé est invalide.
          // On marque la clé en quota exceed/cooldown pour la pénaliser et forcer la rotation.
          apiKeyManager.reportRateLimit(activeKey);
          throw new Error(`Quota dépassé ou clé invalide (l'API de Cyanide a retourné false)`);
        }

        if (data && typeof data === 'object' && 'error' in data) {
          const errMsg = String(data.error).toLowerCase();
          if (errMsg.includes('key') || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('unauthorized')) {
            apiKeyManager.reportRateLimit(activeKey);
            throw new Error(`Cyanide API Error Payload: ${data.error}`);
          }
          // C'est une erreur fonctionnelle (ex: ressource non trouvée). La clé a fonctionné.
          apiKeyManager.reportSuccess(activeKey);
          
          // Appliquer le pacing d'attente dynamique APRÈS l'appel réussi
          await this.applyPostRequestPacing(activeKey);

          throw new CyanideFunctionalError(`Cyanide API Functional Error: ${data.error}`);
        }

        // Signaler la dernière réponse reçue au Dashboard
        let responseSummary = '';
        if (data === null || data === undefined) {
          responseSummary = 'null';
        } else {
          const rawStr = JSON.stringify(data);
          const typeStr = Array.isArray(data) ? `Array(${data.length})` : typeof data;
          const preview = rawStr.length > 60 ? rawStr.substring(0, 60) + '...' : rawStr;
          responseSummary = `${typeStr} -> ${preview}`;
        }
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        ConsoleDashboard.setLastResponse(`[${timestamp}] ${responseSummary}`);

        // 5. Signaler le succès au KeyManager
        ActivityTracker.touch();
        apiKeyManager.reportSuccess(activeKey);
        
        // Appliquer le pacing d'attente dynamique APRÈS l'appel réussi
        await this.applyPostRequestPacing(activeKey);

        return data as T;

      } catch (error: any) {
        const timestamp = new Date().toLocaleTimeString('fr-FR');
        ConsoleDashboard.setLastResponse(`[${timestamp}] ERROR -> ${error.message}`);
        logger.warn(
          `⚠️ [BB3ApiClient] Échec de la tentative ${attempts}/${maxAttempts} sur [${method}] avec la clé [${maskedKey}]. Erreur : ${error.message}`
        );

        // Si c'est une erreur fonctionnelle, on ne pénalise pas la clé et on ne réessaie pas (resource inexistante)
        if (error instanceof CyanideFunctionalError) {
          logger.error(`❌ [BB3ApiClient] Erreur fonctionnelle détectée sur [${method}] : ${error.message}`);
          throw error;
        }

        // 6. Analyser l'erreur pour appliquer la bonne stratégie de Cooldown
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;

          if (status === 429) {
            // Lire l'en-tête Retry-After si présent
            const retryAfterHeader = axiosError.response?.headers['retry-after'];
            const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
            apiKeyManager.reportRateLimit(activeKey, retryAfterSeconds);
          } else {
            // Autres codes HTTP d'erreurs (500, 503, etc.)
            apiKeyManager.reportError(activeKey);
          }
        } else {
          // Erreur applicative ou quota retourné false (déjà géré mais on s'assure qu'un cooldown est actif)
          if (!error.message?.includes('retourné false')) {
            apiKeyManager.reportError(activeKey);
          }
        }

        // Si c'est notre dernière tentative, on propage l'erreur et on déclenche le failure handler
        if (attempts >= maxAttempts) {
          logger.error(
            `❌ [BB3ApiClient] Échec définitif après ${maxAttempts} tentatives sur [${method}].`
          );
          const finalErrorMsg = `Échec d'appel de la méthode [${method}] après ${maxAttempts} tentatives. Dernière erreur: ${error.message}`;

          if (this.failureHandler) {
            Promise.resolve().then(() => this.failureHandler!(finalErrorMsg)).catch(err => {
              logger.error(`❌ [BB3ApiClient] Erreur dans le failureHandler: ${err.message}`);
            });
          }

          throw new Error(finalErrorMsg);
        }

        // 7. Délai de temporisation exponentiel avant la prochaine tentative (avec une autre clé)
        const delayMs = Math.pow(2, attempts) * 1000;
        logger.info(
          `🔄 [BB3ApiClient] Rotation vers une autre clé et nouvelle tentative dans ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error('Erreur inconnue dans la boucle d\'exécution du client API.');
  }

  /**
   * Vérifie la santé générale de l'API de Cyanide en testant toutes les clés configurées.
   * Retourne 'OK', 'QUOTA_EXCEEDED' ou 'DOWN'.
   */
  public async checkApiAvailability(): Promise<'OK' | 'QUOTA_EXCEEDED' | 'DOWN'> {
    let hasQuotaExceeded = false;

    for (const key of env.apiKeys) {
      try {
        const endpoint = `${BB3ApiClient.BASE_URL}cya/status/`;
        // Appel direct via axios pour bypasser getAvailableKey() et son pacing/cooldown
        const response = await axios.get(endpoint, {
          params: { key, bb: 3 },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SneakySkink-Harvester/1.0.0',
          }
        });
        const data = response.data;
        if (data && typeof data === 'object' && 'games' in data) {
          return 'OK'; // Au moins une clé fonctionne !
        }
        if (data === false) {
          hasQuotaExceeded = true;
        }
      } catch (err: any) {
        logger.debug(`[BB3ApiClient] Test de santé échoué pour la clé ${key.substring(0, 4)}...: ${err.message}`);
      }
    }

    if (hasQuotaExceeded) {
      return 'QUOTA_EXCEEDED';
    }
    return 'DOWN';
  }
}

// Exporter une instance globale singleton
export const bb3ApiClient = new BB3ApiClient();
export default bb3ApiClient;
