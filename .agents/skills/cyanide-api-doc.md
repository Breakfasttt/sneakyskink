<!--
  SneakySkink - Skill de l'agent Antigravity pour l'utilisation de l'API Cyanide
  Auteur: Antigravity AI
  Rôle: Directive technique concernant les appels à l'API Cyanide Studio.
-->

# 💡 SKILL : Utilisation de l'API Cyanide (Blood Bowl 3)

Ce document sert de directive technique impérative concernant l'usage, l'accès et les spécifications de l'API Cyanide pour Blood Bowl 3.

---

## 1. Directive d'Accès Strict
* **Exclusivité du Harvester :** Seul le sous-projet `sneakyskink-harvester` a l'autorisation d'appeler directement l'API Cyanide. Les bots, l'API web (`sneakyskink-api`) ou le Frontend ne doivent **jamais** effectuer de requêtes HTTP directes vers les serveurs de Cyanide. Ils doivent passer par les données stockées en base ou par l'API REST locale.
* **Consommation des Quotas :** L'API Cyanide applique un rate limiting strict (1 000 requêtes/heure, 10 000 requêtes/jour). Tout appel direct hors du harvester risque de saturer les quotas.

---

## 2. Référence Spécifique
* Pour toute opération d'ingestion, de parsing de données, d'analyse de métadonnées, de paramétrage de requêtes ou d'ajout d'endpoint lié à l'API Cyanide dans le Harvester, **consulter impérativement le document technique de référence :**
  [cyanide-api.md](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/docs/cyanide-api.md)

---

## 3. Points Critiques à Surveiller
* **Inspection des Réponses :** Toujours valider la présence de la propriété `error` ou `errorMessage` dans le JSON, même si le code de statut HTTP retourné est `200 OK`.
* **Caching de Matchs :** Ne jamais réinterroger un match au statut finalisé (`PLAYED` / `VALIDATED`) pour économiser les quotas.
* **Mapping des Factions :** Attention aux désalignements d'IDs de races entre l'API Cyanide et le Frontend (voir section 3.2 de [cyanide-api.md](file:///d:/devperso/antigravity/sneakyskink/sneakyskink-harvester/docs/cyanide-api.md)).
