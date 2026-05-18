# SneakySkink-web : Lignes Directrices et Architecture (Refonte de Zéro)

## 1. Principes Fondamentaux
- **Design Mobile-First** : Toute l'interface doit être pensée pour mobile en priorité, puis s'adapter aux écrans plus grands.
- **Librairie UI** : Utiliser **Material UI (MUI)** de manière cohérente pour tous les composants visuels.
- **Accès aux données (Strict)** : 
  - Il faut TOUJOURS utiliser `sneakyskink-clientapi`.
  - NE JAMAIS interroger l'API Cyanide directement depuis le frontend.
  - NE JAMAIS interroger le Harvester directement depuis le frontend.
- **Simplicité** : L'interface doit être ultra-simple d'utilisation, épurée et intuitive.

## 2. Architecture des Pages Autorisées

Toutes les autres pages qui ne figurent pas dans cette liste et qui sont obsolètes doivent être supprimées.

### 2.1. Accueil (`/`)
- Header : Indicateur discret d'état du Harvester (nom user-friendly) et de la dispo de l'API Cyanide.
- Un champ de recherche global (coach, ligue, compétition) avec module de suggestion.
- Un graphique en bâton : Nombre de matchs joués sur les dernières 24h (toutes ligues confondues).
- À droite du graphique, 4 blocs de statistiques :
  - Nombre de ligues (cliquable -> `/ligues`)
  - Nombre de compétitions (cliquable -> `/competitions`)
  - Nombre de coachs (cliquable -> `/coachs`)
  - Bouton "Demander une synchro" (cliquable -> `/synchro`)

### 2.2. Page Résultat de Recherche (`/search`)
- Affiche les résultats par catégorie lorsqu'il y a plusieurs correspondances.
- Catégories : Ligues, Compétitions, Coachs, Équipes.
- *Règle : Si la recherche ne donne qu'un seul résultat exact, rediriger directement vers la page concernée.*

### 2.3. Page Coachs (`/coachs`)
- Grille parfaite listant tous les coachs.
- Champ de recherche pour filtrer.

### 2.4. Profil Coach (`/coach/[id]`)
- Informations générales du coach.
- Ses derniers matchs.
- Ses ligues et compétitions liées.
- Ses équipes.
- Statistiques de Winrate :
  - Global.
  - Sur les 30 derniers matchs.
  - Par roster (race).
  - Matchups positifs/négatifs.
  - Graphique d'évolution du winrate depuis son tout premier match.
- Graphique en bâton : Horaires auxquels ses matchs sont joués sur une journée (0h-24h).
- Liste des coachs déjà affrontés (avec champ de recherche, et score de face-à-face), triée par ordre alphabétique.

### 2.5. Page Ligues (`/ligues`)
- Grille parfaite listant toutes les ligues.
- Champ de recherche pour filtrer.
- Checkbox : Afficher les ligues supprimées/inactives.

### 2.6. Détail Ligue (`/ligue/[id]`)
- Date de dernière mise à jour.
- Informations générales.
- Liste et compte des coachs associés.
- Liste et compte des compétitions associées (avec checkbox pour inactives/supprimées).
- Liste des derniers matchs joués dans cette ligue.

### 2.7. Page Compétitions (`/competitions`)
- Grille parfaite listant toutes les compétitions.
- Champ de recherche.
- Checkbox : Afficher les compétitions supprimées/inactives.

### 2.8. Détail Compétition (`/competition/[id]`)
- Date de dernière mise à jour.
- Le design s'adapte au format de la compétition :
  - **Toutes Rondes / Ronde Suisse** : 
    - Classement complet (TD pour, TD contre, victoires, etc.).
    - Tiebreaker modifiable (Par défaut : Score > Victoire > Skill/Pts Adversaires > TD+).
  - **Bracket (Arbre de tournoi)** :
    - Affichage graphique de l'arbre.
    - Chaque nœud est un match cliquable (s'il a été joué).

### 2.9. Détail Équipe (`/equipe/[id]`)
- Date de dernière mise à jour.
- Détails de l'équipe et roster des joueurs.
- Liste des matchs joués par cette équipe.

### 2.10. Détail Match (`/match/[id]`)
- Date de dernière mise à jour.
- Résultat du match, ligue, compétition, équipes.
- Événements du match pour les joueurs (basé sur `player_match_stats`).

### 2.11. Page Synchro (`/synchro`)
- Formulaire ultra simple.
- Demande le nom d'une ligue ou d'un coach à synchroniser.
- Met l'élément en file d'attente.

### 2.12. Page Erreur 404 (`/not-found`)
- Page jolie et ergonomique pour rediriger l'utilisateur s'il se perd.
