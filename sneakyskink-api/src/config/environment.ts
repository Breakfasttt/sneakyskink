import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement depuis le fichier .env à la racine
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Environment {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

// Validation des variables obligatoires
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("❌ La variable d'environnement DATABASE_URL est obligatoire mais manquante.");
}

export const env: Environment = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

console.log(`ℹ️ [Config] Chargement réussi. Port d'écoute : ${env.port} | Mode : ${env.nodeEnv}`);
console.log(`ℹ️ [Config] Redis configuré pour BullMQ sur : ${env.redis.host}:${env.redis.port}`);
