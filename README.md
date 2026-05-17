# 🦎 SneakySkink (Monorepo)

> L'écosystème d'aspiration, de traitement de données, d'API REST et de clients pour **Blood Bowl 3** (Cyanide Studio).

SneakySkink est une plateforme complète et modulaire conçue pour collecter, analyser et exposer les statistiques, compétitions et matchs de Blood Bowl 3. Le projet est structuré en **Monorepo** piloté par les **NPM Workspaces** pour unifier l'installation, simplifier la gestion des dépendances locales, et fluidifier le développement.

---

## 🏗️ Architecture du Monorepo

L'écosystème SneakySkink est divisé en plusieurs packages spécialisés :

| Package / Dossier | Rôle & Description | Technologie clé |
| :--- | :--- | :--- |
| **`sneakyskink-bdd`** | Source unique de vérité pour le schéma de données. Partage les types Prisma et gère la base PostgreSQL. | Prisma, PostgreSQL |
| **`sneakyskink-api-client`** | SDK Client réutilisable, léger et 100% typé pour consommer l'API REST de façon fluide. | TypeScript, Axios, Prisma |
| **`SneakySkink-harvester`** | Démon d'aspiration asynchrone régulé par file d'attente (BullMQ), rotation de clés API, et Rate Pacing intelligent. | BullMQ, Redis, Axios |
| **`SneakySkink-api`** | API REST Express exposant les données stockées et permettant de déclencher des jobs de synchro. | Express.js, TypeScript |
| **`SneakySkink-web`** | Interface utilisateur premium (Glassmorphism & Neon Glows) pour explorer les ligues, coachs et statistiques. | React, Vite, Material UI (MUI) |
| **`SneakySkink-discord`** | Bot Discord fournissant des commandes interactives, des alertes de matchs et des statistiques en direct. | Discord.js, Node.js |
| **`SneakySkink-twitch`** | Service d'intégration pour les overlays de streaming en direct et la détection d'activité Twitch. | Twitch API, WebSockets |
| **`sneakyskink-doc`** | Documentation centrale du projet (ce dépôt de documentation et guides pour IA). | Markdown |

---

## ⚡ Démarrage Rapide du Monorepo

### 1. Prérequis
Assurez-vous d'avoir installé sur votre machine :
* [Node.js](https://nodejs.org/) (v18+)
* [PostgreSQL](https://www.postgresql.org/)
* [Redis](https://redis.io/) (requis pour BullMQ / Harvester)

### 2. Configuration & Lancement

#### Étape A : Installation unique
Placez-vous à la racine du monorepo et exécutez la commande suivante. Elle installera toutes les dépendances de tous les sous-projets et créera automatiquement les liens symboliques locaux (workspaces) :
```bash
npm install
```

#### Étape B : Base de Données (`sneakyskink-bdd`)
1. Rendez-vous dans le dossier : `cd sneakyskink-bdd`
2. Configurez le fichier `.env` avec votre chaîne de connexion PostgreSQL (`DATABASE_URL`).
3. Générez le client Prisma et lancez les migrations :
   ```bash
   npx prisma migrate dev
   npm run build
   ```

#### Étape C : Le SDK Client (`sneakyskink-api-client`)
Compilez le client pour générer les fichiers physiques requis :
```bash
cd ../sneakyskink-api-client
npm run build
```

#### Étape D : Lancement des Démons locaux
Ouvrez des terminaux séparés pour lancer chaque service en mode développement :

* **Le Harvester (Démon BullMQ) :**
  ```bash
  cd SneakySkink-harvester
  # Configurez le .env (clés API Cyanide, api pacing delay, etc.)
  npm run dev
  ```

* **L'API REST (Express) :**
  ```bash
  cd SneakySkink-api
  # Configurez le .env (port, redis connection, etc.)
  npm run dev
  ```

* **L'Interface Web (React / Vite) :**
  ```bash
  cd SneakySkink-web
  npm run dev
  ```
  L'interface est disponible sur [http://localhost:3000](http://localhost:3000) !

---

## 🛠️ Commandes Globales Communes

Depuis la racine du monorepo, vous pouvez piloter l'ensemble de vos espaces de travail :
* **Installer toutes les dépendances :** `npm install`
* **Compiler tous les projets d'un coup :** `npm run build:all`
* **Linter tout le code du projet :** `npm run lint:all`

---

## 🛡️ Résilience face à l'API Cyanide (Harvester)
L'ingestion de données de Blood Bowl 3 est soumise à des limites de requêtes très strictes. Pour éviter les bannissements d'IP et les échecs, le Harvester intègre :
1. **Rate Pacer Actif :** Un délai incompressible de 2,5s est injecté entre chaque requête individuelle.
2. **Rotation Multi-Clés :** Le système tourne dynamiquement sur plusieurs clés API déclarées dans le `.env`.
3. **Système de Cooldown :** Si une clé reçoit une erreur HTTP 429 (Rate Limit), elle est mise en veille (cooldown) tandis que le système bascule de manière transparente sur les autres clés disponibles.
4. **Déduplication O(1) :** Avant d'appeler l'API de Cyanide pour télécharger le détail d'un match (appel lourd), le Harvester vérifie en base locale si le match existe déjà.

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
