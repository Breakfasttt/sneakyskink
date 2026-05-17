# 🔌 @sneakyskink/api-client

> SDK Client / API Client réutilisable et 100% typé pour l'écosystème **SneakySkink** (Blood Bowl 3).

Ce package fournit une classe TypeScript pratique pour communiquer de façon simple et robuste avec l'API REST de SneakySkink depuis n'importe quel autre microservice (ex: Bot Discord, Overlay Twitch, ou Application Frontend).

---

## 📦 Installation

Pour intégrer le client à un autre sous-projet (comme `SneakySkink-discord` ou `SneakySkink-twitch`), installez-le en utilisant les liens de dépendances locaux ou via npm :

```bash
npm install ../sneakyskink-api-client
```

---

## ⚡ Utilisation

```typescript
import { SneakySkinkApiClient } from 'sneakyskink-api-client';

// Initialisation du client
const client = new SneakySkinkApiClient({
  baseUrl: 'http://localhost:3001', // Adresse de votre SneakySkink-api
  timeout: 10000,
});

async function run() {
  try {
    // 1. Récupérer l'état de l'API et ses statistiques de base
    const status = await client.getStatus();
    console.log(`API Status: ${status.status} | Matches in DB: ${status.stats.matches}`);

    // 2. Récupérer un coach et ses équipes (complètement typé avec Prisma !)
    const coach = await client.getCoach('coach-uuid-1234');
    console.log(`Coach Name: ${coach.name}`);
    coach.teams.forEach(team => {
      console.log(`- Team: ${team.name} (TV: ${team.value})`);
    });

    // 3. Déclencher à distance une synchronisation asynchrone
    const syncRes = await client.syncCoach('coach-uuid-1234');
    console.log(`Job BullMQ démarré avec l'ID: ${syncRes.jobId}`);

  } catch (error) {
    console.error('Erreur lors de la communication API:', error);
  }
}

run();
```

---

## 🛠️ Build & Compilation

Pour compiler le SDK TypeScript vers du JavaScript moderne (`dist/`) :

```bash
npm install
npm run build
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
