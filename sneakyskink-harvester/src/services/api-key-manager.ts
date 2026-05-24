/**
 * Gestionnaire des clés d'API Cyanide pour Blood Bowl 3.
 * Gère la rotation des clés, les quotas horaires/journaliers et le calcul du Rate Pacing dynamique.
 */
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { redisConnection } from '../queue/connection.js';
import { ConsoleDashboard } from '../utils/dashboard.js';

interface ApiKeyStatus {
  key: string;
  hourlyRequests: number;
  dailyRequests: number;
  hourlyResetTime: number; // Timestamp (ms)
  dailyResetTime: number;  // Timestamp (ms)
  cooldownUntil: number;   // Timestamp (ms)
  lastRequestTime: number; // Timestamp (ms)
  heure0: number | null;   // Timestamp (ms) de la première requête après reset
}

export class ApiKeyManager {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private keysStatus: Map<string, ApiKeyStatus> = new Map();
  public static readonly HOURLY_LIMIT = 1000;
  public static readonly DAILY_LIMIT = 10000;
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
      this.keysStatus.set(key, {
        key,
        hourlyRequests: 0,
        dailyRequests: 0,
        hourlyResetTime: this.getNextHourlyReset(now),
        dailyResetTime: 0,
        heure0: null,
        cooldownUntil: 0,
        lastRequestTime: 0,
      });
    }
  }

  /**
   * Garantit que l'initialisation du gestionnaire de clés est terminée.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;
    await this.initialize();
  }

  /**
   * Initialise le gestionnaire en restaurant l'état des quotas depuis Redis.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      logger.info('🔑 [ApiKeyManager] Restauration des quotas depuis Redis...');
      const now = Date.now();

      for (const [key, status] of this.keysStatus.entries()) {
        const maskedKey = this.mask(key);
        try {
          const redisKey = `sneakyskink:quota:status:${this.mask(key)}`;
          const cached = await redisConnection.get(redisKey);

          if (cached) {
            const parsed = JSON.parse(cached);
            status.hourlyRequests = parsed.hourlyRequests ?? 0;
            status.dailyRequests = parsed.dailyRequests ?? 0;
            status.hourlyResetTime = parsed.hourlyResetTime ?? this.getNextHourlyReset(now);
            status.heure0 = parsed.heure0 ?? null;
            status.dailyResetTime = parsed.dailyResetTime ?? 0;
            status.cooldownUntil = parsed.cooldownUntil ?? 0;
            status.lastRequestTime = 0;

            // Réinitialiser les quotas si les fenêtres temporelles ont expiré pendant l'arrêt
            this.checkAndResetQuotas(status, now);

            logger.info(
              `🔑 [ApiKeyManager] Clé [${maskedKey}] restaurée. Quota horaire: ${status.hourlyRequests}/${ApiKeyManager.HOURLY_LIMIT}`
            );
          } else {
            logger.info(`🔑 [ApiKeyManager] Clé [${maskedKey}] : Aucun quota en cache, initialisation par défaut.`);
            await this.persistStatus(status);
          }
        } catch (err: any) {
          logger.error(`⚠️ [ApiKeyManager] Échec chargement Redis pour clé [${maskedKey}]: ${err.message}`);
        }
      }
      
      // Afficher les quotas de la première clé au démarrage pour le TUI
      if (env.apiKeys.length > 0) {
        this.updateDashboard(env.apiKeys[0]);
      }
      this.isInitialized = true;
    })();

    return this.initPromise;
  }

  /**
   * Réinitialise les quotas et cooldowns de toutes les clés API.
   * Utilisé lors du rétablissement de l'API.
   */
  public async resetAllQuotas(): Promise<void> {
    logger.info('🔄 [ApiKeyManager] Réinitialisation de toutes les clés API (API de nouveau disponible)...');
    const now = Date.now();
    for (const [key, status] of this.keysStatus.entries()) {
      status.hourlyRequests = 0;
      status.dailyRequests = 0;
      status.hourlyResetTime = this.getNextHourlyReset(now);
      status.heure0 = null;
      status.dailyResetTime = 0;
      status.cooldownUntil = 0;
      await this.persistStatus(status);
      this.updateDashboard(key);
    }
  }

  /**
   * Sauvegarde l'état d'une clé d'API dans Redis de manière asynchrone.
   */
  private async persistStatus(status: ApiKeyStatus): Promise<void> {
    try {
      const redisKey = `sneakyskink:quota:status:${this.mask(status.key)}`;
      const payload = JSON.stringify({
        hourlyRequests: status.hourlyRequests,
        dailyRequests: status.dailyRequests,
        hourlyResetTime: status.hourlyResetTime,
        dailyResetTime: status.dailyResetTime,
        cooldownUntil: status.cooldownUntil,
        heure0: status.heure0,
      });
      // Garder les quotas en cache pour 48 heures maximum
      await redisConnection.set(redisKey, payload, 'EX', 172800);
    } catch (err: any) {
      logger.error(`⚠️ [ApiKeyManager] Échec persistance Redis pour clé [${this.mask(status.key)}]: ${err.message}`);
    }
  }

  /**
   * Calcule le délai minimum de pacing dynamique pour une clé API.
   * Répartit l'utilisation restante sur le temps restant avant réinitialisation.
   */
  /**
   * Calcule le délai de régulation (Rate Pacing) dynamique pour une clé d'API.
   * Il assure un lissage fluide pour ne pas griller les quotas horaires et journaliers
   * restant avant leur réinitialisation respective.
   */
  public getDynamicPacingDelay(key: string, ignoreDailyLimit = false): number {
    const status = this.keysStatus.get(key);
    if (!status) return 2500;

    const now = Date.now();
    this.checkAndResetQuotas(status, now);

    let dailyDelay = 0;
    if (!ignoreDailyLimit) {
      // 1. Calcul du délai basé sur le quota restant de la journée
      const remainingDayMs = status.heure0 ? (status.dailyResetTime - now) : ApiKeyManager.DAY_MS;
      const remainingDayReqs = ApiKeyManager.DAILY_LIMIT - status.dailyRequests;

      if (remainingDayReqs <= 0 || remainingDayMs <= 0) {
        return ApiKeyManager.DAY_MS; // Quota journalier épuisé
      }
      dailyDelay = remainingDayMs / remainingDayReqs;
    }

    // 2. Calcul du délai basé sur le quota restant de l'heure
    const remainingHourMs = status.hourlyResetTime - now;
    const remainingHourReqs = ApiKeyManager.HOURLY_LIMIT - status.hourlyRequests;
    
    let hourlyDelay = 0;
    if (remainingHourReqs <= 0 || remainingHourMs <= 0) {
      hourlyDelay = ApiKeyManager.HOUR_MS; // Quota horaire épuisé
    } else {
      hourlyDelay = remainingHourMs / remainingHourReqs;
    }

    // Le pacing dynamique optimal est le plus restrictif des deux calculs
    const dynamicDelay = Math.max(dailyDelay, hourlyDelay);

    // Si on ignore la limite journalière (bypass), on garantit un minimum de 50ms de délai de sécurité
    const minDelay = ignoreDailyLimit ? 50 : 0;

    return Math.max(minDelay, Math.ceil(dynamicDelay));
  }

  /**
   * Retourne le timestamp (ms) de la dernière requête effectuée avec cette clé.
   */
  public getLastRequestTime(key: string): number {
    const status = this.keysStatus.get(key);
    return status ? status.lastRequestTime : 0;
  }

  /**
   * Met à jour le timestamp (ms) de la dernière requête effectuée avec cette clé.
   */
  public setLastRequestTime(key: string, time: number): void {
    const status = this.keysStatus.get(key);
    if (status) {
      status.lastRequestTime = time;
    }
  }

  /**
   * Met à jour les statistiques de quotas affichées dans le Dashboard console.
   */
  public updateDashboard(activeKey: string): void {
    const now = Date.now();
    const statuses = Array.from(this.keysStatus.values()).map(status => {
      this.checkAndResetQuotas(status, now);
      const keyIndex = env.apiKeys.indexOf(status.key);
      return {
        keyIndex: keyIndex >= 0 ? keyIndex : 0,
        keyMasked: this.mask(status.key),
        hourlyRequests: status.hourlyRequests,
        hourlyLimit: ApiKeyManager.HOURLY_LIMIT,
        dailyRequests: status.dailyRequests,
        dailyLimit: ApiKeyManager.DAILY_LIMIT,
        cooldownUntil: status.cooldownUntil,
        hourlyResetTime: status.hourlyResetTime,
        dailyResetTime: status.dailyResetTime,
        isActive: status.key === activeKey,
      };
    });

    ConsoleDashboard.setKeysStatus(statuses);
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

    // Mettre à jour l'affichage TUI
    this.updateDashboard(bestKey.key);

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

    // Initialiser l'Heure 0 si elle n'est pas encore définie
    if (!status.heure0) {
      status.heure0 = now;
      status.dailyResetTime = now + ApiKeyManager.DAY_MS;
      logger.info(`⏰ [ApiKeyManager] Heure 0 (reset/première requête) définie pour la clé [${this.mask(status.key)}] à ${new Date(status.heure0).toISOString()}. Reset journalier prévu à ${new Date(status.dailyResetTime).toISOString()}.`);
    }

    status.hourlyRequests++;
    status.dailyRequests++;

    // Sauvegarder dans Redis de manière asynchrone
    this.persistStatus(status);

    // Mettre à jour l'affichage TUI
    this.updateDashboard(key);

    const maskedKey = this.mask(key);
    logger.debug(
      `📊 [ApiKeyManager] Appel réussi avec la clé [${maskedKey}]. Quotas : Horaire [${status.hourlyRequests}/${ApiKeyManager.HOURLY_LIMIT}], Journalier [${status.dailyRequests}/${ApiKeyManager.DAILY_LIMIT}]`
    );
  }

  /**
   * Met une clé en cooldown suite à un retour HTTP 429 (Too Many Requests).
   */
  /**
   * Enregistre un dépassement de quota (HTTP 429 ou retour false de Cyanide).
   * Identifie s'il s'agit d'un dépassement horaire ou journalier pour bloquer efficacement la clé.
   */
  public reportRateLimit(key: string, retryAfterSeconds?: number): void {
    const status = this.keysStatus.get(key);
    if (!status) return;

    const now = Date.now();
    const cooldownDuration = retryAfterSeconds ? retryAfterSeconds * 1000 : ApiKeyManager.DEFAULT_COOLDOWN_MS;
    status.cooldownUntil = now + cooldownDuration;
    
    if (!status.heure0) {
      status.heure0 = now;
      status.dailyResetTime = now + ApiKeyManager.DAY_MS;
    }

    // Si la clé est signalée en dépassement alors que son quota horaire en mémoire
    // n'est pas encore atteint, c'est que le quota journalier (ou global) est épuisé.
    if (status.hourlyRequests < ApiKeyManager.HOURLY_LIMIT) {
      status.dailyRequests = ApiKeyManager.DAILY_LIMIT;
      logger.warn(
        `🚨 [ApiKeyManager] La clé [${this.mask(key)}] a reçu un signal de quota dépassé (429/false) alors qu'elle n'a fait que ${status.hourlyRequests}/${ApiKeyManager.HOURLY_LIMIT} requêtes dans l'heure. Quota journalier marqué comme épuisé.`
      );
    } else {
      // Sinon, on considère que le quota horaire est épuisé
      status.hourlyRequests = ApiKeyManager.HOURLY_LIMIT;
      logger.warn(
        `🚨 [ApiKeyManager] La clé [${this.mask(key)}] a reçu un signal de quota dépassé (429/false). Quota horaire marqué comme épuisé.`
      );
    }

    // Persister et mettre à jour le Dashboard
    this.persistStatus(status);
    this.updateDashboard(key);
  }

  /**
   * Met une clé en cooldown temporaire suite à une erreur technique (ex: HTTP 500, 503, Timeout).
   */
  public reportError(key: string): void {
    const status = this.keysStatus.get(key);
    if (!status) return;

    const now = Date.now();
    status.cooldownUntil = now + ApiKeyManager.DEFAULT_COOLDOWN_MS;

    if (!status.heure0) {
      status.heure0 = now;
      status.dailyResetTime = now + ApiKeyManager.DAY_MS;
    }

    // Persister et mettre à jour le Dashboard
    this.persistStatus(status);
    this.updateDashboard(key);

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
        dailyResetHours: status.heure0 ? Math.max(0, Math.ceil((status.dailyResetTime - now) / (60 * 60 * 1000))) : 24,
      };
    });
  }

  /**
  /**
   * Calcule le prochain reset horaire UTC (heure pile suivante).
   */
  private getNextHourlyReset(now: number): number {
    const date = new Date(now);
    date.setUTCMinutes(0, 0, 0);
    date.setUTCHours(date.getUTCHours() + 1);
    return date.getTime();
  }

  /**
   * Calcule le prochain reset journalier UTC (minuit UTC suivant).
   */
  private getNextDailyReset(now: number): number {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + 1);
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * Réinitialise les fenêtres de quotas si le temps est écoulé.
   */
  private checkAndResetQuotas(status: ApiKeyStatus, now: number): void {
    let changed = false;

    if (now >= status.hourlyResetTime) {
      status.hourlyRequests = 0;
      status.hourlyResetTime = this.getNextHourlyReset(now);
      changed = true;
      logger.info(`🔄 [ApiKeyManager] Quota horaire réinitialisé pour la clé [${this.mask(status.key)}].`);
    }

    if (status.heure0 && now >= status.dailyResetTime) {
      status.dailyRequests = 0;
      status.heure0 = null;
      status.dailyResetTime = 0;
      changed = true;
      logger.info(`🔄 [ApiKeyManager] Quota journalier réinitialisé pour la clé [${this.mask(status.key)}] (Fin de la période de 24h depuis l'Heure 0).`);
    }

    if (changed) {
      this.persistStatus(status);
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
