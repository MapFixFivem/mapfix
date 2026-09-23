# Tests

Ces tests ne sont pas nécessaires au fonctionnement du site (tu peux supprimer ce dossier du dépôt public).

```
cd tests
npm install
npm test
```

Prérequis : Node 20+ et Edge ou Chrome (sinon `EDGE_PATH=/chemin/vers/chrome npm test`).

| Suite | Ce qu'elle vérifie |
|---|---|
| `security.test.js` | Attaques simulées : zip piégés, chemins `../`, exécutables, `__proto__`, ReDoS, données corrompues, XSS (y compris un récapitulatif importé trafiqué), iframe, CSP, aucune requête réseau… |
| `e2e-jsdom.test.js` | Parcours logique complet (rapide, sans navigateur réel) : analyse → conflits → devis → export du récapitulatif → réouverture pour le modifier |
| `recap.test.js` | Le même parcours dans un vrai navigateur : téléchargement réel, réouverture du fichier tout seul (ce que reçoit la personne sur Discord), remise, réexport |
| `layout-fit.test.js` | Sur poste de travail (≥961px), la page ne défile jamais (accueil et analyse) ; sur mobile elle défile normalement sans rien couper ; jamais de chevauchement entre un nom de groupe et son prix |
| `screenshots.js` | Outil (pas un test) : captures d'écran dans `tests/out/` |
