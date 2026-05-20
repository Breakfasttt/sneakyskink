# 💡 SKILL : Utilisation de `sneakyskink-api-client`

Ce document sert de référence technique pour l'intégration, l'initialisation et l'appel de l'API REST de SneakySkink à l'aide du SDK client-api (`sneakyskink-api-client`).

---

## 1. Principes Clés & Importation
* **Local npm package** : Le SDK est référencé localement dans l'écosystème SneakySkink. Il est importé via la commande `npm install ../sneakyskink-api-client`.
* **Centralisation de l'instance** : Une seule instance de `SneakySkinkApiClient` doit être exportée par projet client (par exemple dans `src/api.ts` pour le web, ou `src/lib/api.ts` dans les bots) pour réutiliser les headers et la configuration Axios.

---

## 2. Initialisation & Configuration

```typescript
import { SneakySkinkApiClient } from 'sneakyskink-api-client';

export const api = new SneakySkinkApiClient({
  baseUrl: process.env.API_URL || 'http://localhost:3001', // URL racine de sneakyskink-api
  timeout: 15000,                                         // Optionnel, 15 secondes par défaut
  apiKey: process.env.API_KEY,                            // Optionnel, Bearer token d'authentification
});
```

---

## 3. Catégories de Méthodes

### A. 🔍 Système & Santé
* **`getStatus()`** : Permet de vérifier que l'API est en ligne et de récupérer le volume d'enregistrements en base de données.
  ```typescript
  const status = await api.getStatus();
  // Retourne { status: "OK", stats: { leagues: number, matches: number, ... } }
  ```
* **`getSyncQueue()`** : Indique l'état actuel de la file de synchronisation asynchrone (BullMQ).
  ```typescript
  const queue = await api.getSyncQueue();
  // Retourne { active: number, waiting: number, completed: number, failed: number }
  ```

### B. ⚡ Actions de Synchronisation (API Cyanide)
* **`syncCoach(id)`** : Demande d'ajouter un job en file d'attente pour synchroniser un coach spécifique.
  ```typescript
  const job = await api.syncCoach('coach-uuid');
  ```
* **`syncLeague(id)`** : Demande d'ajouter un job pour synchroniser une ligue complète.
  ```typescript
  const job = await api.syncLeague('league-uuid');
  ```
* **`searchCyanideLeagues(query)`** : Recherche des ligues par nom directement sur les serveurs de Cyanide.
  ```typescript
  const searchResults = await api.searchCyanideLeagues('ma-ligue');
  ```

### C. 🗄️ Données de Jeu (Modèles Prisma)
* **`getLeagues()`** : Liste toutes les ligues stockées.
* **`getLeague(id)`** : Détails d'une ligue avec ses compétitions associées.
* **`getCompetitions({ leagueId? })`** : Liste les compétitions d'une ligue ou globales.
* **`getCompetition(id)`** : Détails d'une compétition avec sa ligue associée.
* **`getTeams({ search?, race? })`** : Liste les équipes avec filtres.
* **`getTeam(id)`** : Détails d'une équipe avec son coach et ses joueurs.
* **`getCoaches({ search?, limit? })`** : Liste les coachs.
* **`getCoach(id)`** : Détails d'un coach avec ses équipes.
* **`getMatches({ page?, limit?, search? })`** : Liste paginée des matchs.
* **`getMatch(id)`** : Détails d'un match avec la feuille de match et statistiques de chaque joueur.

### D. 📊 Statistiques Consolidées & Graphiques (Enrichi)
Toutes ces méthodes renvoient des objets agrégés contenant un `summary`, des performances physiques cumulées (`performance`), une répartition par roster (`rosterUsage`), et les `matches` associés.

* **`getGlobalStats()`** : Statistiques globales du site et des races.
* **`getActivityStats()`** : Activité horaire et timeline des matchs par jour (utile pour les graphiques d'activité).
* **`getCoachStats(id)`** : Bilan complet du coach, ses matchs, et l'ensemble de ses joueurs avec compétences acquises (`acquiredSkills`).
* **`getTeamStats(id)`** : Statistiques de performance de l'équipe, winrate cumulé, ses joueurs et historique de ses matchs.
* **`getPlayerStats(id)`** : Statistiques de performance individuelles cumulées pour un joueur et tous les matchs auxquels il a participé.
* **`getLeagueStats(id)`** : Bilan d'une ligue et popularité de ses races.
* **`getCompetitionStats(id)`** : Bilan et roster usage dans une compétition.
