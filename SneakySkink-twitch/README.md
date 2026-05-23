# 🦎 SneakySkink-twitch

> Intégration Twitch pour l'écosystème **SneakySkink** (Blood Bowl 3).

Ce module est un emplacement réservé pour les futures intégrations de streaming Twitch. Il hébergera des services d'overlays interactifs en direct pour les streamers de Blood Bowl 3, ainsi que la détection automatique de l'activité des lives pour lier les matchs en base de données avec des streams actifs.

---

## 🔮 Fonctionnalités Prévues
1. **Overlay Streamer Interactif** :
   * Une page web légère ou widget OBS à intégrer sur un flux vidéo.
   * Affichage en direct du statut du match en cours (tours, score, relances restantes, TV).
   * Rendu visuel dynamique de l'effectif avec surbrillance du joueur actif et compétences.
2. **Détection d'Activité de Stream** :
   * Liaison automatique des comptes coach avec les chaînes Twitch (liaison via le profil coach).
   * API de détection des streams BB3 en cours diffusant une compétition SneakySkink enregistrée.
   * Ajout de badges "LIVE 🔴" cliquables sur l'interface SneakySkink-web pour regarder la partie en direct.
3. **Alertes de Chat (Bot Twitch)** :
   * Commandes de chat (ex: `!tv`, `!winrate`, `!roster`) répondant avec les données en direct.

---

## 🛠️ Architecture Future
* **Technologies** : Twitch API (Helix), EventSub (WebSockets), OBS WebWidgets.
* **SDK Interne** : Consommation de l'API REST via le SDK [`sneakyskink-api-client`](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-api-client).

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

