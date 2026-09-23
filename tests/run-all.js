// Lance toutes les suites l'une après l'autre et résume. Code de sortie ≠ 0 si un test échoue.
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  ['security.test.js', 'Sécurité (attaques simulées)'],
  ['e2e-jsdom.test.js', 'Parcours complet (analyse → devis → récapitulatif)'],
  ['recap.test.js', 'Récapitulatif : export, réouverture, modification (vrai navigateur)'],
  ['sfx.test.js', 'Bruitages (déclenchement, coupure, mémorisation)'],
  ['dropdown.test.js', 'Menu « Ressource conservée » (souris, clavier)'],
  ['analysis.test.js', 'Analyse : _manifest ignoré, dossiers imbriqués'],
  ['filters.test.js', 'Filtres des conflits (type, LOD, lumières, occlusion)'],
  ['i18n.test.js', 'Langue FR / EN et express +15 %'],
  ['layout-fit.test.js', "Mise en page (tient dans l'écran sur poste de travail, défile sur mobile)"],
];

let failed = 0;
for (const [file, title] of suites) {
  process.stdout.write(`\n=== ${title} (${file}) ===\n`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split('\n');
  const bad = lines.filter(l => /^FAIL /.test(l) || /CRASH/.test(l));
  const summary = lines.filter(l => /RÉSULTAT|Tout passe/.test(l)).join(' | ');
  bad.forEach(l => console.log('  ' + l));
  const ok = r.status === 0 && !bad.length && !/[1-9]\d* échec\(s\)/.test(out);
  console.log(ok ? `  ✔ OK  ${summary}` : `  ✘ ÉCHEC  ${summary}`);
  if (!ok) failed++;
}
console.log(failed ? `\n${failed} suite(s) en échec.` : '\nToutes les suites passent.');
process.exit(failed ? 1 : 0);
