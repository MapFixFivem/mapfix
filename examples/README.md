# Exemple de ressources

Un vrai `.zip` (et le dossier `resources/` non compressé) à glisser sur la page **Devis** pour tester le site
autrement qu'avec le bouton « Charger un exemple » (qui génère ses fichiers en mémoire, sans vrai `.zip` à
manipuler). Le contenu est entièrement factice — aucun vrai fichier de mapping GTA — juste ce qu'il faut pour que
l'analyseur de MapFix détecte de vrais cas :

| Ressource | Contenu | Ce que ça teste |
|---|---|---|
| `shop_ammu` | `ammu_int.ytyp`, `ammu_col.ybn`, `ammu_props.ydr`, `shop_sign.ytd` | Ressource « propre », lisible |
| `shop_ammu_v2` | Une ancienne mise à jour restée installée à côté de `shop_ammu` | `ammu_int.ytyp` **identique** (conflit sans risque) et `ammu_col.ybn` **différent** (deux versions incompatibles) — le cas le plus courant sur un serveur |
| `decor_pack` | Ressource sous escrow (`.fxap`), avec `escrow_ignore` pour `bench.ydr` | Un fichier crypté en conflit avec `shop_ammu` (`shop_sign.ytd`, badge « Non vérifiable ») ; `bench.ydr` reste marqué lisible grâce à `escrow_ignore` |

Résultat attendu en le déposant : 3 ressources, 3 fichiers en conflit, 2 conflits facturables, 1 ressource cryptée,
total 20 €.

**Utilisation :** sur la page Devis, dépose `mapfix-exemple.zip`, ou choisis le dossier `resources/` (bouton
« Choisir un dossier »).
