import { Redis } from 'ioredis';
import { env } from '../config/environment.js';

// Configuration de la connexion Redis partagée
export const redisConnection = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null, // Obligatoire pour BullMQ
});

redisConnection.on('error', (err) => {
  console.error('❌ [Redis] Erreur de connexion :', err);
});
