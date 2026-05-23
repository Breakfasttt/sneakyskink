# 🦎 SneakySkink-web

> Interface Web utilisateur premium (Glassmorphism & Neon Glows) pour explorer les ligues, coachs, statistiques et matchs de Blood Bowl 3.

Cette application monopage (SPA) React fournit une interface d'exploration moderne et interactive pour l'écosystème **SneakySkink**. Elle s'appuie sur le SDK client et l'API REST pour afficher des indicateurs de performance, des graphiques dynamiques et des fiches détaillées (coachs, équipes, joueurs, matchs).

---

## 🛠️ Technologies
* **Framework** : [React](https://react.dev/) (v19) + [Vite](https://vite.dev/) (v8)
* **Design & Styling** : [Material UI (MUI)](https://mui.com/) avec une charte graphique sur mesure (mode sombre, effets de verre *glassmorphism*, lueurs néon *neon glows*).
* **Graphiques & Visualisation** : [Recharts](https://recharts.org/) pour les courbes d'activité de jeu et de popularité des races.
* **Navigation** : [React Router DOM](https://reactrouter.com/) (v7)
* **SDK Interne** : `@sneakyskink-api-client` (liaison workspace locale)

---

## 🏗️ Structure des Dossiers & Pages

L'application est structurée comme suit :

* [`src/components/`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/components) : Composants réutilisables (Layout avec barre de recherche globale, carte d'équipe, carte de match, indicateurs clés).
* [`src/pages/`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages) : Les pages principales de l'application :
  * [`Home.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/Home.tsx) : Tableau de bord principal avec statistiques globales et graphiques Recharts.
  * [`Leagues.tsx` / `LeagueDetail.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/LeagueDetail.tsx) : Exploration des ligues enregistrées et de leurs compétitions.
  * [`Competitions.tsx` / `CompetitionDetail.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/CompetitionDetail.tsx) : Détails des divisions de tournois et de leurs rounds de matchs.
  * [`TeamDetail.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/TeamDetail.tsx) : Effectif d'équipe, TV, statistiques historiques et liste des joueurs (actifs, blessés ou décédés).
  * [`CoachDetail.tsx` / `Coaches.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/CoachDetail.tsx) : Profils des coachs, winrate détaillé par roster, et répartition d'activité de jeu.
  * [`MatchDetail.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/MatchDetail.tsx) : Feuille de match complète (scores, touchdowns, blessures, XP gagné et performances individuelles détaillées de chaque joueur).
  * [`Sync.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/Sync.tsx) : Console d'administration pour planifier ou forcer des synchronisations de ligues/coachs et monitorer l'état de la queue BullMQ.
  * [`SneakyApiHub.tsx` / `ApiDocs.tsx`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/pages/ApiDocs.tsx) : Documentation interactive intégrée pour consommer l'API REST.
* [`src/theme.ts`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/theme.ts) : Thème MUI personnalisé appliquant les variables CSS de base, les gradients fluides, les bordures translucides et les ombres floutées néons caractéristiques du projet.

---

## ⚡ Démarrage Rapide

### 1. Configuration préalable
Par défaut, l'application cherche l'API REST de SneakySkink sur `http://localhost:3001`. Vous pouvez modifier ce comportement dans [`src/api.ts`](file:///d:/devperso/antigravity/sneakyskink/SneakySkink-web/src/api.ts).

### 2. Lancement en Développement
Depuis le dossier `SneakySkink-web` :
```bash
npm run dev
```
*(L'interface web est disponible sur [http://localhost:3000](http://localhost:3000))*

### 3. Build de Production
Pour générer les fichiers dist statiques optimisés :
```bash
npm run build
```
*(Les fichiers générés sont placés dans le dossier `dist/` et peuvent être servis par Nginx, Apache ou n'importe quel hébergeur statique)*

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

