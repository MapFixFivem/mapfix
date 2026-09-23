// Règles d'analyse : _manifest.ymf n'est jamais un conflit, et les conflits sont trouvés quelle que soit la profondeur
// des dossiers (ressources rangées dans [maps]/[mlo], sous-sous-dossiers, ressource imbriquée dans une autre).
const puppeteer = require('puppeteer-core');
const { URL, launch } = require('./lib');

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };

(async () => {
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL, { waitUntil: 'networkidle2' });

  const run = paths => page.evaluate(async paths => {
    const rsc7 = async () => new Uint8Array([0x52, 0x53, 0x43, 0x37, 0, 0, 0, 0]);
    const mk = p => ({ rawPath: p, size: 1000 + p.length, header: rsc7, blob: async () => new Blob(['x']) });
    const S2 = await analyze(finalizeEntries(paths.map(mk)));
    return { conflicts: S2.conflicts.map(c => ({ name: c.name, res: c.res })), ignored: S2.ignored, resources: S2.resources.map(r => r.name).sort() };
  }, paths);

  // 1. _manifest.ymf : présent dans les deux MLO, mais jamais compté (quelle que soit la casse)
  let r = await run(['mlo_a/fxmanifest.lua', 'mlo_a/stream/_manifest.ymf', 'mlo_b/fxmanifest.lua', 'mlo_b/stream/_MANIFEST.YMF', 'mlo_b/stream/vrai.ydr', 'mlo_a/stream/vrai.ydr']);
  check('_manifest.ymf ignoré (même en majuscules)', !r.conflicts.some(c => /_manifest/i.test(c.name)) && r.ignored === 2, JSON.stringify(r.conflicts));
  check('un vrai conflit à côté est toujours détecté', r.conflicts.length === 1 && r.conflicts[0].name === 'vrai.ydr');

  // 2. profondeur : ressources rangées dans des dossiers de catégories et fichiers très enfouis
  r = await run([
    'resources/[maps]/[mlo]/mlo_a/fxmanifest.lua', 'resources/[maps]/[mlo]/mlo_a/stream/interior/props/a/b/c/d/shared.ydr',
    'resources/zzz/autre/tres/loin/mlo_b/fxmanifest.lua', 'resources/zzz/autre/tres/loin/mlo_b/data/x/y/z/w/v/shared.ydr',
  ]);
  check('conflit trouvé au fond de dossiers imbriqués (6 à 8 niveaux)', r.conflicts.length === 1 && [...r.conflicts[0].res].sort().join() === 'mlo_a,mlo_b', JSON.stringify(r));

  // 3. ressource imbriquée dans une autre : le fichier appartient à la ressource la plus proche
  r = await run(['mlo_a/fxmanifest.lua', 'mlo_a/sub/mlo_c/fxmanifest.lua', 'mlo_a/sub/mlo_c/stream/p.ydr', 'mlo_b/fxmanifest.lua', 'mlo_b/stream/p.ydr']);
  check('ressource imbriquée : le fichier va à la ressource la plus proche', r.conflicts.length === 1 && [...r.conflicts[0].res].sort().join() === 'mlo_b,mlo_c', JSON.stringify(r.conflicts));

  // 4. chemin long (dossiers très profonds) accepté
  const deep = 'resources/' + Array.from({ length: 14 }, (_, i) => 'niveau' + i).join('/');
  r = await run([deep + '/mlo_a/fxmanifest.lua', deep + '/mlo_a/stream/z.ydr', deep + '/mlo_b/fxmanifest.lua', deep + '/mlo_b/stream/z.ydr']);
  check('chemins très profonds (14 niveaux) acceptés', r.conflicts.length === 1, JSON.stringify(r.conflicts));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
