import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement
dotenv.config();

// Résoudre __dirname dans un module ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchApiDoc() {
  console.log('\n======================================================');
  console.log('       SNEAKYSKINK - EXPLORATEUR D\'API BB3');
  console.log('======================================================\n');

  const apiKey = process.env.BB3_API_KEY;

  // 1. Validation de la clé d'API
  if (!apiKey || apiKey === 'METTRE_ICI_TA_CLE' || apiKey.trim() === '') {
    console.error('❌ ERREUR : La clé d\'API de Blood Bowl 3 n\'est pas configurée !');
    console.error('👉 Veuillez ouvrir le fichier ".env" à la racine de votre projet.');
    console.error('👉 Remplacez la valeur "METTRE_ICI_TA_CLE" par votre véritable clé Cyanide.');
    console.error('👉 Puis relancez cette commande.\n');
    process.exit(1);
  }

  // 2. Construction de l'URL
  // L'URL fournie est : https://web.cyanide-studio.com/ws/?key=[ma_cle]&bb=3
  const url = `https://web.cyanide-studio.com/ws/?key=${apiKey}&bb=3`;
  console.log(`📡 Connexion à l'API officielle de Cyanide...`);
  console.log(`🔗 URL : https://web.cyanide-studio.com/ws/?key=***&bb=3\n`);

  try {
    // 3. Appel de l'API
    const response = await axios.get(url, {
      timeout: 15000, // Timeout de 15 secondes
      headers: {
        'Accept-Encoding': 'gzip, deflate, br', // Support de la compression
      }
    });

    const data = response.data;

    // Vérifier si la réponse contient une erreur de Cyanide (parfois encapsulée dans le statut HTTP 200)
    if (data && typeof data === 'object' && ('error' in data || 'errorMessage' in data)) {
      throw new Error(data.error || data.errorMessage || 'Erreur retournée par le serveur Cyanide.');
    }

    console.log('✅ Données reçues avec succès !');

    // 4. Création du dossier docs/ s'il n'existe pas
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // 5. Sauvegarde du fichier JSON
    const outputFilePath = path.join(docsDir, 'bb3-api-schema.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf-8');

    // 6. Affichage du résumé
    const fileSizeInBytes = fs.statSync(outputFilePath).size;
    const fileSizeInKb = (fileSizeInBytes / 1024).toFixed(2);

    console.log(`📁 Fichier sauvegardé : docs/bb3-api-schema.json`);
    console.log(`📊 Taille du fichier  : ${fileSizeInKb} Ko`);
    console.log(`\n🎉 Documentation récupérée ! Vous pouvez maintenant analyser son contenu.`);
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ ERREUR LORS DE LA RÉCUPÉRATION :');
    if (error.response) {
      // Erreur de statut HTTP (ex: 403, 404, 500)
      console.error(`- Statut HTTP : ${error.response.status}`);
      console.error(`- Données :`, error.response.data);
    } else if (error.request) {
      // Pas de réponse du serveur
      console.error(`- Pas de réponse du serveur. Vérifiez votre connexion Internet ou l'état des serveurs Cyanide.`);
    } else {
      // Autre erreur (ex: mauvaise URL, parsing)
      console.error(`- Message : ${error.message}`);
    }
    console.log('\n======================================================\n');
    process.exit(1);
  }
}

fetchApiDoc();
