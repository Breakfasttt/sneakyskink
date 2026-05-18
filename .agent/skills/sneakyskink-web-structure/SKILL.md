---
name: sneakyskink-web-structure
description: Guide structure SneakySkink. Dossiers, conventions, UI. Ultra compressé.
---

# Architecture

Utiliser le skill ui-components pour les composants UI et les styles CSS. Ne pas recréer les composants ou les styles CSS.


## APP (Next.js)
- **Chemin**: `app/[nom]/page.tsx`
- **Style**: `page.css` + `page-mobile.css`. Importer dans `.tsx`.
- **Comps Locaux**: `app/[nom]/component/Nom/Nom.tsx` + `.css`.

## COMMON / COMPONENTS
- Structure: `Nom.tsx` + `.css` + `-mobile.css`.
- Clés: `PremiumCard`, `UserAvatar`, `BBCodeEditor`.
- Boutons: `Classic`, `CTA`, `Danger`, `Admin`, `Badge`.


## RÈGLES IA
1. **Localité**: Utilisé 1 page ? `app/[page]/component/`. Utilisé >1 page ? `common/components/`.
2. **Logique**: Code DB dans `actions.ts`, jamais dans composant.
4. **Fichiers**: 1 composant = 1 dossier avec `.css` + `-mobile.css`.
