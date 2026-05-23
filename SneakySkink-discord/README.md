# 🦎 SneakySkink-discord

> Intégration Discord pour l'écosystème **SneakySkink** (Blood Bowl 3).

Ce module est un emplacement réservé pour le futur bot Discord de la plateforme. Il permettra d'interagir directement avec les données de l'API REST de SneakySkink via des commandes Discord et de recevoir des notifications d'activité de match en direct.

---

## 🔮 Fonctionnalités Prévues
1. **Commandes Slash (`/`)** :
   * `/coach [nom]` : Récupérer le profil et le winrate global d'un coach.
   * `/team [nom]` : Afficher la valeur de l'équipe (TV), son effectif et ses derniers résultats.
   * `/match-live` : Consulter les scores des matchs en cours ou récemment terminés.
   * `/stats-roster` : Comparer les performances des races à l'échelle globale.
2. **Notifications & Alertes de Matchs (Webhooks / Commits)** :
   * Annoncer le début d'un match de ligue en direct.
   * Publier le résumé de la feuille de match dès sa validation par Cyanide.
   * Alerter lors d'un décès de joueur ou d'une blessure grave survenue en match.

---

## 🛠️ Architecture Future
* **Framework** : [discord.js](https://discord.js.org/)
* **SDK Interne** : Consommation de l'API REST via le SDK [`sneakyskink-api-client`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api-client).

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

