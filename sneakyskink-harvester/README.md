# 🦎 sneakyskink-harvester

> Démon d'aspiration et de collecte autonome de données Blood Bowl 3 pour l'écosystème **SneakySkink**.

Le Harvester est un service d'arrière-plan résilient régulé par une file d'attente **BullMQ** (Redis). Il interroge l'API officielle de Cyanide Studio, extrait les structures de données complexes (ligues, compétitions, coachs, équipes, joueurs, matchs et statistiques détaillées), les nettoie et les persiste dans la base de données PostgreSQL.

Il intègre une interface utilisateur en mode console (TUI / Terminal Dashboard) pour suivre en direct l'état des services, des files d'attente et des derniers éléments insérés.

---

## 🛠️ Technologies
* **Gestionnaire de tâches** : [BullMQ](https://bullmq.io/) (Redis)
* **Client HTTP** : Axios (avec gestion de la résilience)
* **Base de données / ORM** : PostgreSQL via [`sneakyskink-bdd`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-bdd)
* **TUI (Interface Console)** : ConsoleDashboard customisé avec alertes et status en direct
* **Langage & Outillage** : TypeScript, `tsx`

---

## 🛡️ Résilience & Rate Pacing (Cyanide API)
L'ingestion de données de Blood Bowl 3 est soumise à des limitations de requêtes très strictes (Rate Limit). Pour éviter les coupures et bannissements d'IP, le Harvester intègre :
1. **Rate Pacer Actif** : Un délai incompressible (configurable par `API_MIN_DELAY_MS`, défaut : 2.5s) est injecté entre chaque requête individuelle.
2. **Rotation de Clés API** : Capacité de gérer dynamiquement plusieurs clés d'API (déclarées dans le `.env` ou chargées depuis Redis).
3. **Système de Cooldown** : Si une clé reçoit une erreur HTTP 429 (Rate Limit), elle est mise en veille pour une durée prédéfinie tandis que le système bascule de manière transparente sur les autres clés disponibles.
4. **Déduplication O(1)** : Avant de télécharger la feuille de match complète (opération lourde), le Harvester vérifie localement si le match a déjà été traité.
5. **Circuit Breaker & Health Check** : Si l'API officielle de Cyanide est indisponible, le Harvester se met en pause de manière intelligente pour préserver les ressources.

---

## ⚙️ Configuration & Variables d'Environnement

Créez un fichier `.env` à la racine de ce dossier :
```env
# Clé d'API de Blood Bowl 3 (Cyanide)
BB3_API_KEY=votre_cle_api_ici

# URL de l'API de Blood Bowl 3
BB3_API_URL=https://web.cyanide-studio.com/ws/

# Configuration de la base de données PostgreSQL (Partagée avec l'API REST)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sneakyskink?schema=public"

# Configuration Redis (pour les files d'attente BullMQ)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Intervalle de synchronisation périodique des ligues actives (en minutes)
SYNC_INTERVAL_MINUTES=90

# Délai minimum entre deux requêtes API consécutives (en millisecondes)
API_MIN_DELAY_MS=2500
```

---

## 🏗️ Structure des Fichiers

* [`src/queue/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/src/queue) : Connexion Redis, Worker BullMQ (`worker.ts`) et Scheduler périodique (`scheduler.ts`).
* [`src/services/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/src/services) : Logique d'appel de l'API Cyanide, gestionnaire de clés API (`api-key-manager.ts`), et service de vérification de santé (`cyanide-health.service.ts`).
* [`src/parsers/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/src/parsers) : Traduction et formatage des structures de données brutes Cyanide vers le schéma Prisma local (Nettoyage de texte, conversion des statistiques).
* [`src/utils/dashboard.ts`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/src/utils/dashboard.ts) : Composant TUI pour le rendu de l'interface console.
* [`scripts/`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/scripts) : Scripts utilitaires pour le débogage rapide et le test unitaire des parsers/API.

---

## ⚡ Lancement du Service

* **Mode développement (avec rechargement automatique & TUI) :**
  ```bash
  npm run dev
  ```

* **Lancer une synchronisation globale immédiate :**
  ```bash
  npm run sync:now
  ```

* **Build de production :**
  ```bash
  npm run build
  npm start
  ```

---

## 🛠️ Scripts Utilitaires Disponibles

Le dossier `scripts/` contient de nombreux raccourcis de développement exécutables via `tsx` :

* **Tester les parsers avec un match témoin** :
  ```bash
  npm run test:parsers
  ```
* **Tester la résilience du client face au Rate Limit** :
  ```bash
  npm run test:client
  ```
* **Télécharger et parser la documentation API brute** :
  ```bash
  npm run api:doc
  ```
* **Explorer tous les endpoints de l'API BB3** :
  ```bash
  npm run test:explore
  ```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

