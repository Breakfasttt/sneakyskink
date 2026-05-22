/**
 * Script de test pour valider l'endpoint de priorité d'une ligue.
 */

import axios from 'axios';
import { prisma } from '../src/database/client.js';

async function run() {
  console.log('🔌 Connexion à la base de données...');
  await prisma.$connect();

  // 1. Trouver ou créer une ligue de test
  let league = await prisma.league.findFirst();
  if (!league) {
    console.log('➕ Création d\'une ligue de test...');
    league = await prisma.league.create({
      data: {
        id: 'test-league-id-123',
        name: 'Test Ligue Auto Priority',
        logo: 'logo',
        gamerCount: 20,
        active: true,
        isPriority: false,
      }
    });
  }

  console.log(`🏆 Ligue sélectionnée : "${league.name}" (${league.id}) - Prioritaire : ${league.isPriority}`);

  const adminKey = 'sneakyskink_secret_admin_key_2026';
  const url = `http://localhost:3001/sync/league/${league.id}/priority`;

  // 2. Tenter de passer la ligue en prioritaire (true)
  console.log(`⚡ Appel POST /api/sync/league/${league.id}/priority avec isPriority=true...`);
  try {
    const resTrue = await axios.post(
      url,
      { isPriority: true },
      { headers: { 'x-admin-key': adminKey } }
    );
    console.log('✅ Réponse API (true) :', resTrue.data);

    // Vérifier en base
    const dbLeagueTrue = await prisma.league.findUnique({ where: { id: league.id } });
    console.log(`💾 État en BDD après passage à true : isPriority = ${dbLeagueTrue?.isPriority}`);
    if (dbLeagueTrue?.isPriority !== true) {
      throw new Error('La valeur en BDD n\'est pas true !');
    }
  } catch (err: any) {
    console.error('❌ Échec du test isPriority=true :', err.response?.data || err.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // 3. Tenter de repasser la ligue en non prioritaire (false)
  console.log(`⚡ Appel POST /api/sync/league/${league.id}/priority avec isPriority=false...`);
  try {
    const resFalse = await axios.post(
      url,
      { isPriority: false },
      { headers: { 'x-admin-key': adminKey } }
    );
    console.log('✅ Réponse API (false) :', resFalse.data);

    // Vérifier en base
    const dbLeagueFalse = await prisma.league.findUnique({ where: { id: league.id } });
    console.log(`💾 État en BDD après passage à false : isPriority = ${dbLeagueFalse?.isPriority}`);
    if (dbLeagueFalse?.isPriority !== false) {
      throw new Error('La valeur en BDD n\'est pas false !');
    }
  } catch (err: any) {
    console.error('❌ Échec du test isPriority=false :', err.response?.data || err.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // 4. Nettoyer la ligue si c'était notre ligue de test créée
  if (league.id === 'test-league-id-123') {
    console.log('🧹 Nettoyage de la ligue de test en BDD...');
    await prisma.league.delete({ where: { id: 'test-league-id-123' } });
  }

  console.log('🎉 Tous les tests d\'endpoint de priorité ont RÉUSSI avec succès !');
  await prisma.$disconnect();
}

run().catch(async (err) => {
  console.error('💥 Erreur inattendue :', err);
  await prisma.$disconnect();
  process.exit(1);
});
