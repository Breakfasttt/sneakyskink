/**
 * Script de correction des coachs corrompus
 * 
 * Contexte : un bug dans handleFetchCoach utilisait /coaches sans filtre ID,
 * retournant toujours le premier coach de la liste (Jakala). Résultat : de
 * nombreux coachs ont été sauvegardés en BDD avec le nom "Jakala" à la place
 * de leur vrai nom.
 * 
 * Ce script :
 * 1. Identifie tous les coachs nommés "Jakala" dont l'ID n'est pas celui du vrai Jakala
 * 2. Ré-enqueue un job fetch-coach pour chacun afin de corriger leur nom via /lookup
 */

import { prisma } from '../src/database/client.js';
import { queueCoachFetch } from '../src/queue/index.js';

// ID du vrai Jakala dans la ligue officielle (à ne pas re-synchroniser)
const REAL_JAKALA_ID = '17b84818-b145-11ed-80a8-020000a4d571';

// Taille de batch pour éviter de saturer la file BullMQ d'un coup
const BATCH_SIZE = 50;

async function main() {
  console.log('🔍 Recherche des coachs corrompus (nom = "Jakala" mais ID ≠ vrai Jakala)...');

  const corrupted = await prisma.coach.findMany({
    where: {
      name: 'Jakala',
      NOT: { id: REAL_JAKALA_ID },
    },
    select: { id: true },
  });

  if (corrupted.length === 0) {
    console.log('✅ Aucun coach corrompu trouvé. La BDD est propre.');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  ${corrupted.length} coachs corrompus trouvés. Enqueue en cours...`);

  let queued = 0;
  const ids = corrupted.map(c => c.id);

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(id => queueCoachFetch(id, 'low')));
    queued += batch.length;
    console.log(`  ↳ ${queued}/${ids.length} jobs enqueués...`);

    // Petite pause entre les batches pour ne pas surcharger Redis
    if (i + BATCH_SIZE < ids.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n✅ ${queued} jobs fetch-coach ajoutés à la file d'attente (priorité basse).`);
  console.log('ℹ️  Le SneakySync va les traiter progressivement en respectant les quotas API.');
  console.log('   Avec 2.5s entre chaque appel, cela prendra environ', Math.ceil(queued * 2.5 / 60), 'minutes.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Erreur :', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
