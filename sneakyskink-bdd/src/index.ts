import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Tout ré-exporter depuis le client Prisma auto-généré (League, Match, etc.)
export * from '@prisma/client';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sneakyskink?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Créer et exporter une instance globale partagée de PrismaClient par défaut
export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ]
    : [{ emit: 'stdout', level: 'error' }],
});

// Facultatif: log les requêtes SQL lentes ou toutes les requêtes en mode dev
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: any) => {
    // Si logger est disponible chez l'importateur, il verra ces requêtes dans sa console.
    // Sinon, on peut simplement les ignorer ou les laisser.
    console.debug(`🔍 [SQL Shared] Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

// Déconnexion propre lors de l'arrêt du processus
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
