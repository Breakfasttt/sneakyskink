# 🦎 sneakyskink-admin

> Interface Web d'administration premium (Glassmorphism & Neon Glows) pour l'écosystème **SneakySkink** (Blood Bowl 3).

Cette application monopage (SPA) React fournit une console d'administration sécurisée permettant aux administrateurs de piloter l'ingestion, d'ajuster le rate limit, de configurer la priorité et l'activation des ligues, et de lancer des tâches de maintenance sur la base de données.

---

## 🛠️ Technologies
* **Framework** : [React](https://react.dev/) (v19) + [Vite](https://vite.dev/) (v8)
* **Design & Styling** : [Material UI (MUI)](https://mui.com/) avec une charte graphique sur sombre avec effets glassmorphic néon (Skink Green `#00E676`).
* **SDK Interne** : `@sneakyskink-api-client` (liaison locale via NPM Workspaces)

---

## 🔑 Sécurité & Authentification
L'accès aux endpoints d'administration de l'API REST de SneakySkink requiert une clé d'administration. 
* Un champ de saisie de la clé d'administration est présent en haut de l'interface.
* Cette clé peut être mémorisée dans le navigateur (via le stockage local `localStorage`).
* Elle est ensuite automatiquement transmise dans l'en-tête de sécurité de toutes les requêtes (support de `Authorization: Bearer <key>`).

---

## 🏗️ Fonctionnalités de la Console

1. **Dashboard de Statut** : Affichage de l'état général de l'API et des compteurs globaux de la base de données (total de ligues, compétitions, équipes, coachs et matchs enregistrés).
2. **File d'attente BullMQ** : Monitoring en temps réel des compteurs de jobs (Actif, En attente, Différé, Complété, Échoué) et bouton de purge/nettoyage de la file d'attente.
3. **Contrôle de Vitesse (Rate Pacing)** : Possibilité de court-circuiter temporairement (`Bypass`) ou de restaurer (`Restore`) le pacing de sécurité de 2,5 secondes injecté entre les appels de l'API Cyanide.
4. **Gestion des Ligues** :
   * Recherche en direct de nouvelles ligues sur l'API de Cyanide et déclenchement d'un import asynchrone.
   * Activation ou désactivation individuelle d'une ligue locale (pour l'inclure ou l'exclure de l'ingestion périodique automatique du Harvester).
   * Définition de la priorité des ligues (pour synchroniser d'abord les ligues prioritaires).
   * Lancement forcé d'une synchronisation à la demande pour une ligue spécifique.
5. **Maintenance & Audits de Base de Données** :
   * Lancement manuel d'un audit de nettoyage de la base de données (résolution des doublons, correction des incohérences).
   * Visualisation de l'historique complet des rapports d'audit (date, durée, nombre de doublons résolus, etc.).

---

## ⚡ Lancement de l'Application

### 1. Installation des dépendances
Si ce n'est pas déjà fait, installez les dépendances à la racine du monorepo :
```bash
npm install
```

### 2. Lancement en Développement
Depuis le dossier `sneakyskink-admin` :
```bash
npm run dev
```
*(L'interface d'administration est disponible sur [http://localhost:3002](http://localhost:3002))*

### 3. Compilation pour la Production
```bash
npm run build
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
