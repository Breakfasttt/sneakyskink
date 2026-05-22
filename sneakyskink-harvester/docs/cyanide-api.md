<!--
  SneakySkink Harvester - Documentation Détaillée de l'API Officielle Cyanide (Blood Bowl 3)
  Auteur: Antigravity AI
  Rôle: Spécification technique des services web de Cyanide Studio pour le daemon d'ingestion.
-->

# Spécification Technique de l'API Cyanide (Blood Bowl 3)

Ce document fournit une documentation exhaustive de l'API de services web fournie par Cyanide Studio pour **Blood Bowl 3 (BB3)**. Elle a été rédigée suite à des requêtes exploratoires et à l'analyse des payloads de production récoltés par le Harvester.

---

## 1. Concepts Fondamentaux & Protocole

### 1.1. URL de Base et Authentification
Toutes les requêtes s'effectuent en HTTP(S) GET sur le serveur de services web de Cyanide. L'authentification s'appuie sur une clé d'API privée transmise en paramètre de requête.

* **URL de Base :** `https://web.cyanide-studio.com/ws/`
* **Paramètres Obligatoires :**
  * `key` : Clé d'API fournie par Cyanide.
  * `bb` : Version de l'opus de Blood Bowl. Doit être fixé à `3` pour cibler l'écosystème de Blood Bowl 3.
* **Exemple d'appel d'exploration global :**
  ```http
  GET https://web.cyanide-studio.com/ws/?key=VOTRE_CLE&bb=3
  ```
  *Cet appel retourne la liste de tous les services disponibles (le schéma de métadonnées de l'API).*

### 1.2. Format des Erreurs
Cyanide encapsule parfois les erreurs applicatives au sein de réponses HTTP avec un code d'état `200 OK`. Le payload JSON retourné contient alors un champ d'erreur :
```json
{
  "error": "Access denied (invalid key)",
  "meta": {
    "user": "anonymous",
    "method": "ws",
    "format": "json"
  }
}
```
*Le Harvester doit impérativement inspecter le corps de la réponse pour détecter la présence d'une clé `"error"` ou `"errorMessage"`, même si le code HTTP retourné est 200.*

> [!IMPORTANT]
> **Retour littéral `false` (Dépassement de Quota / Clé Invalide) :**
> En cas de dépassement de quota (Rate Limit horaire/journalier atteint) ou si la clé API utilisée est invalide/expirée, l'API de Cyanide ne renvoie pas un code HTTP 429 ou 401, ni même un JSON décrivant l'erreur.
> Elle retourne un unique booléen **`false`** brut à la place de l'objet ou de la liste attendus, avec un statut HTTP `200 OK`.
> Le Harvester intercepte ce cas particulier pour lancer un diagnostic de santé global et suspendre l'aspiration si nécessaire.


### 1.3. Quotas et Résilience (Rate Limiting)
L'API de Cyanide applique des limitations d'appels (quotas) par clé :
* **Limite horaire :** 1 000 requêtes.
* **Limite journalière :** 10 000 requêtes.
* **Comportement du Harvester :** 
  * Un délai minimum d'attente (`API_MIN_DELAY_MS` = 2500 ms) est imposé entre chaque requête pour lisser la charge.
  * Les matchs terminés (`PLAYED` ou `VALIDATED`) ayant un contenu immuable, ils sont mis en cache définitivement en base de données pour ne jamais être réinterrogés.

---

## 2. Cartographie Exhaustive des Endpoints

L'API BB3 expose 24 services web répartis par catégories.

### 2.1. Diagnostics & Monitoring Général

#### 2.1.1. `status`
* **Game Namespace :** `/ws/cya/status/`
* **Utilité :** Fournit la santé générale des serveurs, des bases de données et des plateformes (PC, Microsoft, Sony) ainsi que le flux d'actualités.
* **Arguments :** Aucun.
* **Structure du Payload :**
```json
{
  "games": [
    {
      "codename": "bb3",
      "title": "Blood Bowl III",
      "status": {
        "ok": true,
        "platforms": [
          { "codename": "pc", "title": "Steam & Epic", "ok": true }
        ],
        "services": {
          "game_server_database": true,
          "game_server_address_directory": true
        }
      }
    }
  ]
}
```

#### 2.1.2. `welcome`
* **Game Namespace :** `/ws/cya/welcome/`
* **Utilité :** Récupère les actualités et bannières promotionnelles affichées sur l'écran d'accueil du jeu.
* **Arguments :** Aucun.
* **Structure du Payload :**
```json
{
  "size": [3674, 255, 5],
  "data": [
    {
      "title": "",
      "body": "{\n  \"Description\": \"Weekend Clash #3...\",\n  \"BackgroundImageURL\": \"https://i.ibb.co/...\",\n  \"UrlToRedirect\": \"https://discord.gg/...\"\n}",
      "footer": "",
      "image_url": null,
      "link_url": null
    }
  ]
}
```
*Le champ `body` contient un JSON stringifié contenant la description, l'image de fond et l'URL de redirection.*

#### 2.1.3. `rss`
* **Game Namespace :** `/ws/bb3/rss/`
* **Utilité :** Flux d'actualités généré automatiquement à partir des derniers événements marquants de la ligue éternelle (ex: ramages, overtime, victoires écrasantes).
* **Arguments :** Aucun.
* **Structure du Payload :**
```json
{
  "records": [
    {
      "id": "1de70bf6-54e0-11f1-a124-bc2411305479",
      "league": "ETERNAL_LEAGUE_NAME",
      "news_title": "<h1>This was not a match but a rampage done by Regen United!</h1>",
      "news_descripion": "So much blood was shed in the glory of Nuffle...",
      "rss_date": "2026-05-21 06:41:37"
    }
  ]
}
```

#### 2.1.4. `gamecount`
* **Game Namespace :** `/ws/bb3/gamecount/`
* **Utilité :** Statistiques quotidiennes du volume de matchs joués sur Blood Bowl 3.
* **Arguments :**
  * `start` (optionnel) : Date de début (`YYYY-MM-DD`).
  * `end` (optionnel) : Date de fin (`YYYY-MM-DD`).
* **Structure du Payload :**
```json
{
  "is_campaign": 3536,
  "is_friendly": 1769,
  "is_eternal_league": 8061,
  "is_ladder": 0,
  "is_event": 0,
  "is_arena": 931,
  "total": 21975,
  "is_league_play": 7678
}
```

---

### 2.2. Recherche & Résolution

#### 2.2.1. `lookup`
* **Game Namespace :** `/ws/bb3/lookup/`
* **Utilité :** Point d'entrée de recherche universel pour résoudre un ID à partir d'un nom (ou inversement) pour une ligue, compétition, équipe ou coach.
* **Arguments :**
  * `league_name` | `league_id` (optionnel)
  * `competition_name` | `competition_id` (optionnel)
  * `team_name` | `team_id` (optionnel)
  * `coach_name` | `coach_id` (optionnel)
  * `exact` : Résolution stricte `0` | `1` (Défaut : `1`).
* **Structure du Payload :**
```json
{
  "league": {
    "id": "50000000-0000-0000-0000-000000000025",
    "name": "Official league"
  }
}
```

---

### 2.3. Ligues & Compétitions

#### 2.3.1. `leagues`
* **Game Namespace :** `/ws/bb3/leagues/`
* **Utilité :** Recherche et liste les ligues de BB3 actives.
* **Arguments :**
  * `league|league_name` (optionnel) : Filtre par nom.
  * `league|league_id|id` (optionnel) : Filtre par UUID.
  * `limit|max` : Nombre de résultats.
  * `gamers_count` : Nombre minimum de joueurs requis.

#### 2.3.2. `league`
* **Game Namespace :** `/ws/bb3/league/`
* **Utilité :** Renvoie les informations d'une ligue ciblée.
* **Arguments :**
  * `league|league_id|id` (obligatoire) : UUID de la ligue.
  * `platform|platform_name` (optionnel) : `pc` | `playstation` | `xbox`.
* **Structure du Payload :**
```json
{
  "league": {
    "id": "50000000-0000-0000-0000-000000000025",
    "name": "Official league",
    "logo": "Logo_BlackOrc_01",
    "date_last_match": "2024-06-11 05:11:48",
    "team_count": 275
  }
}
```

#### 2.3.3. `competitions`
* **Game Namespace :** `/ws/bb3/competitions/`
* **Utilité :** Liste toutes les divisions, compétitions et poules sous une ligue.
* **Arguments :**
  * `league|league_id` (obligatoire) : UUID de la ligue parente.
  * `limit|max` : Nombre maximum de résultats.
* **Dictionnaire des Formats (`format`) :**
  * `Ladder` : Matchmaking permanent sans ronde fixe.
  * `RoundRobin` : Championnat classique.
  * `Knockout` : Élimination directe.
  * `Wissen` : Système Suisse.
* **Dictionnaire des Statuts (`status_name`) :**
  * `InProgress` | `Finished` | `Scheduled`.
* **Structure du Payload :**
```json
{
  "competitions": [
    {
      "id": "50000000-0000-0000-0000-000000000052",
      "name": "official_ladder_season_04",
      "format": "Ladder",
      "status_name": "Finished",
      "turn_duration": 120,
      "time_bonus_duration": 450,
      "league": {
        "id": "50000000-0000-0000-0000-000000000025",
        "name": "Official league"
      }
    }
  ]
}
```

---

### 2.4. Équipes, Entraîneurs & Joueurs

#### 2.4.1. `teams`
* **Game Namespace :** `/ws/bb3/teams/`
* **Utilité :** Liste simplifiée des équipes d'une ligue ou compétition (utilisé par le Harvester pour découvrir les participants).
* **Arguments :**
  * `league|league_id` : UUID de la ligue.
  * `competition|competition_id` : UUID de la compétition.
  * `limit|max` : Limite de résultats (ex: `0,100`).

#### 2.4.2. `team`
* **Game Namespace :** `/ws/bb3/team/`
* **Utilité :** Fiche complète d'une équipe, de sa trésorerie et de son roster de joueurs à jour.
* **Arguments :**
  * `id` : UUID de l'équipe.
  * `coach` : Charger le profil du coach `0` | `1` (Défaut : `1`).
  * `roster` : Charger le roster complet des joueurs `0` | `1` (Défaut : `1`).
  * `skills` : Inclure les compétences courantes des joueurs `0` | `1` (Défaut : `1`).
  * `casualties` : Inclure les blessures actives des joueurs `0` | `1` (Défaut : `1`).
* **Structure du Roster (Détail Joueur) :**
```json
{
  "team": {
    "id": "041d05d2-4256-11f1-a124-bc2411305479",
    "idraces": 14,
    "name": "E1",
    "value": 1445,
    "cash": 215000
  },
  "roster": [
    {
      "id": "0ef75f9e-4256-11f1-a124-bc2411305479",
      "name": "Edyllian",
      "number": 1,
      "value": 135,
      "xp": 5,
      "attributes": {
        "ma": 7, "st": 3, "ag": 2, "pa": 3, "av": 9
      },
      "type": "elvenUnion_elfBlitzer",
      "skills": ["block", "sidestep", "dodge"]
    }
  ]
}
```

#### 2.4.3. `coaches`
* **Game Namespace :** `/ws/bb3/coaches/`
* **Utilité :** Liste des coachs enregistrés dans une ligue ou division.
* **Arguments :**
  * `league_id` ou `competition_id` : UUID de l'entité parente.
  * `limit|max` : Nombre de résultats.
* **Structure du Payload :**
```json
{
  "coaches": [
    {
      "idcoach": "55603849-b36f-11ed-b762-020000d1a054",
      "coachname": "Edwardlover",
      "lastlang": "english"
    }
  ]
}
```

#### 2.4.4. `player`
* **Game Namespace :** `/ws/bb3/player/`
* **Utilité :** Fiche de détails d'un joueur spécifique (XP, niveau, blessures, compétences, statistiques historiques).
* **Arguments :**
  * `player|id` (obligatoire) : UUID du joueur.
* **Structure du Payload :**
```json
{
  "player": {
    "id": "09c14728-6dfb-11ee-ba07-02000090a64f",
    "name": "Grulkas",
    "idraces": 8,
    "number": 1,
    "value": 240,
    "xp": 10,
    "attributes": { "ma": 5, "st": 5, "ag": 4, "av": 10, "pa": 5 },
    "type": "chaosChosen_ogre",
    "level": 5,
    "casualties_state": ["GroinStrain"],
    "suspended_next_match": false,
    "skills": ["bone head", "block", "guard"]
  }
}
```

#### 2.4.5. `top`
* **Game Namespace :** `/ws/bb3/top/`
* **Utilité :** Renvoie les meilleures équipes par faction (race) sous une compétition ou ligue.
* **Arguments :**
  * `league|league_id` ou `competition|competition_id` (obligatoire)
  * `top|top_size|size|limit` : Nombre de résultats.
* **Structure du Payload :**
```json
{
  "top": {
    "chaosChosen": [
      {
        "team": {
          "rank": 1, "name": "Edkills 23", "id": "2cb124e2-...", "tv": 2310, "race_id": 8
        },
        "coach": { "name": "Edwardlover", "id": "55603849-..." }
      }
    ]
  }
}
```

---

### 2.5. Calendrier & Historique des Rencontres

#### 2.5.1. `contests`
* **Game Namespace :** `/ws/bb3/contests/`
* **Utilité :** Calendrier officiel de la compétition. Indispensable pour détecter et synchroniser les matchs joués.
* **Arguments :**
  * `league_id` (obligatoire) : UUID de la ligue.
  * `competition_id` (optionnel) : UUID de la division.
  * `contest_status` : Statut ciblé (`Scheduled` | `InProgress` | `Played` | `Validated`).
  * `limit|max` : Nombre de résultats.
* **Structure du Payload :**
```json
{
  "contests": [
    {
      "match_uuid": "667f7b21-51de-11f1-a124-bc2411305479",
      "contest_status": "Played",
      "round": 3,
      "team_home": { "id": "...", "name": "..." },
      "team_away": { "id": "...", "name": "..." }
    }
  ]
}
```

#### 2.5.2. `match`
* **Game Namespace :** `/ws/bb3/match/`
* **Utilité :** Feuille de match ultra-détaillée avec statistiques individuelles de chaque joueur, XP et blessures récoltées sur le terrain.
* **Arguments :**
  * `id` : UUID unique du match.
  * `rosters` : Inclure la feuille nominative des joueurs `0` | `1` (Défaut : `1`).
* **Structure du Payload :**
```json
{
  "match": {
    "id": "667f7b21-51de-11f1-a124-bc2411305479",
    "started": "2024-06-11 05:11:48",
    "finished": "2024-06-11 06:45:12",
    "round": 3,
    "teams": [
      {
        "idteamlisting": "home-uuid",
        "teamname": "Home Team",
        "idraces": 1,
        "score": 2,
        "statistics": { "inflictedmetersrunning": 128 },
        "roster": [
          {
            "id": "player-uuid",
            "name": "Player Name",
            "xp_gain": 4,
            "mvp": true,
            "stats": { "touchdowns": 1, "blocks_succeeded": 4 }
          }
        ]
      }
    ]
  }
}
```

#### 2.5.3. `matches`
* **Game Namespace :** `/ws/bb3/matches/`
* **Utilité :** Liste les matchs sous forme de flux chronologique.
* **Arguments :**
  * `league_id` ou `competition_id`
  * `limit|max` : Limite de résultats.
  * `id_only` : Retourner uniquement les IDs et UUIDs pour économiser la bande passante `0` | `1` (Défaut : `0`).
  * `team_id|team` : Filtrer pour une équipe spécifique.

#### 2.5.4. `teammatches`
* **Game Namespace :** `/ws/bb3/teammatches/`
* **Utilité :** Historique chronologique des UUIDs des matchs d'une équipe.
* **Arguments :**
  * `team_id|team` (obligatoire) : UUID de l'équipe.
  * `limit` : Limite.
* **Structure du Payload :**
```json
{
  "matches": [
    {
      "uuid": "612d2960-4472-11ef-9e7e-bc24112ec32e",
      "id": "612d2960-4472-11ef-9e7e-bc24112ec32e"
    }
  ]
}
```

---

### 2.6. Classements & Statistiques Globales

#### 2.6.1. `ladder`
* **Game Namespace :** `/ws/bb3/ladder/`
* **Utilité :** Récupère le classement officiel (Leaderboard) d'un championnat ou ladder public avec filtres.
* **Arguments :**
  * `league_id` ou `competition_id`
  * `ladder_size|size|limit` : Nombre max de rangs.
  * `tv_min` / `tv_max` : Tranche de TV.
  * `winrate_min` / `winrate_max` : Taux de victoires.
* **Structure du Payload :**
```json
{
  "ranking": [
    {
      "team": { "rank": 1, "name": "Buttz", "tv": 1580, "score": 2267, "w/d/l": "38/6/6" },
      "coach": { "name": "DocMaXX", "id": "..." }
    }
  ],
  "ladder": { "league": "Official league", "size": 10 }
}
```

#### 2.6.2. `gamestats`
* **Game Namespace :** `/ws/bb3/gamestats/`
* **Utilité :** Statistiques globales de jeu pour une compétition durant une période donnée.
* **Arguments :**
  * `competitionId|uuid` : ID unique de la compétition.
  * `start` / `end` : Bornes temporelles (`YYYY-MM-DD`).

#### 2.6.3. `sprintranking`
* **Game Namespace :** `/ws/bb3/sprintranking/`
* **Utilité :** Classement compétitif structuré en "sprints".
* **Arguments :**
  * `competition_id` ou `competition_name`
  * `match_threshold` : Seuil minimal de matchs joués (ex: 20).

#### 2.6.4. `arenafinalscontenders`
* **Game Namespace :** `/ws/bb3/arenafinalscontenders/`
* **Utilité :** Récupère les équipes qualifiées aux playoffs officiels de Cyanide via le format Arena.
* **Arguments :**
  * `season` : Numéro de la saison active ou passée (`0=last`, `11`, etc.).
* **Structure du Payload :**
```json
{
  "competition": { "id": "...", "name": "ARENA_SEASON_11_NAME" },
  "teams": [
    {
      "coach_name": "Dragonwhelp",
      "team_name": "Bashing Beauties",
      "rating": 1107,
      "match_win": 7,
      "match_draw": 2,
      "match_loss": 0
    }
  ]
}
```

#### 2.6.5. `stats`
* **Game Namespace :** `/ws/bb3/stats/`
* **Utilité :** Statistiques globales diverses sur le jeu (monitoring global).
* **Arguments :**
  * `stats|stat` : Codes des métriques globales séparés par des virgules.

---

### 2.7. Règles & Référentiels

#### 2.7.1. `rules`
* **Game Namespace :** `/ws/bb3/rules/`
* **Utilité :** Dictionnaire officiel des compétences (skills) de BB3 et de leurs catégories.
* **Arguments :**
  * `rule|rules|ruleset` : Doit être fixé à `"skills"`.
* **Structure du Payload :**
```json
{
  "skills": [
    {
      "category": "agility",
      "codename": "dodge",
      "icon": null
    }
  ]
}
```

---

### 2.8. Endpoints Obsolètes / Incompatibles

#### 2.8.1. `halloffame`
* **⚠️ Statut :** **INCOMPATIBLE AVEC BB3** (confirmé par le changelog officiel de Cyanide du 30/05/2023). Ne doit pas être appelé pour économiser les quotas.

---

## 3. Typages de Données & Modélisation (Blood Bowl 3)

### 3.1. Attributs Physiques des Joueurs
Les attributs de base de l'API sont stockés sous forme de jets cibles pour l'agilité, la passe et l'armure (règles BB2020) :
* **MA (Movement Allowance) :** Valeur entière brute (ex: `6`).
* **ST (Strength) :** Valeur entière brute (ex: `3` ou `4`).
* **AG (Agility) :** Jet cible (ex: `3` désigne une agilité de 3+).
* **PA (Passing Ability) :** Jet cible (ex: `4` pour 4+). Peut être `null` ou `5` s'il n'a aucune aptitude de passe.
* **AV (Armour Value) :** Rupture d'armure (ex: `10` correspond à une armure de 10+).

### 3.2. Mapping des Identifiants de Races (`race_id` / `idraces`)

> [!WARNING]
> **Désalignement des IDs de Faction (Races) :**
> Le Harvester ingère et stocke les identifiants de faction (`idraces`) **bruts** envoyés par l'API Cyanide directement dans le champ `raceId` de la table `teams` sous PostgreSQL.
>
> Cependant, le Frontend (`SneakySkink-web` via [raceHelper.ts](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/utils/raceHelper.ts)) utilise un mapping interne statique (de 1 à 26). 
> Il y a un décalage entre les deux référentiels. Par exemple, l'ID brute `14` correspond à l'**Union Elfique** dans l'API Cyanide, alors qu'elle est mappée aux **Renégats du Chaos** dans le Frontend.

Voici la table de correspondance exhaustive constatée entre l'API Cyanide et le Frontend :

| Nom de la Race (API) | ID Cyanide (DB) | Nom dans `racesMap` (Frontend) | ID Frontend | Statut / Risque de Bug |
| :--- | :---: | :--- | :---: | :--- |
| `human` | **1** | Humains | **1** | ✅ Alignés |
| `dwarf` | **2** | Orcs | **2** | ⚠️ Conflit (Dwarf affiché comme Orc) |
| `skaven` | **3** | Nains | **3** | ⚠️ Conflit (Skaven affiché comme Nain) |
| `orc` | **4** | Skavens | **4** | ⚠️ Conflit (Orc affiché comme Skaven) |
| `lizardman` | **5** | Hauts Elfes | **5** | ⚠️ Conflit (Lézard affiché comme Haut Elfe) |
| `darkElf` | **9** | Élus du Chaos | **9** | ⚠️ Conflit (Elfe Noir affiché comme Chaos Chosen) |
| `shamblingUndead` | **10** | Orques Noirs | **10** | ⚠️ Conflit (Undead affiché comme Black Orc) |
| `elvenUnion` | **14** | Renégats du Chaos | **14** | ⚠️ Conflit (Union Elfique affiché comme Renégat) |
| `nurgle` | **18** | Nurgle | **18** | ✅ Alignés |
| `chaosChosen` | **8** | Hommes-Lézards | **8** | ⚠️ Conflit (Chaos Chosen affiché comme Homme-Lézard) |
| `chaosRenegade` | **1001** | *Inexistant (Renégats = 14)* | **-** | ❌ Non affiché (Bug `Race #1001`) |
| `blackOrc` | **1000** | *Inexistant (Orc Noir = 10)* | **-** | ❌ Non affiché (Bug `Race #1000`) |
| `oldWorldAlliance` | **1002** | *Inexistant (Alliance = 15)* | **-** | ❌ Non affiché (Bug `Race #1002`) |

*Recommandation : Une table relationnelle de correspondance ou un alignement du mapper `raceHelper.ts` sur les IDs officiels de Cyanide est requis pour corriger les bugs d'affichage du site.*

### 3.3. Blessures Graves (`casualties_state`)
Les codenames de blessures de l'API sont :
* `badly_hurt` : Commotion.
* `serious_injury` : Blessure grave.
* `smashed_knee` : Genou en miettes (-1 MA).
* `broken_arm` : Bras cassé.
* `neck_injury` : Blessure au cou.
* `damaged_eye` : Œil abîmé.
* `dead` : Décédé sur le terrain.

---

## 4. Guide d'Appel Rapide (Snippets)

### Requête Curl pour les détails d'un Match :
```bash
curl -G "https://web.cyanide-studio.com/ws/bb3/match/" \
  --data-urlencode "key=c480e8c8ebc9bc9c34d48b9e03efb9c2" \
  --data-urlencode "bb=3" \
  --data-urlencode "id=667f7b21-51de-11f1-a124-bc2411305479" \
  --data-urlencode "rosters=1"
```

### Script TypeScript (Harvester Client) :
```typescript
import axios from 'axios';

async function fetchMatchData(matchId: string, apiKey: string) {
  const url = `https://web.cyanide-studio.com/ws/bb3/match/`;
  
  const response = await axios.get(url, {
    params: {
      key: apiKey,
      bb: 3,
      id: matchId,
      rosters: 1
    }
  });

  if (response.data?.error) {
    throw new Error(`Erreur API Cyanide: ${response.data.error}`);
  }

  return response.data;
}
```
