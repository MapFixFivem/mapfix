# MapFix

Outil de chiffrage pour **corriger les conflits de mapping FiveM**. Le client dépose ses ressources, l'analyse se
fait **dans son navigateur** (doublons de fichiers entre ressources, ressources cryptées), il coche ce qu'il veut
faire corriger, voit le prix — puis télécharge un **récapitulatif** (un fichier `.html`) qu'il t'envoie lui-même sur
Discord. Tu peux rouvrir ce même fichier sur le site pour le modifier (une remise, par exemple) et le retélécharger.
Tout le reste — validation, envoi des vrais fichiers, paiement, livraison, avis — se passe **sur Discord**, à la main.

> Le site ne parle à aucun serveur et ne conserve rien d'une visite à l'autre : pas de compte, pas de mot de passe,
> pas de base de données. Seule exception facultative : un webhook Discord (`CONFIG.webhookUrl`) qui te notifie
> quand un client dépose ses ressources et quand il télécharge son récapitulatif. Voir [`docs/SECURITE.md`](docs/SECURITE.md).

## Lancer

Double-clique sur `index.html`. Aucune installation, aucune compilation. Pour publier : GitHub Pages, ou n'importe
quel hébergeur statique.

1. **Devis** → « Charger un exemple », ou dépose un `.zip` / un dossier `resources` — [`examples/mapfix-exemple.zip`](examples/mapfix-exemple.zip) en fournit un vrai (factice) à tester.
2. Coche les conflits à corriger, renseigne ton pseudo Discord, télécharge le récapitulatif.
3. Pour le modifier plus tard (remise…) : glisse ce même fichier sur la page.

## Réglages

`js/config.js` (fichier public : **aucun secret ici**) :

| Réglage | Rôle |
|---|---|
| `discordInvite` | Lien d'invitation : active le bouton Discord du header |
| `showDemo` | `false` en production : masque « Charger un exemple » |
| `LIMITS` | Limites de robustesse (taille d'archive, nombre de fichiers…) |
| `DEFAULTS` | Prix (10 € pour 2 ressources, +5 € par ressource en plus, express, minimum) et fichiers ignorés par défaut à l'analyse |

Il n'y a pas d'espace admin : pour changer un prix, modifie `DEFAULTS` dans `js/config.js`. La couleur de la
marque : `--accent` dans `css/style.css`.

## Comment c'est rangé

```
index.html   css/   fonts/   vendor/   img/   js/      ← le site (tout ce qui est publié)
_headers                                                ← en-têtes de sécurité (Cloudflare Pages / Netlify)
docs/        SECURITE.md · ARCHITECTURE.md
tests/       npm test  (sécurité, parcours complet, récapitulatif, mise en page)
```

`tests/` et `docs/` ne sont pas nécessaires au fonctionnement : tu peux les retirer d'un dépôt public.

## Sécurité en bref

Zip piégés (chemins `../`, exécutables, bombes de décompression), noms `__proto__`, manifests conçus pour figer le
navigateur, XSS (y compris un récapitulatif trafiqué avant d'être renvoyé), iframe… Tout est corrigé et couvert par
des tests. Le détail honnête est dans [`docs/SECURITE.md`](docs/SECURITE.md).

## Tests

```
cd tests && npm install && npm test
```
