# Rapport d'Audit de l'API Blood Bowl 3 & Modélisation DB

Ce document présente l'analyse technique des payloads réels retournés par l'API officielle de Cyanide pour Blood Bowl 3 (BB3), ainsi que le schéma de base de données PostgreSQL cible conçu pour **SneakySkink-harvester**.

---

## 1. Analyse des Quotas & Limites d'Appels

La documentation officielle de Cyanide spécifie des quotas stricts d'utilisation par clé d'API :
* **Limite Horaire :** **1 000 requêtes par heure**.
* **Limite Journalière :** **10 000 requêtes par jour**.

### Impact sur l'Architecture de SneakySkink :
1. **Mise en cache définitive des matchs terminés :** Une fois qu'un match est marqué comme `PLAYED` (ou `Validated`), son contenu ne change plus jamais. Le Harvester doit l'aspirer **une seule fois** et ne plus jamais le requêter auprès de Cyanide.
2. **Scraping Delta :** Pour le suivi temps réel d'une ligue active, il suffit d'interroger la liste des compétitions et l'endpoint `contests` avec le paramètre `status=Played` ou `status=Validated` toutes les 10-15 minutes (soit ~4 à 6 appels par heure).
3. **Queue Ingestion Asynchrone :** Les imports massifs historiques (ex: aspirer 500 anciens matchs d'une ligue) doivent être planifiés par lots et étalés dans le temps pour ne pas heurter la limite horaire de 1 000 requêtes.

---

## 2. Analyse des Payloads & Entités Réelles

En exécutant nos scripts unitaires d'exploration, nous avons pu capturer des réponses réelles de l'API de Cyanide :

### A. Endpoint `leagues` & `league`
* **Structure :** Renvoie un identifiant unique sous forme de UUID string (ex : `"50000000-0000-0000-0000-000000000025"`), un nom, et le nombre de coachs (`gamer_count`).
* **URLs d'assets :** L'API fournit les racines URL pour télécharger les images officiels (`https://images.cyanide-studio.com/bb3/logos/`, `races/`, `portraits/`, `skillicons/`).

### B. Endpoint `competitions`
* **Structure :** Contient la liste des divisions/tournois.
* **Informations clés :**
  - Le `format` (ex : `"Knockout"`, `"RoundRobin"`, `"Wissen"`, `"Ladder"`).
  - Le `status_name` (ex : `"InProgress"`, `"Scheduled"`, `"Played"`, `"Validated"`).
  - Les durées de tour et de banque de temps (`turn_duration`, `time_bonus_duration`).
  - La liaison vers la ligue parente (`league` avec son ID et son nom).

### C. Endpoint `team` (complet avec `roster=1`, `skills=1`, `casualties=1`)
* **Informations de l'équipe :** Contient l'ID, la Trésorerie (`cash`), la Valeur d'Équipe (`value` = TV), les relances (`rerolls`), l'apothicaire (`apothecary`), les pom-pom girls (`cheerleaders`), les assistants (`assistantcoaches`), la popularité/supporters dévoués (`popularity`), et l'ID de race (ex: `12` pour les Amazones).
* **Roster des Joueurs :** Chaque joueur possède :
  - Son `number` (numéro de maillot), son `level`, ses points d'XP, sa valeur en pièces d'or.
  - Ses **Attributs de base** sous forme d'entiers : `ma` (Mouvement), `st` (Force), `ag` (Agilité), `pa` (Passe), `av` (Armure). *Note : dans les règles BB2020/BB3, Agilité et Passe sont des jets cibles (ex: `ag: 3` correspond à un jet de 3+), ce qui est stocké sous forme d'entier simple.*
  - Ses **Skills** : Liste de chaînes de caractères (ex : `["dodge", "block", "hit and run"]`).
  - Ses **Blessures** : Liste d'IDs et de noms de blessures actives (`casualties_state`).
  - Son statut de suspension pour le match suivant (`suspended_next_match`).

### D. Endpoint `match` (complet avec `rosters=1`)
* C'est le payload le plus complet (~38 Ko par match).
* **Informations globales :** `id` (UUID), dates de début et de fin (`started`, `finished`), scores globaux, round (journée de championnat), plateforme de jeu (`pc`, `playstation`, `xbox`).
* **Coaches :** Identifiants et pseudos des deux coachs.
* **Teams & Roster Match Sheets :** Pour chaque équipe du match, l'API retourne la liste complète des joueurs ayant joué le match avec leurs statistiques **spécifiques à cette rencontre** :
  - `mvp` (`true` / `false`).
  - `xp_gain` (SPP gagnés durant le match, ex: 4 pour un MVP).
  - Les actions du match : `blocks_succeeded`, `armour_breaks`, `injuries_inflicted`, `stun_inflicted`, `yards_rushing` (course), `pick_up_success`, `pass_success`, etc.
  - Les blessures subies lors de ce match précis (`NewCasualty` ex : `["badly_hurt"]`).

---

## 3. Schéma Prisma PostgreSQL Définitif

Ce schéma a été conçu pour coller **exactement** à la structure des données réelles de l'API de Cyanide tout en étant optimisé pour de futures requêtes d'agrégation de statistiques (ex : "Classement des meilleurs marqueurs de Touchdowns", "Taux de mortalité par race", "Historique de blessures d'un joueur").

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// 1. Structure de la Ligue et des Compétitions
// -------------------------------------------------------------

model League {
  id           String        @id // UUID retourné par Cyanide
  name         String
  logo         String?
  gamerCount   Int?          @map("gamer_count")
  active       Boolean       @default(true)
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("last_update")
  competitions Competition[]
  matches      Match[]

  @@map("leagues")
}

model Competition {
  id                 String   @id // UUID retourné par Cyanide
  name               String
  format             String   // "Knockout" | "RoundRobin" | "Wissen" | "Ladder"
  status             String   // "InProgress" | "Scheduled" | "Played" | "Validated"
  round              Int?
  roundsCount        Int?     @map("rounds_count")
  turnDuration       Int      @map("turn_duration")
  timeBonusDuration  Int      @map("time_bonus_duration")
  teamsMax           Int?     @map("teams_max")
  teamsCount         Int?     @map("teams_count")
  leagueId           String   @map("league_id")
  league             League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  matches            Match[]
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("last_update")

  @@map("competitions")
}

// -------------------------------------------------------------
// 2. Acteurs (Coachs, Équipes et Joueurs)
// -------------------------------------------------------------

model Coach {
  id           String   @id // UUID de Cyanide (idcoach)
  name         String
  lastLang     String?  @map("last_lang")
  country      String?
  twitch       String?
  youtube      String?
  teams        Team[]
  homeMatches  Match[]  @relation("HomeCoach")
  awayMatches  Match[]  @relation("AwayCoach")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("last_update")

  @@map("coaches")
}

model Team {
  id                String   @id // UUID de Cyanide
  name              String
  raceId            Int      @map("race_id") // ID technique de race (ex: 12 = Amazon, 18 = Nurgle)
  logo              String?
  value             Int      // Valeur d'Équipe (TV) en k (ex: 1280)
  cash              Int      // Trésorerie en pièces d'or
  cheerleaders      Int      @default(0)
  assistantCoaches  Int      @default(0) @map("assistant_coaches")
  popularity        Int      @default(0) // Supporters dévoués / Popularité
  rerolls           Int      @default(0)
  apothecary        Int      @default(0)
  
  // Statistiques de victoires/défaites cache
  wins              Int      @default(0)
  draws             Int      @default(0)
  losses            Int      @default(0)
  score             Int      @default(0)

  coachId           String   @map("coach_id")
  coach             Coach    @relation(fields: [coachId], references: [id])
  players           Player[]
  homeMatches       Match[]  @relation("HomeTeam")
  awayMatches       Match[]  @relation("AwayTeam")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("last_update")

  @@map("teams")
}

model Player {
  id                  String             @id // UUID du Joueur de Cyanide
  name                String?
  number              Int                // Numéro de maillot (1 à 16)
  value               Int                // Valeur individuelle en pièces d'or
  xp                  Int                @default(0)
  level               Int                @default(1)
  type                String             // Nom de positional (ex: "amazon_humanBlocker")
  status              String             @default("ACTIVE") // "ACTIVE" | "RETIRED" | "DEAD"
  suspendedNextMatch  Boolean            @default(false) @map("suspended_next_match")
  
  // Attributs physiques (jets cibles pour AG/PA/AV)
  ma                  Int                // Movement Allowance (ex: 6)
  st                  Int                // Strength (ex: 4)
  ag                  Int                // Agility (ex: 3 pour 3+)
  pa                  Int                // Passing Ability (ex: 5 pour 5+)
  av                  Int                // Armor Value (ex: 9 pour 9+)
  
  // Compétences et blessures
  innateSkills        String[]           @map("innate_skills") // Compétences innées de base
  acquiredSkills      String[]           @map("acquired_skills") // Compétences achetées via montée de niveau
  activeCasualties    String[]           @map("active_casualties") // Liste des blessures courantes (ex: ["serious_injury"])
  
  teamId              String             @map("team_id")
  team                Team               @relation(fields: [teamId], references: [id], onDelete: Cascade)
  matchStats          PlayerMatchStats[]
  createdAt           DateTime           @default(now()) @map("created_at")
  updatedAt           DateTime           @updatedAt @map("last_update")

  @@map("players")
}

// -------------------------------------------------------------
// 3. Matchs & Feuilles de Statistiques Détaillées
// -------------------------------------------------------------

model Match {
  id              String             @id // UUID du Match de Cyanide
  startedAt       DateTime           @map("started_at")
  finishedAt      DateTime           @map("finished_at")
  round           Int                // Journée / Round du match
  platform        String             // "pc" | "playstation" | "xbox"
  status          String             // "PLAYED" | "SCHEDULED" | "LIVE" | "VALIDATED"
  
  // Relations Ligues / Compétitions
  leagueId        String             @map("league_id")
  league          League             @relation(fields: [leagueId], references: [id])
  competitionId   String             @map("competition_id")
  competition     Competition        @relation(fields: [competitionId], references: [id], onDelete: Cascade)
  
  // Équipes
  homeTeamId      String             @map("home_team_id")
  homeTeam        Team               @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeamId      String             @map("away_team_id")
  awayTeam        Team               @relation("AwayTeam", fields: [awayTeamId], references: [id])
  
  // Coachs
  homeCoachId     String?            @map("home_coach_id")
  homeCoach       Coach?             @relation("HomeCoach", fields: [homeCoachId], references: [id])
  awayCoachId     String?            @map("away_coach_id")
  awayCoach       Coach?             @relation("AwayCoach", fields: [awayCoachId], references: [id])
  
  // Scores
  homeScore       Int                @map("home_score")
  awayScore       Int                @map("away_score")
  
  // Statistiques agrégées par équipe pour des requêtes rapides
  homeStats       Json?              @map("home_stats") // Payload brut des stats globales de l'équipe domicile
  awayStats       Json?              @map("away_stats") // Payload brut des stats globales de l'équipe extérieur
  
  playerStats     PlayerMatchStats[]
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("last_update")

  @@map("matches")
}

model PlayerMatchStats {
  id                String   @id @default(uuid())
  matchId           String   @map("match_id")
  match             Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  playerId          String   @map("playerId")
  player            Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  teamId            String   @map("team_id") // Facilite le filtrage des stats par équipe sans jointure complexe
  
  // SPP & Match jouabilité
  matchPlayed       Boolean  @default(true) @map("match_played")
  mvp               Boolean  @default(false)
  xpGained          Int      @default(0) @map("xp_gained")
  
  // Statistiques offensives & de balle
  touchdowns        Int      @default(0)
  passes            Int      @default(0)
  catches           Int      @default(0)
  interceptions     Int      @default(0)
  yardsRunning      Int      @default(0) @map("yards_running")
  yardsPassing      Int      @default(0) @map("yards_passing")
  
  // Statistiques physiques & Défense
  blocksSucceeded   Int      @default(0) @map("blocks_succeeded")
  blocksSustained   Int      @default(0) @map("blocks_sustained")
  armourBreaks      Int      @default(0) @map("armour_breaks")
  tackles           Int      @default(0)
  pushouts          Int      @default(0)
  
  // Dégâts Infligés
  casualtiesInflicted Int    @default(0) @map("casualties_inflicted")
  koInflicted         Int    @default(0) @map("ko_inflicted")
  injuriesInflicted   Int    @default(0) @map("injuries_inflicted")
  deadInflicted       Int    @default(0) @map("dead_inflicted")
  
  // Dégâts Subis
  casualtiesSustained Int    @default(0) @map("casualties_sustained")
  koSustained         Int    @default(0) @map("ko_sustained")
  injuriesSustained   Int    @default(0) @map("injuries_sustained")
  deadSustained       Int    @default(0) @map("dead_sustained")
  
  // Blessure subie lors de ce match précis (ex: ["badly_hurt"])
  newCasualties       String[] @map("new_casualties")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("last_update")

  @@map("player_match_stats")
}
```

---

## 4. Prochaines Étapes Validées par l'Audit

1. **Création physique du schéma Prisma :** Écrire ce schéma dans `prisma/schema.prisma` du Harvester.
2. **Initialisation de la base PostgreSQL locale :** Configurer une base de données de test et appliquer la première migration Prisma.
3. **Développement des Parseurs (`src/parsers/bb3/`) :** Coder les fonctions de conversion qui prennent les objets réels reçus dans `sample-team-detail.json` et `sample-match-detail.json` et les traduisent en modèles conformes à notre schéma Prisma.
