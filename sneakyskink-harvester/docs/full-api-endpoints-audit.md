# Cartographie Complète des Endpoints de l'API Blood Bowl 3 (Cyanide)

Ce document présente un audit exhaustif de **tous les endpoints** listés dans la documentation officielle de Cyanide pour Blood Bowl 3 (contenant `"game": "bb3"` plus l'endpoint global `status` sous `"game": "cya"`).

Pour chaque méthode, nous analysons ses arguments, son utilité, et la **stratégie d'intégration dans SneakySkink-harvester**.

---

## Sommaire des Endpoints Audités

1. [arenafinalscontenders](#1-arenafinalscontenders) — Équipes qualifiées aux playoffs Arena
2. [coaches](#2-coaches) — Liste des coachs d'une ligue/compétition
3. [competitions](#3-competitions) — Liste des compétitions d'une ligue
4. [contests](#4-contests) — Calendrier, statut et scores des matchs (Scheduled, InProgress, Played, Validated)
5. [gamecount](#5-gamecount) — Volume quotidien de matchs joués sur l'API
6. [gamestats](#6-gamestats) — Statistiques agrégées de jeux pour une compétition
7. [halloffame](#7-halloffame) — Tableau d'honneur historique (⚠️ Incompatible BB3)
8. [ladder](#8-ladder) — Classements, classements filtrés (Winrate, TV, Concedes)
9. [league](#9-league) — Détails et métadonnées d'une ligue spécifique
10. [leagues](#10-leagues) — Recherche et listage global de ligues actives
11. [lookup](#11-lookup) — Moteur de recherche et de résolution rapide par Nom/ID (Ligue, Compétition, Équipe, Coach)
12. [match](#12-match) — Feuille de match ultra-détaillée (rosters, XP, stats de joueurs)
13. [matches](#13-matches) — Liste chronologique des matchs récents d'une ligue/compétition
14. [player](#14-player) — Fiche d'identité d'un joueur (XP, niveau, blessures, compétences)
15. [rss](#15-rss) — Flux d'actualités officiel de Blood Bowl
16. [rules](#16-rules) — Règles et métadonnées officielles du jeu (skills, etc.)
17. [sprintranking](#17-sprintranking) — Classement par sprint
18. [stats](#18-stats) — Statistiques globales diverses
19. [team](#19-team) — Fiche complète d'une équipe (roster, apothicaire, relances, supporters, coach)
20. [teammatches](#20-teammatches) — Liste chronologique des matchs joués par une équipe
21. [teams](#21-teams) — Liste simplifiée des équipes d'une ligue/compétition
22. [top](#22-top) — Les meilleures équipes par faction de jeu
23. [status](#23-status) — État de santé des serveurs de Cyanide

---

## 1. arenafinalscontenders

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/arenafinalscontenders/`
* **Arguments :**
  - `season` : Numéro de la saison active ou passée (`0=last`, `7`, `8`, `9`, etc.).
* **Utilité & Historique :** Récupère la liste des équipes qualifiées pour les playoffs officiels de Cyanide via le format Arena. Ajouté le 17/07/2025.
* **Stratégie d'Ingestion Harvester :** *Optionnelle.* Utile uniquement si notre application web souhaite afficher les qualifiés officiels des tournois de Cyanide. Nous pouvons stocker ce payload dans une table de métadonnées de saison ou l'exposer via un cache JSON.

---

## 2. coaches

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/coaches/`
* **Arguments :**
  - `league|league_name` : Nom de la ligue cible (Défaut: "Official League").
  - `competition|competition_name` : Nom de la compétition cible (Défaut: "Open Ladder").
  - `platform|platform_name` : `pc` | `playstation` | `xbox`.
  - `limit|max` : Nombre max de résultats (Défaut: 100).
  - `bb|opus` : Opus `1` | `2` | `3`.
* **Utilité & Historique :** Liste les coachs inscrits dans une ligue ou division spécifique.
* **Stratégie d'Ingestion Harvester :** *Recommandée.* Permet de pré-remplir notre table `coaches` avant même que les premiers matchs ne soient joués, facilitant la cartographie des profils des joueurs pour l'application.
* **Modèle Prisma Cible :** `Coach` (liaisons et création automatique des profils).

---

## 3. competitions

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/competitions/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Nom ou identifiant unique de la ligue parente.
  - `platform|platform_name` : `pc` | `playstation` | `xbox`.
  - `bb|opus` : Opus `1` | `2` | `3` (Spécifier `bb=3` obligatoire).
  - `limit|max` : Nombre global de compétitions max.
  - `limit|competitions_limit` : Limite ciblée sur les compétitions.
  - `limit|leagues_limit` : Limite ciblée sur les ligues associées.
  - `exact` : Match exact du nom de la ligue `0` | `1`.
* **Utilité & Historique :** Liste toutes les compétitions (divisions, tournois, poules) créées sous une ligue. Indique le format de jeu (`Knockout`, `RoundRobin`, `Wissen`, `Ladder`) et le statut (`InProgress`, `Scheduled`, `Played`, `Validated`).
* **Stratégie d'Ingestion Harvester :** *Indispensable (Planifié dans notre boucle principale).* C'est le point d'entrée pour découvrir les sous-divisions d'une ligue enregistrée. Le Harvester l'interroge régulièrement pour mettre à jour les compétitions actives.
* **Modèle Prisma Cible :** `Competition` (création/mise à jour du statut, du format, et du nombre de rounds).

---

## 4. contests

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/contests/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Identifiants de la ligue.
  - `competition|competition_name` ou `competition|competition_id` : Identifiants de la division.
  - `status|contest_status` : Statut des matchs recherchés (`Scheduled` | `InProgress` | `Played` | `Validated`).
  - `round` : Numéro de journée. *Note : Bientôt déprécié au profit de `competition_round` et `contest_round`.*
  - `platform|platform_name` : `pc` | `playstation` | `xbox`.
  - `limit|max` : Limite de résultats.
  - `exact` : Match exact du nom.
* **Utilité & Historique :** Remplaçant officiel de l'ancien endpoint déprécié `upcoming_matches`. C'est le **calendrier dynamique** de la compétition. Il liste les matchs prévus, en cours de jeu, terminés, et validés administrativement.
* **Stratégie d'Ingestion Harvester :** *Cœur Névralgique de l'Ingestion.* Le Harvester interroge régulièrement `contests` avec `status=Played` ou `Validated` pour détecter les matchs terminés. Il extrait leurs IDs uniques, les compare à notre base de données locale, et planifie l'aspiration des détails de ces matchs (via l'endpoint `match`) si ceux-ci n'existent pas encore en DB.
* **Modèle Prisma Cible :** Sert de filtre d'orchestration avant d'écrire en DB (Match, Teams).

---

## 5. gamecount

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/gamecount/`
* **Arguments :**
  - `start` : Date de début (`YYYY-MM-DD`, défaut: il y a 7 jours).
  - `end` : Date de fin (`YYYY-MM-DD`, défaut: aujourd'hui).
* **Utilité & Historique :** Retourne le nombre brut de matchs joués quotidiennement sur toute l'API. Ajouté le 18/07/2025 pour du monitoring global.
* **Stratégie d'Ingestion Harvester :** *Ignoré.* Utile uniquement pour faire des graphiques de statistiques globales de l'activité du jeu Blood Bowl 3 dans le monde.

---

## 6. gamestats

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/gamestats/`
* **Arguments :**
  - `competitionId|uuid` : ID unique de la compétition.
  - `start` : Date de début (`YYYY-MM-DD`, défaut: hier).
  - `end` : Date de fin (`YYYY-MM-DD`, défaut: demain).
* **Utilité & Historique :** Fournit des statistiques globales sur les matchs d'une compétition durant une plage horaire donnée.
* **Stratégie d'Ingestion Harvester :** *Utile.* Permet à l'API Rest custom de récupérer des agrégats pré-calculés par Cyanide pour de la visualisation de tendances globales. Pas nécessaire pour l'ingestion brute de notre Harvester qui calcule déjà ces métriques précisément à partir des fiches de matchs individuels.

---

## 7. halloffame

* **Game :** `bb3`
* **⚠️ Statut :** **INCOMPATIBLE AVEC BB3** (Confirmé par le changelog officiel Cyanide du 30/05/2023 : *"Not compatible with BB3"*).
* **Stratégie d'Ingestion Harvester :** *Exclu.* L'endpoint ne doit jamais être appelé en mode BB3 pour éviter le gaspillage de quotas.

---

## 8. ladder

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/ladder/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Nom ou ID de la ligue.
  - `competition|competition_name` ou `competition|competition_id` : Nom ou ID de la compétition.
  - `ladder_size|size|limit` : Taille du classement à récupérer.
  - `tv_min` / `tv_max` : Tranche de Valeur d'Équipe (TV) ciblée.
  - `concede_min` / `concede_max` : Taux de concessions maximums/minimums tolérés.
  - `match_min` / `match_max` : Tranche du nombre de matchs joués.
  - `winrate_min` / `winrate_max` : Tranche du taux de victoire ciblée.
* **Utilité & Historique :** Récupère le classement (Leaderboard) d'un championnat ou d'un ladder public, avec des filtres avancés d'analyse.
* **Stratégie d'Ingestion Harvester :** *Recommandée (Synchronisation quotidienne).* Permet de synchroniser les classements calculés par le serveur de Cyanide pour vérifier la cohérence de notre classement local.
* **Modèle Prisma Cible :** Utile pour mettre à jour des agrégats d'équipes (`Team` value, concede rates, ratios).

---

## 9. league

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/league/`
* **Arguments :**
  - `league|league_name|name` ou `league|league_id|id` : Identifiants uniques de la ligue parente.
  - `platform|platform_name` : `pc` | `playstation` | `xbox`.
  - `bb|opus` : Opus `1` | `2` | `3`.
* **Utilité & Historique :** Récupère les métadonnées spécifiques d'une ligue (date de création, logo officiel, etc.).
* **Stratégie d'Ingestion Harvester :** *Obligatoire.* Utilisé lors de la première synchronisation ou lors de l'ajout d'une ligue à monitorer par l'utilisateur pour vérifier que la ligue existe et enregistrer ses métadonnées.
* **Modèle Prisma Cible :** `League` (logo, nom officiel, statut actif).

---

## 10. leagues

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/leagues/`
* **Arguments :**
  - `platform|platform_name` : `pc` | `playstation` | `xbox`.
  - `league|league_name` / `league|league_id|id` : Filtres de recherche par nom/ID.
  - `limit|max` : Limite de recherche.
  - `gamers_count` : Nombre minimum de joueurs requis pour figurer dans la liste (Spécifique BB3, ajouté le 17/02/2025).
* **Utilité & Historique :** Moteur de recherche global pour lister les ligues actives sur Blood Bowl 3.
* **Stratégie d'Ingestion Harvester :** *Utile.* Permet à notre future interface web de proposer un champ d'autocomplétion ou de recherche de ligues actives à l'utilisateur.

---

## 11. lookup

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/lookup/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Nom/ID de ligue.
  - `competition|competition_name` ou `competition|competition_id` : Nom/ID de compétition.
  - `team|team_name` ou `team|team_id` : Nom/ID d'équipe.
  - `coach|coach_name` ou `coach|coach_id` : Nom/ID de coach.
  - `exact` : Match exact `0` | `1`.
  - `instruction|hint` : Filtre sur les compétitions (`HAS_CONTESTS` | `NOT_LADDER` | `ONLY_LADDER`).
  - `fallback` : Autoriser une recherche par défaut si non trouvé.
* **Utilité & Historique :** Point d'entrée universel ajouté le 22/06/2023. Il permet de résoudre instantanément n'importe quel ID ou nom d'entité sur l'API Blood Bowl 3.
* **Stratégie d'Ingestion Harvester :** *Extrêmement Utile.* C'est notre outil principal de résolution. Par exemple, si l'utilisateur configure une ligue uniquement par son nom textuel "Ligue de France", le Harvester appellera `lookup` pour récupérer son UUID exact de façon robuste.

---

## 12. match

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/match/`
* **Arguments :**
  - `match_id|uuid|id` : UUID unique du match.
  - `platform|platform_name` : `pc` | `playstation` | `xbox` (détection automatique possible).
  - `rosters` : Afficher les rosters complets des équipes avec statistiques par joueur `0` | `1` (Défaut: `1`).
* **Utilité & Historique :** Renvoie la **feuille de match définitive**. Contient toutes les statistiques détaillées (XP, blocages réussis, mètres courus, blessures contractées, MVP, etc.).
* **Stratégie d'Ingestion Harvester :** *Absolument Crucial.* Le Harvester appelle cet endpoint pour récupérer et enregistrer en base la feuille de match complète de chaque match identifié comme joué dans `contests`. Cet appel consomme 1 unité de quota horaire et est sauvegardé définitivement en DB.
* **Modèle Prisma Cible :** `Match`, `PlayerMatchStats`, `Player` (mise à jour de l'XP et du niveau), `Team` (mise à jour de la TV et de la trésorerie).

---

## 13. matches

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/matches/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Identifiant de ligue.
  - `competition|competition_name` ou `competition|competition_id` : Identifiant de compétition.
  - `limit|max` : Nombre maximum de matchs à retourner (Défaut: 100).
  - `start` / `end` : Date de début et de fin.
  - `order|ordering` : Tri chronologique `started` | `finished`.
  - `id_only` : Retourner uniquement les IDs pour économiser la bande passante `0` | `1`.
  - `team_id|team` : Filtrer sur une équipe spécifique.
  - `team_stats|stats` : Afficher ou masquer les statistiques globales d'équipe `0` | `1` (Défaut: `1`).
* **Utilité & Historique :** Liste les matchs d'une ligue ou compétition sous forme de flux chronologique.
* **Stratégie d'Ingestion Harvester :** *Alternative robuste.* Peut servir pour faire des aspirations historiques par blocs de dates (`start`/`end`), par exemple en demandant uniquement les IDs (`id_only=1`) pour ensuite planifier le téléchargement individuel des fiches de matchs.

---

## 14. player

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/player/`
* **Arguments :**
  - `player|id` : ID unique du joueur.
  - `player|name` : Nom du joueur (ignoré si l'ID est fourni).
* **Utilité & Historique :** Récupère la fiche signalétique à jour d'un joueur (compétences acquises, niveau, blessures courantes, et état de suspension `suspended_next_match`).
* **Stratégie d'Ingestion Harvester :** *Optionnelle.* Le Harvester met déjà à jour les joueurs lors de la synchronisation de l'équipe (via `team`) ou lors d'un match (via `match`). Toutefois, appeler `player` permet de mettre à jour un joueur spécifique de façon ultra-légère si un bug est détecté.
* **Modèle Prisma Cible :** `Player`.

---

## 15. rss

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/rss/`
* **Arguments :** Aucun.
* **Utilité & Historique :** Récupère le flux RSS des actualités officielles du jeu.
* **Stratégie d'Ingestion Harvester :** *Ignoré.* Non pertinent pour notre Harvester centré sur la collecte de statistiques de matchs.

---

## 16. rules

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/rules/`
* **Arguments :**
  - `rule|rules|ruleset` : Nom de la règle (ex : `"skills"` pour lister toutes les compétences).
* **Utilité & Historique :** Point d'accès technique ajouté le 17/11/2023. Il fournit les métadonnées officielles de Blood Bowl 3 (par exemple, le dictionnaire complet des compétences avec leurs catégories : Agility, Strength, General, Extraordinary).
* **Stratégie d'Ingestion Harvester :** *Crucial (Seeding).* Utilisé lors de l'initialisation de notre base de données (seeding) pour disposer du référentiel officiel des compétences de Cyanide et pouvoir traduire automatiquement les codenames d'API dans notre frontend.

---

## 17. sprintranking

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/sprintranking/`
* **Arguments :**
  - `competition_id` ou `competition_name` : Identifiants de la compétition.
  - `match_threshold` : Seuil de matchs requis (actuellement fixé à 20 minimum).
* **Utilité & Historique :** Renvoie le classement d'une compétition calculé sous forme de sprints compétitifs. Ajouté le 16/12/2024.
* **Stratégie d'Ingestion Harvester :** *Optionnelle.* Utilisé uniquement si nos ligues monitorées emploient ce type de format compétitif.

---

## 18. stats

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/stats/`
* **Arguments :**
  - `stats|stat` : Liste de statistiques demandées séparées par des virgules.
* **Utilité & Historique :** Fournit des statistiques globales diverses sur l'écosystème du jeu.
* **Stratégie d'Ingestion Harvester :** *Ignoré.* Non spécifique aux ligues monitorées par le Harvester.

---

## 19. team

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/team/`
* **Arguments :**
  - `team|id` ou `team|name` : Identifiants de l'équipe.
  - `coach` : Récupérer les informations du coach `0` | `1` (Défaut: `1`).
  - `roster` : Récupérer le roster complet des joueurs `0` | `1` (Défaut: `1`).
  - `stats|statistics` : Récupérer les statistiques historiques des joueurs `0` | `1` (Défaut: `0`).
  - `skills` : Inclure les compétences des joueurs `0` | `1` (Défaut: `1`).
  - `casualties` : Inclure les blessures actives des joueurs `0` | `1` (Défaut: `1`).
* **Utilité & Historique :** Récupère la **fiche complète et à jour d'une équipe**. Indique la trésorerie (`cash`), les relances (`rerolls`), l'apothicaire (`apothecary`), les pom-pom girls (`cheerleaders`), les assistants (`assistantcoaches`), les supporters dévoués (`popularity`), et liste tous les joueurs actuellement sous contrat dans le roster avec leurs attributs physiques et blessures actives.
* **Stratégie d'Ingestion Harvester :** *Absolument Crucial.* Le Harvester appelle `team` pour chaque équipe participant à une compétition active afin de synchroniser l'état actuel de son effectif (avant ou après un match).
* **Modèle Prisma Cible :** `Team`, `Player` (création massive ou mise à jour du statut "ACTIVE", "RETIRED", etc.).

---

## 20. teammatches

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/teammatches/`
* **Arguments :**
  - `team_id|team` : ID unique de l'équipe cible.
  - `limit` : Nombre max de résultats.
  - `start` / `end` : Bornes temporelles.
  - `order|ordering` : Tri `started` | `finished`.
* **Utilité & Historique :** Récupère l'historique chronologique des rencontres disputées par une équipe spécifique.
* **Stratégie d'Ingestion Harvester :** *Utile.* Permet de faire une synchronisation ciblée sur une équipe nouvellement inscrite dans notre système pour importer son historique de matchs récents sans devoir scanner toute sa ligue.

---

## 21. teams

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/teams/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Nom ou ID de la ligue cible.
  - `competition|competition_name` ou `competition|competition_id` : Nom ou ID de la division.
  - `limit|max` : Nombre maximum de résultats.
  - `sensitive|case_sensitive` : Sensibilité à la casse.
  - `race` : Inclure les informations sur la race `0` | `1` (Défaut: `1`).
  - `logo` : Inclure le logo technique de l'équipe `0` | `1` (Défaut: `1`).
  - `last_match` : Récupérer la date du dernier match de l'équipe `0` | `1` (Défaut: `1`).
* **Utilité & Historique :** Liste de façon simplifiée toutes les équipes enregistrées au sein d'une ligue ou d'une compétition.
* **Stratégie d'Ingestion Harvester :** *Indispensable (Découverte).* Le Harvester interroge `teams` au démarrage d'une boucle de synchronisation de division pour identifier toutes les équipes inscrites, afin de pouvoir planifier les requêtes `team` détaillées de chacune d'elles.
* **Modèle Prisma Cible :** Identification des liaisons équipes/compétitions.

---

## 22. top

* **Game :** `bb3`
* **URL de Base :** `https://web.cyanide-studio.com/ws/bb3/top/`
* **Arguments :**
  - `league|league_name` ou `league|league_id` : Identifiant de ligue.
  - `competition|competition_name` ou `competition|competition_id` : Identifiant de compétition.
  - `top|top_size|size|limit` : Nombre de résultats désiré.
* **Utilité & Historique :** Retourne la liste des meilleures équipes triées par faction (race) au sein d'une compétition ou ligue. Ajouté le 01/09/2023 pour BB3.
* **Stratégie d'Ingestion Harvester :** *Intéressant.* Permet à l'API ou au site Web d'afficher un tableau d'honneur des meilleures équipes par faction en temps réel (ex: la meilleure équipe Orc, la meilleure équipe Elfe Sylvain, etc.).

---

## 23. status

* **Game :** `cya` (Global Cyanide Web-services Status)
* **URL de Base :** `https://web.cyanide-studio.com/ws/cya/status/`
* **Arguments :** Aucun.
* **Utilité & Historique :** Endpoint technique de diagnostic retournant la disponibilité et la charge courante des serveurs de webservices de Cyanide.
* **Stratégie d'Ingestion Harvester :** *Indispensable (Healthcheck / Disjoncteur).* Avant d'initier une grosse session d'ingestion (par exemple, au démarrage du démon ou toutes les heures), le Harvester interroge `status`. Si les serveurs de Cyanide signalent une indisponibilité (HTTP 503 ou payload d'erreur), le Harvester bascule en mode veille temporaire (cooldown) pour préserver les ressources et éviter les requêtes inutiles dans le vide.
