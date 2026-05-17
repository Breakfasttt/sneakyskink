# SneakySkink-harvester - Contexte & Ambition du Projet

Bienvenue dans le dépôt de **SneakySkink-harvester** ! Ce document sert de guide d'accueil et de mémoire persistante pour tout agent d'intelligence artificielle ou développeur travaillant sur ce projet. Il décrit l'ambition globale, l'architecture choisie, l'écosystème de dépôts associés et nos conventions techniques.

---

## 1. Ambition du Projet

L'écosystème **SneakySkink** a pour objectif de collecter, stocker, analyser et restituer les données de matchs du jeu vidéo **Blood Bowl 3** (et du futur **World of Blood Bowl - WBB**) de manière ultra-performante et résiliente.

Le jeu officiel propose une API REST, mais celle-ci est soumise à des quotas d'appels stricts (Rate Limits) par clé d'API, et peut souffrir d'instabilités de service. 

**SneakySkink-harvester** résout ce problème en agissant comme un "aspirateur" de données autonome. Il tourne en tâche de fond 24h/24, orchestre un pool de clés d'API BB3 pour optimiser les quotas de requêtes, résiste intelligemment aux erreurs réseau, et stocke toutes les données récoltées dans une base PostgreSQL locale hautement indexée.

---

## 2. Cartographie de l'Écosystème SneakySkink

Pour garantir une maintenance simplifiée et une évolutivité maximale, le projet est découpé en plusieurs dépôts indépendants :

1. **`sneakyskink-bdd` :**
   * **Rôle :** Unique source de vérité (SSOT) pour la base de données PostgreSQL, les migrations et le client Prisma partagé par tous les microservices.
   * **Technos :** Prisma (PostgreSQL), TypeScript.
2. **`SneakySkink-harvester` (Ce dépôt) :** 
   * **Rôle :** Démon autonome d'ingestion (Écriture base de données via `sneakyskink-bdd`).
   * **Technos :** Node.js, TypeScript, sneakyskink-bdd, Redis & BullMQ, Pino (logger), Axios.
3. **`SneakySkink-API` :**
   * **Rôle :** API REST customisée en lecture seule exposant les données de la base PostgreSQL indexée pour le public (via `sneakyskink-bdd`).
   * **Technos :** Express, TypeScript, sneakyskink-bdd, Redis (BullMQ, cache).
4. **`SneakySkink-web` :**
   * **Rôle :** Site web de consultation de classements, statistiques et fiches d'équipes (mobile-first).
   * **Technos :** Next.js (React), Tailwind CSS / Vanilla CSS.
5. **`SneakySkink-discord` & `SneakySkink-twitch` :**
   * **Rôle :** Bots d'interaction pour notifier les communautés (ex: fin de match, classement mis à jour) et permettre des requêtes rapides par commande.

---

## 3. Choix d'Architecture Clés du Harvester

Pour garantir la pérennité du harvester, nous appliquons deux concepts fondamentaux :

### A. L'Adapter Pattern (Futur WBB)
Le jeu Blood Bowl 3 va évoluer vers une nouvelle version appelée **WBB**. L'API officielle changera probablement de format.
* **Solution :** Notre base de données PostgreSQL utilise des modèles de données *standardisés et abstraits* représentant le sport Blood Bowl (un Match a deux Équipes, des Joueurs avec des Statistiques, etc.).
* **Les Parseurs :** Le dossier `src/parsers/` contient des adaptateurs spécifiques. L'adaptateur BB3 prend le JSON brut de Cyanide et le convertit au format standard avant insertion. Lorsque WBB arrivera, nous écrirons simplement un adaptateur `wbb` sans modifier la base de données, ni l'API REST publique, ni les clients.

### B. L'APIKeyManager & Résilience Réseau
Pour contourner les limites strictes de quota :
* Le Harvester utilise un **Pool de clés API** configuré dans `.env`.
* Un module `APIKeyManager` distribue dynamiquement les clés disponibles, calcule le ratio d'appel restant par minute, et met en pause l'aspiration si la limite globale est atteinte.
* En cas de retour **HTTP 429 (Too Many Requests)**, la clé concernée est temporairement mise en quarantaine (Cooldown de 15 minutes) et le trafic bascule sur les autres.
* En cas de panne de l'API officielle (**HTTP 500/503**), le harvester bascule en mode **Exponential Backoff** pour espacer les tentatives de reconnexion et ne pas aggraver la surcharge du serveur de Cyanide.

### C. La File d'Attente Prioritaire (Redis & BullMQ)
Le harvester utilise **BullMQ** pour gérer les tâches de scraping avec des niveaux de priorité :
* **Haute Priorité :** Récupérer un match en direct ou fraîchement terminé (mise à jour instantanée).
* **Moyenne Priorité :** Scanner régulièrement (chaque heure) les ligues suivies pour détecter les nouveaux matchs programmés ou joués.
* **Basse Priorité :** Travail de fond (archivage des anciennes saisons, remplissage de l'historique complet d'une nouvelle ligue).

### D. Centralisation de la BDD (Single Source of Truth)
Pour éviter la duplication des fichiers de schéma `schema.prisma` et assurer la cohérence absolue des modèles entre l'ingestion, l'API et les bots :
* Le schéma SQL et le client Prisma typé sont isolés à 100% dans le paquet partagé `sneakyskink-bdd`.
* Le Harvester et l'API intègrent ce dépôt commun sous forme de dépendance NPM (`file:` en local).
* Toute modification du schéma doit se faire au centre, dans `sneakyskink-bdd`, puis propagée par une commande de build simple (`npm run build --prefix ../sneakyskink-bdd`).

---

## 4. Guide de Développement & Règles pour l'IA

Lors de la rédaction de code pour ce dépôt, l'IA et les développeurs doivent respecter scrupuleusement les consignes suivantes :

* **TypeScript Strict :** Pas de `any`. Toujours typer explicitement les entrées/sorties de fonctions, les réponses de l'API, et les modèles de données.
* **Logging Propre :** Utiliser exclusivement le logger configuré dans `src/utils/logger.ts` (basé sur **Pino**). Chaque appel API, rotation de clé, erreur ou écriture en DB doit être loggué à un niveau approprié (`info`, `debug`, `warn`, `error`).
* **Prise en charge de la DB :** Toute modification de la structure de données se fait **uniquement** via le schéma du dépôt partagé `sneakyskink-bdd` (`sneakyskink-bdd/prisma/schema.prisma`) avec des migrations claires. Les projets clients (Harvester, API) n'ont pas de schéma local et importent le client généré depuis `sneakyskink-bdd`.
* **Pas de Busy-Waiting :** Toujours utiliser des mécanismes asynchrones basés sur des Promises ou des files d'attente (Redis/BullMQ) plutôt que des boucles d'attente bloquantes (`while(true)`).
