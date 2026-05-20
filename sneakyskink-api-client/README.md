# 🔌 SDK Client-API SneakySkink

> SDK Client / API Client réutilisable et 100% typé pour l'écosystème **SneakySkink** (Blood Bowl 3).

Ce package fournit une classe TypeScript pratique pour communiquer de façon simple et robuste avec l'API REST de SneakySkink depuis n'importe quel autre microservice (ex: Bot Discord, Overlay Twitch, ou Application Frontend).

---

## 📦 Installation

Pour intégrer le client à un autre sous-projet, installez-le en utilisant les dépendances locales :

```bash
npm install ../sneakyskink-api-client
```

---

## ⚙️ Configuration

```typescript
import { SneakySkinkApiClient } from 'sneakyskink-api-client';

const client = new SneakySkinkApiClient({
  baseUrl: 'http://localhost:3001', // URL de SneakySkink-api
  timeout: 15000,                  // Optionnel (défaut : 15s)
  apiKey: 'votre_cle_api',         // Optionnel (si l'API requiert une authentification)
});
```

---

## 📖 Référence des Méthodes

Voici la liste complète des méthodes exposées par le client, classées par domaine d'application.

### 🔍 Statut & Infrastructure

#### `getStatus()`
Vérifie la santé de l'API et retourne le comptage des entités en base de données.
* **Retour** : `Promise<StatusPayload>`
* **Exemple** :
  ```typescript
  const status = await client.getStatus();
  ```

#### `getSyncQueue()`
Récupère l'état de la file d'attente de synchronisation BullMQ (tâches en cours, en attente, terminées, échouées).
* **Retour** : `Promise<SyncQueueState>`

---

### ⚡ Synchronisation (Cyanide)

Ces méthodes permettent de demander à l'API de planifier ou forcer une synchronisation asynchrone des données depuis l'API officielle de Cyanide.

#### `syncCoach(id: string)`
Planifie une tâche de synchronisation pour un coach spécifique.
* **Retour** : `Promise<{ success: boolean; jobId: string }>`

#### `syncLeague(id: string)`
Planifie une tâche de synchronisation pour une ligue spécifique (et toutes ses compétitions/matchs).
* **Retour** : `Promise<{ success: boolean; jobId: string }>`

#### `searchCyanideLeagues(query: string)`
Cherche des ligues par nom directement sur l'API Cyanide (pour importation future).
* **Retour** : `Promise<any[]>`

---

### 🗄️ Récupération des Données de Jeu

Ces méthodes récupèrent les données brutes typées via Prisma (Ligue, Compétition, Équipe, Coach, Match).

#### `getLeagues()`
Récupère toutes les ligues enregistrées localement.
* **Retour** : `Promise<League[]>`

#### `getLeague(id: string)`
Récupère les détails complets d'une ligue avec ses compétitions associées.
* **Retour** : `Promise<League & { competitions: Competition[] }>`

#### `getCompetitions(params?: { leagueId?: string })`
Récupère la liste des compétitions (filtrable par ID de ligue).
* **Retour** : `Promise<Competition[]>`

#### `getCompetition(id: string)`
Récupère une compétition spécifique par son ID avec sa ligue associée.
* **Retour** : `Promise<Competition & { league: League }>`

#### `getTeams(params?: { search?: string; race?: number })`
Récupère la liste des équipes enregistrées (recherche textuelle ou filtrage par race/roster).
* **Retour** : `Promise<Team[]>`

#### `getTeam(id: string)`
Récupère les détails d'une équipe avec son coach et ses joueurs.
* **Retour** : `Promise<Team & { coach: Coach; players: Player[] }>`

#### `getCoaches(params?: { search?: string; limit?: number })`
Récupère la liste globale de tous les coachs enregistrés.
* **Retour** : `Promise<Coach[]>`

#### `getCoach(id: string)`
Récupère les détails d'un coach avec ses équipes associées.
* **Retour** : `Promise<Coach & { teams: Team[] }>`

#### `getMatches(params?: { page?: number; limit?: number; search?: string })`
Récupère la liste paginée des matchs enregistrés.
* **Retour** : `Promise<Match[]>`

#### `getMatch(id: string)`
Récupère le détail complet d'un match avec la feuille de statistiques détaillées de tous les joueurs.
* **Retour** : `Promise<Match & { competition: Competition; league: League; playerStats: any[] }>`

---

### 📊 Statistiques & Performances (Enrichi)

Ces méthodes récupèrent des agrégations et timelines idéales pour concevoir des dashboards complets.

#### `getGlobalStats()`
Récupère les statistiques de performance et de popularité des rosters à l'échelle de tout le site, incluant la timeline des derniers matchs et le taux d'abandon.
* **Retour** : `Promise<any>`

#### `getActivityStats()`
Récupère les volumes de matchs par heure et par jour pour tracer des graphiques d'activité.
* **Retour** : `Promise<any>`

#### `getCoachStats(id: string)`
Récupère le bilan complet d'un coach : winrate global, popularité des rosters joués, activité horaire, liste complète de ses matchs et liste de ses joueurs avec leurs compétences achetées (`acquiredSkills`).
* **Retour** : `Promise<any>`

#### `getTeamStats(id: string)`
Récupère les statistiques de performance d'une équipe : total de Touchdowns, KO, blessures infligées, résumé de son winrate historique, liste de tous ses matchs et son effectif complet.
* **Retour** : `Promise<any>`

#### `getPlayerStats(id: string)`
Récupère la fiche individuelle cumulée d'un joueur précis : touchdowns marqués, passes complétées, dégâts physiques infligés/subis, son winrate quand il est aligné et la liste de ses matchs joués.
* **Retour** : `Promise<any>`

#### `getLeagueStats(id: string)`
Récupère les statistiques d'une ligue entière, incluant l'utilisation des rosters au sein de celle-ci et l'activité des matchs.
* **Retour** : `Promise<any>`

#### `getCompetitionStats(id: string)`
Récupère les performances cumulées pour une compétition (Format, Roster Usage, forfait total, etc.).
* **Retour** : `Promise<any>`

---

## 🛠️ Build & Compilation

Pour recompiler le SDK TypeScript après modifications :

```bash
npm run build
```
