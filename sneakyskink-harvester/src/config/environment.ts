import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env à la racine
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Environment {
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  apiKeys: string[];
  nodeEnv: string;
  syncIntervalMinutes: number;
  apiMinDelayMs: number;
}

// Validation des variables obligatoires
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('❌ La variable d\'environnement DATABASE_URL est obligatoire mais manquante.');
}

const rawApiKeys = process.env.BB3_API_KEY || '';
// Supporter à la fois une clé unique ou une liste de clés séparées par des virgules pour le KeyManager
const apiKeys = rawApiKeys
  .split(',')
  .map(k => k.trim())
  .filter(k => k.length > 0 && k !== 'METTRE_ICI_TA_CLE');

if (apiKeys.length === 0) {
  throw new Error('❌ Aucune clé d\'API Blood Bowl 3 (BB3_API_KEY) n\'est configurée dans le fichier .env.');
}

export const env: Environment = {
  databaseUrl,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  apiKeys,
  nodeEnv: process.env.NODE_ENV || 'development',
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '90', 10),
  apiMinDelayMs: parseInt(process.env.API_MIN_DELAY_MS || '2000', 10),
};

console.log(`ℹ️ [Config] Chargement réussi. Mode : ${env.nodeEnv}`);
console.log(`ℹ️ [Config] Clés API BB3 chargées : ${env.apiKeys.length}`);
console.log(`ℹ️ [Config] Redis configuré sur : ${env.redis.host}:${env.redis.port}`);
console.log(`ℹ️ [Config] Intervalle de synchronisation périodique : ${env.syncIntervalMinutes} minutes`);
console.log(`ℹ️ [Config] Intervalle min entre requêtes API : ${env.apiMinDelayMs} ms`);

