# 💡 SKILL : Utilisation des Widgets UI (`SneakySkink-web`)

Ce document sert de guide et de mémoire pour l'intégration et l'utilisation de la suite de widgets réutilisables dans l'application React/Vite/MUI **SneakySkink-web**.

---

## 1. Principes Clés
- **Ravitaillement Externe (Props strictes)** : Aucun widget ne fait d'appels API ou d'effet de bord réseau direct. Toutes les données indispensables doivent leur être injectées par props.
- **Thème MUI Sombre & Glassmorphism** : Tous les widgets respectent le design de l'application (utilisation de `alpha`, `theme.palette`, fond `#151D30` et bordures néons).
- **Indépendance des imports d'icônes** : Les icônes MUI doivent être importées via le point d'entrée racine :
  ```typescript
  import { SportsSoccer as BallIcon } from '@mui/icons-material';
  ```

---

## 2. Matrice de Pertinence par Catégorie

| Nom du Widget | Dossier | Global | Ligue | Compétition | Équipe | Joueur | Coach |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **WidgetRosterJoue** | `WidgetRosterJoue` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **WidgetWinrateGlobal** | `WidgetWinrateGlobal` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WidgetWinrateRecent** | `WidgetWinrateRecent` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WidgetWinrateParRoster** | `WidgetWinrateParRoster` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **WidgetWinrateParRencontre** | `WidgetWinrateParRencontre`| ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **WidgetStatistiquesGlobales** | `WidgetStatistiquesGlobales`| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WidgetMatchsParHeure** | `WidgetMatchsParHeure` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WidgetEvolutionWinrate** | `WidgetEvolutionWinrate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **WidgetWinrateDetails** | `WidgetWinrateDetails` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **WidgetWinrateRosterVsRosters** | `WidgetWinrateRosterVsRosters`| ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **WidgetCoachsRencontres** | `WidgetCoachsRencontres` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **WidgetCalendrierMatchs** | `WidgetCalendrierMatchs` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **WidgetSkillsChoisis** | `WidgetSkillsChoisis` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 3. Interfaces des Props des Widgets

### 1. `WidgetRosterJoue`
- **Description** : Affiche un diagramme en bâtons du nombre d'équipes par roster.
- **Props** :
  ```typescript
  interface WidgetRosterJoueProps {
    data: { raceId: number; teamCount: number }[];
  }
  ```

### 2. `WidgetWinrateGlobal`
- **Description** : Affiche le winrate global (V/N/D et %).
- **Props** :
  ```typescript
  interface WidgetWinrateGlobalProps {
    wins: number;
    draws: number;
    losses: number;
  }
  ```

### 3. `WidgetWinrateRecent`
- **Description** : Affiche le winrate sur les X derniers matchs d'une entité.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetWinrateRecentProps {
    matches: Match[];
    focusId: string; // ID du coach ou de l'équipe ciblée
    limit?: number; // Par défaut : 10
  }
  ```

### 4. `WidgetWinrateParRoster`
- **Description** : Affiche le taux de victoire par roster (bâtons horizontaux).
- **Props** :
  ```typescript
  interface WidgetWinrateParRosterProps {
    data: { raceId: number; wins: number; draws: number; losses: number }[];
  }
  ```

### 5. `WidgetWinrateParRencontre`
- **Description** : Affiche la matrice double-entrée de winrate de roster face à un autre.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetWinrateParRencontreProps {
    matches: Match[];
  }
  ```

### 6. `WidgetStatistiquesGlobales`
- **Description** : Affiche la grille des performances physiques et techniques (TD, KO, Blessures, Morts, Surfs, Passes, Expulsions).
- **Props** :
  ```typescript
  interface WidgetStatistiquesGlobalesProps {
    data: {
      touchdowns: number;
      kos: number;
      injuries: number;
      deaths: number;
      surfs: number;
      passes: number;
      expulsions: number;
    };
  }
  ```

### 7. `WidgetMatchsParHeure`
- **Description** : Affiche la courbe des matchs joués par heure UTC.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetMatchsParHeureProps {
    matches: Match[];
  }
  ```

### 8. `WidgetEvolutionWinrate`
- **Description** : Affiche la courbe d'évolution du winrate sur les X derniers matchs chronologiques.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetEvolutionWinrateProps {
    matches: Match[];
    focusId: string;
    limit?: number; // Par défaut : 40
  }
  ```

### 9. `WidgetWinrateDetails`
- **Description** : Affiche un tableau détaillé triable par roster joué.
- **Props** :
  ```typescript
  interface WidgetWinrateDetailsProps {
    data: {
      raceId: number;
      matchesCount: number;
      wins: number;
      draws: number;
      losses: number;
    }[];
  }
  ```

### 10. `WidgetWinrateRosterVsRosters`
- **Description** : Affiche un tableau de confrontation contre les autres rosters pour un roster sélectionné dans un combobox.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetWinrateRosterVsRostersProps {
    matches: Match[];
    focusId: string; // ID de l'équipe ou du coach
  }
  ```

### 11. `WidgetCoachsRencontres`
- **Description** : Tableau des coachs affrontés par un coach, trié par ordre alphabétique et filtrable par première lettre.
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetCoachsRencontresProps {
    matches: Match[];
    focusCoachId: string;
  }
  ```

### 12. `WidgetCalendrierMatchs`
- **Description** : Calendrier affichant les matchs joués sur ses jours (Limité aux coachs).
- **Props** :
  ```typescript
  import { Match } from 'sneakyskink-api-client';
  interface WidgetCalendrierMatchsProps {
    matches: Match[];
  }
  ```

### 13. `WidgetSkillsChoisis`
- **Description** : Affiche les compétences acquises les plus fréquentes.
- **Props** :
  ```typescript
  import { Player } from 'sneakyskink-api-client';
  interface WidgetSkillsChoisisProps {
    players: Player[];
  }
  ```
