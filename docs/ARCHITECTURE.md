# Architecture

Site statique : HTML + CSS + JavaScript « classique » (pas de framework, pas d'étape de compilation, pas de serveur).
Il s'ouvre en double-cliquant sur `index.html` et se publie tel quel sur GitHub Pages / Cloudflare Pages.

MapFix n'est **pas** une plateforme de commandes : c'est un outil de chiffrage. Le client dépose ses ressources,
obtient un prix, et télécharge un **récapitulatif** (un fichier `.html` autonome) qu'il envoie lui-même sur Discord.
Tout ce qui suit — validation, paiement, envoi des vrais fichiers, livraison, avis — se passe **à la main, sur
Discord**, hors du site. Le site ne conserve rien d'une visite à l'autre et ne contacte aucun serveur.

## Arborescence

```
index.html          page unique (Devis)
css/style.css        design system (variables --page, --stroke, --accent… ; changer la marque = --accent)
fonts/               Inter + JetBrains Mono, hébergées (pas de Google Fonts)
vendor/              JSZip 3.10.1 (+ empreinte SHA-384)
img/                 logo, favicon
js/                  le code, un fichier par responsabilité (voir ci-dessous)
docs/                SECURITE.md, ARCHITECTURE.md
tests/               tests automatiques (`npm test`)
_headers             en-têtes de sécurité pour Cloudflare Pages / Netlify
```

## Les modules `js/` (ordre de chargement = ordre de dépendance)

| Fichier | Rôle |
|---|---|
| `config.js` | Réglages publics : lien Discord, limites de robustesse, extensions bloquées, **prix par défaut** (`DEFAULTS`) |
| `util.js` | `$`, `esc()` (échappement HTML), formats, petites validations génériques, icônes SVG, toasts |
| `security.js` | `sanitizePath`, motifs sans RegExp, `validPseudo`/`validDeadline` |
| `ingest.js` | Lecture des `.zip` / dossiers (limites, chemins, exécutables) |
| `analysis.js` | Détection des conflits, du chiffrement (escrow), fichiers ignorés |
| `quote.js` | Devis : analyse affichée, choix des conflits, calcul du prix (`groupPrice`/`billingGroups`) |
| `recap.js` | Le cœur du site : construit, exporte et relit le récapitulatif `.html` |
| `main.js` | Branchement des événements, protections globales (pas de routeur : une seule page) |

Règles de code : toute donnée utilisateur affichée passe par `esc()` ; aucun script ni gestionnaire en ligne (CSP) ;
les dictionnaires dont les clés viennent d'un fichier déposé sont créés par `safeDict()`.

## Il n'y a pas de prix configurables depuis une interface

Comme il n'y a plus d'espace admin, les prix et règles d'analyse (`DEFAULTS` dans `js/config.js`) se changent
directement dans ce fichier — pas de panneau, pas de `localStorage` à cet effet.

## Le récapitulatif : format et flux

Un conflit = un groupe de ressources qui se partagent des fichiers (10 € pour 2 ressources, +5 € par ressource en
plus). Le client coche ceux qu'il veut faire corriger ; `quote()` calcule le total en direct.

`exportRecap()` (dans `recap.js`) construit un objet JSON (pseudo, message, date souhaitée, ressources, conflits
cochés, prix) et génère un fichier `.html` **autonome** :
- lisible tel quel (mise en page, sans JavaScript actif) par quiconque l'ouvre — c'est ce qui atterrit sur Discord ;
- contient la donnée JSON cachée dans un `<script type="application/json" id="mf-data">`, jamais exécutée.

Glisser ce même fichier sur la page (`importRecapFile()`) le relit : `sanitizeRecap()` revalide **tout** (c'est une
donnée non fiable, potentiellement modifiée avant d'être renvoyée) puis réaffiche l'analyse dans un mode « édition »
qui ajoute une remise (%, €) avant de proposer un nouveau téléchargement. Un fichier qui n'est pas un récapitulatif
MapFix valide est simplement ignoré (message clair, rien ne casse).

## Flux complet

1. **Dépôt** → `ingest.js` (nettoyage des chemins, blocage des exécutables, limites de taille).
2. **Analyse** → `analysis.js` détecte les doublons entre ressources et le chiffrement (escrow).
3. **Devis** → `quote.js` : le client coche/décoche, voit le prix, remplit pseudo/message.
4. **Export** → `recap.js` : téléchargement du récapitulatif, à envoyer soi-même sur Discord.
5. *(hors site)* Discussion, validation, envoi des vrais fichiers par le client (Discord/GoFile), paiement.
6. **Modification éventuelle** → on glisse le récapitulatif reçu sur le site, on ajuste (remise), on renvoie.
7. *(hors site)* Livraison, avis : tout se passe sur Discord.
