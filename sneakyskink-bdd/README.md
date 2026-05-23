# 🦎 sneakyskink-bdd

> Source unique de vérité pour le schéma de base de données PostgreSQL de l'écosystème **SneakySkink** (Blood Bowl 3).

Ce package encapsule le schéma de base de données, les migrations **Prisma** et fournit une instance globale configurée du client Prisma (`PrismaClient`) partagée par tous les autres services du monorepo (API, Harvester, etc.).

---

## 🛠️ Technologies
* **Base de données** : PostgreSQL
* **ORM** : [Prisma](https://www.prisma.io/) (v7.8+)
* **Pilote PostgreSQL** : `@prisma/adapter-pg` avec le pool de connexions natif `pg`
* **Langage** : TypeScript (v6)

---

## 🏗️ Structure des Fichiers

* [`prisma/schema.prisma`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-bdd/prisma/schema.prisma) : Contient la définition complète des modèles de données et de leurs relations.
* [`src/index.ts`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-bdd/src/index.ts) : Initialise et exporte une instance partagée de `PrismaClient` configurée avec un adapter PG, des logs de requêtes en mode développement et la déconnexion propre (Graceful Shutdown) lors de l'arrêt des processus (`SIGINT`/`SIGTERM`).

---

## 📊 Modèles de Données Principaux

Le schéma Prisma modélise les données de **Blood Bowl 3** extraites de l'API de Cyanide :

1. **`League`** : Représente une ligue (ex: Ligue publique ou privée) avec ses métadonnées.
2. **`Competition`** : Les compétitions ou tournois au sein d'une ligue (Knockout, Round Robin, Wissen, Ladder).
3. **`Coach`** : Les coachs participants identifiés par leur UUID unique.
4. **`Team`** : Les équipes (valeur TV, trésorerie, staff, statistiques globales de victoires/nuls/défaites).
5. **`Player`** : Les joueurs individuels avec leurs caractéristiques physiques (MA, ST, AG, PA, AV) et leurs compétences innées ou acquises (`innateSkills`, `acquiredSkills`).
6. **`Match`** : Les matchs joués avec le statut, les scores, les coachs et équipes impliqués.
7. **`PlayerMatchStats`** : Les statistiques de performance individuelles par match (Touchdowns, passes, interceptions, blocs réussis/subis, dégâts infligés/subis, XP gagné).
8. **`AuditReport`** : Rapports de maintenance automatique et audits de cohérence des données.

---

## ⚙️ Installation & Utilisation

### 1. Configuration des variables d'environnement
Créez un fichier `.env` dans ce dossier (ou configurez la variable à la racine) :
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sneakyskink?schema=public"
```

### 2. Scripts Disponibles

* **Générer le client Prisma & Compiler TypeScript** :
  ```bash
  npm run build
  ```
  *(Cette commande lance la génération automatique des types Prisma et compile les fichiers `.ts` du dossier `src` vers le dossier `dist/`)*

* **Générer uniquement les types Prisma** :
  ```bash
  npm run prisma:generate
  ```

* **Pousser le schéma vers la base de données (sans migration formelle)** :
  ```bash
  npm run db:push
  ```

* **Introspecter une base existante pour générer le schéma** :
  ```bash
  npm run db:pull
  ```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

