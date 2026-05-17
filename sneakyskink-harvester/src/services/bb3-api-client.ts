import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiKeyManager } from './api-key-manager.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

export class BB3ApiClient {
  private axiosInstance: AxiosInstance;
  private lastRequestTime = 0;
  private static readonly BASE_URL = 'https://web.cyanide-studio.com/ws/';
  private static readonly MAX_RETRIES = 3;
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
   * Effectue un appel GET résilient vers l'API de Cyanide.
   * Cette méthode gère automatiquement la rotation de clés et les tentatives de ré-exécution.
   * 
   * @param method La méthode d'API ciblée (ex: 'match', 'team', 'contests')
   * @param params Les arguments sous forme de paires clé-valeur
   */
  public async get<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    let attempts = 0;

    while (attempts < BB3ApiClient.MAX_RETRIES) {
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
          `🚀 [BB3ApiClient] Tentative ${attempts}/${BB3ApiClient.MAX_RETRIES} sur [${method}] avec la clé [${maskedKey}]`
        );

        // 2.5. Régulation du rythme (Rate Pacing) pour respecter scrupuleusement les quotas
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        const minDelay = env.apiMinDelayMs;
        if (timeSinceLast < minDelay) {
          const waitTime = minDelay - timeSinceLast;
          logger.debug(
            `⏳ [BB3ApiClient] Rate pacing : attente de ${waitTime}ms avant l'appel suivant pour réguler le trafic...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        this.lastRequestTime = Date.now();

        // 3. Exécuter l'appel
        // Cyanide utilise le format d'URL : /ws/bb3/{method}/ ou /ws/cya/{method}/
        // La plupart des services BB3 sont sous /bb3/{method}/
        const cleanMethod = method.replace(/^\/+|\/+$/g, '');
        const endpoint = cleanMethod === 'status' ? 'cya/status/' : `bb3/${cleanMethod}/`;
        const response = await this.axiosInstance.get(endpoint, { params: queryParams });

        // 4. Valider le corps de réponse
        // Parfois, l'API de Cyanide retourne du HTTP 200 mais avec un payload contenant une erreur (ex: {"error": "..."})
        const data = response.data;
        if (data && typeof data === 'object' && 'error' in data) {
          throw new Error(`Cyanide API Error Payload: ${data.error}`);
        }

        // 5. Signaler le succès au KeyManager
        apiKeyManager.reportSuccess(activeKey);
        return data as T;

      } catch (error: any) {
        logger.warn(
          `⚠️ [BB3ApiClient] Échec de la tentative ${attempts}/${BB3ApiClient.MAX_RETRIES} sur [${method}] avec la clé [${maskedKey}]. Erreur : ${error.message}`
        );

        // 6. Analyser l'erreur pour appliquer la bonne stratégie de Cooldown
        let isRateLimit = false;

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;

          if (status === 429) {
            isRateLimit = true;
            // Lire l'en-tête Retry-After si présent
            const retryAfterHeader = axiosError.response?.headers['retry-after'];
            const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
            apiKeyManager.reportRateLimit(activeKey, retryAfterSeconds);
          } else {
            // Autres codes HTTP d'erreurs (500, 503, etc.)
            apiKeyManager.reportError(activeKey);
          }
        } else {
          // Erreur applicative (ex: timeout de connexion, erreur de payload, DNS)
          apiKeyManager.reportError(activeKey);
        }

        // Si c'est notre dernière tentative, on propage l'erreur
        if (attempts >= BB3ApiClient.MAX_RETRIES) {
          logger.error(
            `❌ [BB3ApiClient] Échec définitif après ${BB3ApiClient.MAX_RETRIES} tentatives sur [${method}].`
          );
          throw new Error(
            `Échec d'appel de la méthode [${method}] après ${BB3ApiClient.MAX_RETRIES} tentatives. Dernière erreur: ${error.message}`
          );
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
}

// Exporter une instance globale singleton
export const bb3ApiClient = new BB3ApiClient();
export default bb3ApiClient;
