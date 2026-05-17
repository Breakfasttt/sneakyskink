# 🎨 Skill IA : Directives de Design Absolues pour `SneakySkink-web` (MUI)

Ce document régit les **règles esthétiques, de style et d'importation non négociables** à appliquer par tout agent IA modifiant ou créant des composants dans l'interface utilisateur de **`SneakySkink-web`** (React, Vite, Material UI).

---

## 🚨 1. Règle Critique d'Import des Icônes (Bug Vite/Windows)

> [!IMPORTANT]
> Pour contourner les ralentissements majeurs du serveur de dev Vite et les plantages d'importations sous Windows, il est **strictement interdit** d'importer les icônes MUI de façon individuelle ou via des dossiers profonds.

* **❌ INTERDIT :**
  \`typescript
  import DashboardIcon from '@mui/icons-material/Dashboard';
  import TrophyIcon from '@mui/icons-material/esm/EmojiEvents';
  \`

* **✅ OBLIGATOIRE (Imports Nommés Racines) :**
  \`typescript
  import { Dashboard as DashboardIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';
  \`

---

## 🌌 2. Charte Graphique "Glassmorphism & Neon Glow"

L'interface doit s'éloigner des designs d'administration basiques et adopter une esthétique de type "gaming haut de gamme".

### A. Palette de Couleurs (Dark Deep Mode)
* **Background Général :** Noir bleuté profond `#0B0F19`
* **Accent Primaire (Skink Cyan) :** Cyan néon `#00F2FE`
* **Accent Secondaire (Chameleon Violet) :** Violet électrique `#8A2BE2`
* **Surfaces de cartes (Glassmorphism) :** 
  * Background : `rgba(17, 25, 40, 0.75)`
  * Flou arrière-plan : `backdrop-filter: blur(12px);`
  * Bordure subtile : `border: 1px solid rgba(255, 255, 255, 0.08);`

### B. Dynamique des Races Blood Bowl (Neon Borders)
Chaque équipe ou carte liée à une race doit adapter sa lueur néon en fonction du type de race (ex: Orcs = Vert, Elfes = Argent/Bleu, Chaos = Rouge lave).
* Utilisez la fonction utilitaire `getRaceColor(raceId)` pour colorer de façon dynamique les ombres portées et bordures :
  \`typescript
  boxShadow: `0 0 15px ${getRaceColor(raceId)}22`
  \`

---

## 🛠️ 3. Bonnes Pratiques d'Intégration MUI

1. **Prioriser la prop `sx` :**
   Toutes les surcharges de style doivent se faire via la prop `sx` intégrée de MUI pour utiliser les tokens du thème central (`src/theme.ts`).
   * **Exemple :**
     \`typescript
     <Card sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 3 }}>
     \`
2. **Pas de Styles Ad-hoc CSS purs :**
   N'utilisez pas de classes CSS classiques ou de fichiers `.css` secondaires pour du positionnement ou de la couleur. Tout doit transiter par le système de grille, de Flexbox et de boîte de dialogue de MUI.
3. **Respect de l'Accessibilité (Contrastes) :**
   Les textes superposés sur des dégradés ou fonds néons doivent toujours comporter une ombre portée subtile (`textShadow`) ou un contraste `rgba(255,255,255,0.9)` pour une lisibilité clinique.

---

## ⚡ 4. Micro-Animations Obligatoires

Chaque élément interactif (cartes de ligues, de coachs, boutons) doit se sentir vivant sous le curseur de l'utilisateur :
* **Transition fluide :** `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`
* **Hover State :**
  * Légère surélévation : `transform: translateY(-4px) scale(1.01)`
  * Intensification de la bordure et de l'ombre néon.
