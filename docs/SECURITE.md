# Sécurité de MapFix

Ce document dit **ce qui est protégé, ce qui ne l'est pas, et pourquoi**.

## 1. Pourquoi c'est plus simple qu'avant

MapFix n'est plus une plateforme de commandes : il n'y a **ni compte, ni mot de passe, ni base de données, ni
serveur**. Rien de ce que le site traite n'est jamais stocké au-delà de l'onglet ouvert, ni envoyé nulle part. Le
« devis » devient un fichier que le client télécharge et envoie lui-même sur Discord ; le rouvrir pour le modifier ne
demande pas de connexion, puisqu'il n'y a rien de partagé à protéger — chaque récapitulatif est un fichier
autonome, traité un par un.

Ce qui reste à défendre :

| Attaquant | Ce qu'il tente |
|---|---|
| Client malveillant | Un `.zip` piégé : chemins `../../Startup/x.bat`, exécutables, noms `__proto__`, bombe de décompression, manifest qui fige le navigateur |
| Client malveillant | Du HTML/JS dans son pseudo, son message, un nom de fichier, ou dans le récapitulatif qu'il renvoie après l'avoir modifié |
| Site tiers | Encadrer MapFix dans un iframe (clickjacking) |

## 2. Ce qui est fait

| Sujet | Protection |
|---|---|
| Pollution de `Object.prototype` | Dossiers `__proto__`/`constructor` dans un zip : tous les dictionnaires à clé venant d'un fichier sont sans prototype (`safeDict`) |
| Zip-slip | `sanitizePath` : jamais de `..`, de racine, de lecteur, de caractère interdit ni de renversement bidi (« Trojan Source ») |
| Exécutables | Liste de blocage (`.exe`, `.bat`, `.ps1`, `.lnk`…), y compris double extension (`a.ydr.EXE`) |
| Bombes de décompression / dépôts géants | Limites : 1,5 Go d'archive, 30 000 fichiers, 6 Go décompressés, ratio 200:1 |
| ReDoS | Les motifs `escrow_ignore` écrits par le *client* dans son manifest ne sont **jamais** compilés en RegExp : comparaison linéaire, ≤ 6 jokers, budget de calcul borné |
| XSS | Toute donnée affichée passe par `esc()` — y compris un récapitulatif importé qui aurait été trafiqué avant d'être renvoyé |
| Récapitulatif importé (donnée non fiable) | `sanitizeRecap()` revalide chaque champ (types, longueurs, bornes) avant de l'afficher ; un fichier qui n'est pas un récapitulatif MapFix valide est ignoré proprement |
| Fuite réseau | Aucun `fetch`/`XMLHttpRequest` en dehors de `js/webhook.js`, lui-même gardé par `CONFIG.webhookUrl` (vide par défaut) ; CSP `connect-src` limité aux domaines Discord — le navigateur ne peut techniquement contacter que ça, jamais un autre serveur |
| Ressources tierces | CSP stricte (`script-src 'self'`, pas de script en ligne) ; JSZip et polices **hébergés** avec le site, empreinte SHA-384 vérifiée par test |
| Clickjacking | Auto-effacement si la page est encadrée (`js/main.js`) |
| Caractères invisibles | Contrôle automatisé des sources (`tests/security.test.js`) : un test échoue s'il en trouve |

Tout est couvert par des tests (`tests/security.test.js`, `tests/recap.test.js`) : `cd tests && npm test`.

## 3. Ce que ça ne protège pas — et pourquoi ça n'a plus besoin de l'être

- **Le prix est calculé par le navigateur du client**, qui pourrait en théorie modifier son propre récapitulatif
  avant de te l'envoyer. Ce n'est pas grave : *tu* relis ce fichier, tu vois exactement ce qui a été coché et à quel
  prix (rien n'est caché), et c'est toi qui donnes le prix final sur Discord — le fichier est une proposition
  lisible, pas un ordre de paiement automatique.
- **Aucune protection ne porte sur les vrais fichiers de mapping** : ils ne transitent jamais par le site. Le
  client te les envoie lui-même (Discord, GoFile…) une fois d'accord sur le prix — à toi d'appliquer la même
  prudence que pour n'importe quel fichier reçu par ce biais (ne pas exécuter, scanner si doute).
- **Il n'y a rien à mettre en production côté serveur.** Ce site n'est pas une démo en attente d'un backend : c'est
  l'architecture définitive. S'il fallait un jour un vrai suivi de commande ou un vrai paiement en ligne, ce serait
  un projet différent, avec une vraie base de données et une vraie authentification — pas une évolution de celui-ci.
- **L'URL du webhook Discord ne doit JAMAIS être collée dans `js/config.js` sur un dépôt public.** C'est un vrai
  secret : quiconque la lit peut poster de faux messages dans ton salon (un webhook ne permet que d'écrire, jamais de
  lire les autres salons ni les membres). Un fichier commis reste lisible pour toujours dans l'historique GitHub,
  même après l'avoir « retiré » d'un commit suivant — et des robots scannent en continu les dépôts publics à la
  recherche exactement de ce motif. C'est pourquoi le réglage normal se fait **dans le navigateur de l'admin, jamais
  dans le dépôt** : triple-clic sur le logo du site en ligne, coller l'URL, valider (voir `js/webhook.js`). Elle est
  stockée en `localStorage`, lue uniquement par ce navigateur, et ne transite jamais par GitHub. `CONFIG.webhookUrl`
  reste un simple repli, vide par défaut, réservé à un dépôt privé ou un test en local. Si une URL de webhook fuit
  par un autre biais (capture d'écran, copier-coller malheureux…), supprime-la dans Discord et recrées-en une autre :
  l'ancienne devient inerte. Pour une protection encore plus sérieuse (l'URL ne transiterait même plus par le
  navigateur), il faudrait un petit relais côté serveur (ex. un Cloudflare Worker) — hors du périmètre « site 100 %
  statique » de ce projet, mais tout à fait ajoutable si besoin.

## 4. Avant de publier

- [ ] `_headers` appliqué si hébergé sur Cloudflare Pages / Netlify (GitHub Pages ne pose pas d'en-têtes HTTP)
- [ ] `CONFIG.discordInvite` renseigné
- [ ] `npm test` (dossier `tests/`) : 0 échec
- [ ] Domaine en HTTPS uniquement
