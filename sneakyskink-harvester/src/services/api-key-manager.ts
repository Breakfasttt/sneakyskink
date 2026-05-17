import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';

interface ApiKeyStatus {
  key: string;
  hourlyRequests: number;
  dailyRequests: number;
  hourlyResetTime: number; // Timestamp (ms)
  dailyResetTime: number;  // Timestamp (ms)
  cooldownUntil: number;   // Timestamp (ms)
}

export class ApiKeyManager {
  private keysStatus: Map<string, ApiKeyStatus> = new Map();
  private static readonly HOURLY_LIMIT = 1000;
  private static readonly DAILY_LIMIT = 10000;
  private static readonly HOUR_MS = 60 * 60 * 1000;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;
  private static readonly DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes par défaut sur erreur

  constructor() {
    if (env.apiKeys.length === 0) {
      logger.error('❌ ApiKeyManager: Aucune clé API configurée dans l\'environnement.');
      throw new Error('Aucune clé API configurée.');
    }

    const now = Date.now();
    for (const key of env.apiKeys) {
      // Masquer la clé pour les logs (affiche les 4 premiers et derniers caractères)
      const maskedKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      logger.info(`🔑 ApiKeyManager: Enregistrement de la clé [${maskedKey}]`);
      
      this.keysStatus.set(key, {
        key,
        hourlyRequests: 0,
        dailyRequests: 0,
        hourlyResetTime: now + ApiKeyManager.HOUR_MS,
        dailyResetTime: now + ApiKeyManager.DAY_MS,
        cooldownUntil: 0,
      });
    }
  }

  /**
   * Retourne la meilleure clé API disponible.
   * Fait tourner les clés (Round Robin) et réinitialise les quotas si nécessaire.
   */
  public getAvailableKey(): string {
    const now = Date.now();
    let bestKey: ApiKeyStatus | null = null;

    for (const status of this.keysStatus.values()) {
      this.checkAndResetQuotas(status, now);

      // Si la clé est en période de cooldown, on passe
      if (status.cooldownUntil > now) {
        continue;
      }

      // Si la clé a dépassé ses quotas horaires ou journaliers, on passe
      if (status.hourlyRequests >= ApiKeyManager.HOURLY_LIMIT || status.dailyRequests >= ApiKeyManager.DAILY_LIMIT) {
        continue;
      }

      // Sélection de la clé avec le moins de requêtes horaires consommées
      if (!bestKey || status.hourlyRequests < bestKey.hourlyRequests) {
        bestKey = status;
      }
    }

    if (!bestKey) {
      logger.warn('⚠️ [ApiKeyManager] Toutes les clés API sont saturées ou en cooldown !');
      throw new Error('Toutes les clés API sont actuellement saturées (quotas dépassés) ou en cooldown.');
    }

    return bestKey.key;
  }

  /**
   * Enregistre un appel réussi et incrémente les compteurs de quotas.
   */
  public reportSuccess(key: string): void {
    const status = this.keysStatus.get(key);
    if (!status) return;

    const now = Date.now();
    this.checkAndResetQuotas(status, now);

    status.hourlyRequests++;
    status.dailyRequests++;

    const maskedKey = this.mask(key);
    logger.debug(
      `📊 [ApiKeyManager] Appel réussi avec la clé [${maskedKey}]. Quotas : Horaire [${status.hourlyRequests}/${ApiKeyManager.HOURLY_LIMIT}], Journalier [${status.dailyRequests}/${ApiKeyManager.DAILY_LIMIT}]`
    );
  }

  /**
   * Met une clé en cooldown suite à un retour HTTP 429 (Too Many Requests).
   */
  public reportRateLimit(key: string, retryAfterSeconds?: number): void {
    const status = this.keysStatus.get(key);
    if (!status) return;

    const now = Date.now();
    const cooldownDuration = retryAfterSeconds ? retryAfterSeconds * 1000 : ApiKeyManager.DEFAULT_COOLDOWN_MS;
    status.cooldownUntil = now + cooldownDuration;
    
    // On force la réinitialisation de son quota horaire car Cyanide signale un dépassement
    status.hourlyRequests = ApiKeyManager.HOURLY_LIMIT; 

    logger.warn(
      `🚨 [ApiKeyManager] La clé [${this.mask(key)}] a reçu une erreur 429. Cooldown pendant ${cooldownDuration / 1000}s.`
    );
  }

  /**
   * Met une clé en cooldown temporaire suite à une erreur technique (ex: HTTP 500, 503, Timeout).
   */
  public reportError(key: string): void {
    const status = this.keysStatus.get(key);
    if (!status) return;

    const now = Date.now();
    status.cooldownUntil = now + ApiKeyManager.DEFAULT_COOLDOWN_MS;

    logger.error(
      `❌ [ApiKeyManager] Erreur technique avec la clé [${this.mask(key)}]. Cooldown temporaire de 5 minutes activé.`
    );
  }

  /**
   * Retourne l'état actuel de toutes les clés pour du monitoring ou diagnostic.
   */
  public getStatusList() {
    const now = Date.now();
    return Array.from(this.keysStatus.values()).map(status => {
      this.checkAndResetQuotas(status, now);
      return {
        keyMasked: this.mask(status.key),
        hourlyRequests: status.hourlyRequests,
        hourlyLimit: ApiKeyManager.HOURLY_LIMIT,
        dailyRequests: status.dailyRequests,
        dailyLimit: ApiKeyManager.DAILY_LIMIT,
        cooldownRemainingSeconds: Math.max(0, Math.ceil((status.cooldownUntil - now) / 1000)),
        hourlyResetMinutes: Math.max(0, Math.ceil((status.hourlyResetTime - now) / (60 * 1000))),
        dailyResetHours: Math.max(0, Math.ceil((status.dailyResetTime - now) / (60 * 60 * 1000))),
      };
    });
  }

  /**
   * Réinitialise les fenêtres de quotas si le temps est écoulé.
   */
  private checkAndResetQuotas(status: ApiKeyStatus, now: number): void {
    if (now >= status.hourlyResetTime) {
      status.hourlyRequests = 0;
      status.hourlyResetTime = now + ApiKeyManager.HOUR_MS;
      logger.info(`🔄 [ApiKeyManager] Quota horaire réinitialisé pour la clé [${this.mask(status.key)}].`);
    }

    if (now >= status.dailyResetTime) {
      status.dailyRequests = 0;
      status.dailyResetTime = now + ApiKeyManager.DAY_MS;
      logger.info(`🔄 [ApiKeyManager] Quota journalier réinitialisé pour la clé [${this.mask(status.key)}].`);
    }
  }

  /**
   * Helper pour masquer les clés d'API dans les logs.
   */
  private mask(key: string): string {
    if (key.length <= 8) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }
}

// Exporter une instance globale singleton
export const apiKeyManager = new ApiKeyManager();
export default apiKeyManager;
