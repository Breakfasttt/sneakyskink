# 🦎 sneakyskink-api

> API REST Express hautement performante et optimisée pour l'écosystème **SneakySkink** (Blood Bowl 3).

Ce service expose sous forme d'endpoints JSON les données de Blood Bowl 3 stockées dans la base de données PostgreSQL. Il permet également de déclencher des opérations de maintenance et des tâches asynchrones de synchronisation pilotées par **BullMQ**.

---

## 🛠️ Technologies
* **Framework Web** : [Express.js](https://expressjs.com/)
* **Base de données / ORM** : PostgreSQL via [`sneakyskink-bdd`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-bdd)
* **File d'attente / Tâches** : [BullMQ](https://bullmq.io/) (via Redis)
* **Langage & Outillage** : TypeScript, `tsx` (exécution à chaud en développement)

---

## ⚙️ Configuration & Variables d'Environnement

Créez un fichier `.env` à la racine de ce dossier :
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sneakyskink?schema=public"
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ADMIN_API_KEY="sneakyskink_secret_admin_key_2026"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

---

## 🏗️ Structure des Fichiers

* [`src/routes/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api/src/routes) : Définition de toutes les routes de l'API (coaches, competitions, leagues, matches, stats, sync, etc.).
* [`src/controllers/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api/src/controllers) : Logique métier associée à chaque route (requêtes Prisma, traitement, etc.).
* [`src/middlewares/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api/src/middlewares) : Gestion de la limitation de requêtes (`rate-limit`), gestion des clés admin (`auth`), et gestion globale des erreurs.
* [`src/services/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api/src/services) : Services d'orchestration (ex: envoi de messages BullMQ pour la synchronisation).

---

## 📖 Endpoints Principaux de l'API

L'API expose les routes suivantes :

### 1. Statut & Infos de base
* **`GET /`** : Santé de l'API, métadonnées et volume global d'entités en base de données.

### 2. Données de Jeu
* **`GET /leagues`** : Liste des ligues.
* **`GET /leagues/:id`** : Détails d'une ligue (avec ses compétitions).
* **`GET /competitions`** : Liste des compétitions (filtrable par `leagueId`).
* **`GET /competitions/:id`** : Détails d'une compétition.
* **`GET /teams`** : Liste des équipes (recherche par nom, filtrage par race).
* **`GET /teams/:id`** : Effectif et statistiques d'une équipe.
* **`GET /coaches`** : Liste des coachs enregistrés.
* **`GET /coaches/:id`** : Fiche complète d'un coach avec ses équipes.
* **`GET /matches`** : Liste paginée et filtrable des matchs joués.
* **`GET /matches/:id`** : Détail complet d'un match avec la feuille de statistiques individuelles de tous les joueurs.
* **`GET /races`** : Liste des races enregistrées et mappages d'ID techniques Blood Bowl 3.

### 3. Statistiques & Agrégations (`/stats`)
* **`GET /stats/global`** : Winrate des rosters, timelines globales et abandon/forfait général.
* **`GET /stats/activity`** : Activité des matchs joués par jour et par heure (idéal pour tracer des graphes).
* **`GET /stats/coach/:id`** : Statistiques avancées d'un coach (winrate par race, historique de matchs, XP acquis par ses joueurs).
* **`GET /stats/league/:id`** : Utilisation des races et volume de matchs au sein d'une ligue spécifique.
* **`GET /stats/competition/:id`** : Performances agrégées dans un tournoi spécifique.

### 4. Synchronisation via BullMQ (`/sync`) (Clé d'administration requise)
* **`POST /sync/coach/:id`** : Planifie la synchronisation d'un coach.
* **`POST /sync/league/:id`** : Planifie la synchronisation d'une ligue entière.
* **`GET /sync/queue`** : Renvoie l'état de la file d'attente Redis / BullMQ.
* **`POST /sync/queue/clean`** : Vide et réinitialise les files d'attente de jobs.

### 5. Maintenance & Audit (`/maintenance`) (Clé d'administration requise)
* **`POST /maintenance/run`** : Déclenche manuellement un audit de la base de données (déduplication des matchs, nettoyage des incohérences).
* **`GET /maintenance/reports`** : Liste les derniers rapports d'audit générés.

---

## ⚡ Lancement du Service

* **Mode développement (avec rechargement automatique) :**
  ```bash
  npm run dev
  ```
  *(L'API s'exécute par défaut sur [http://localhost:3001](http://localhost:3001))*

* **Build de production :**
  ```bash
  npm run build
  npm start
  ```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

