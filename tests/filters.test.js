// Barre de filtres des conflits : par type de fichier et par nature (LOD, lumières, occlusion), cumulables, avec compteurs.
const puppeteer = require('puppeteer-core');
const { URL, wait, launch } = require('./lib');

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };

(async () => {
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  // jeu de conflits réalistes, dont des LOD / lumières / occlusion, et « explode » qui ne doit PAS compter comme LOD
  await page.evaluate(async () => {
    const rsc7 = async () => new Uint8Array([0x52, 0x53, 0x43, 0x37, 0, 0, 0, 0]);
    const names = ['a.ymap', 'b.ymap', 'x_lod.ymap', 'hi_slod1.ydr', 'mlo_lodlights.ymap', 'distantlights_hd.ymap', 'occl_bank.ymap', 'a.ytyp', 'col.ybn', 'explode.ydr'];
    const paths = []; ['res_a', 'res_b'].forEach(r => { paths.push(r + '/fxmanifest.lua'); names.forEach(n => paths.push(r + '/stream/' + n)); });
    const mk = p => ({ rawPath: p, size: 100 + p.length, header: rsc7, blob: async () => new Blob(['x']) });
    S = await analyze(finalizeEntries(paths.map(mk))); S.limit = CONF_PAGE;
    enterWorking(); renderAnalysis();
  });
  await wait(300);

  const chips = () => page.$$eval('#filterBar .chip', c => c.map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  const rows = () => page.$$eval('#confList .conf', r => r.map(x => x.querySelector('b').textContent));
  let c = await chips();
  check('la barre propose Tous + les types présents', c[0] === 'Tous 10' && c.some(x => x.startsWith('.ymap')) && c.some(x => x.startsWith('.ytyp')) && c.some(x => x.startsWith('.ybn')), c.join(' | '));
  check('étiquettes LOD, Lumières, Occlusion présentes', ['LOD', 'Lumières', 'Occlusion'].every(t => c.some(x => x.startsWith(t))), c.join(' | '));

  await page.click('[data-f="tag:lod"]'); await wait(200);
  let r = await rows();
  check('LOD : x_lod, hi_slod1, mlo_lodlights — mais pas « explode »', r.length === 3 && !r.includes('explode.ydr'), r.join(', '));
  await page.click('[data-f="tag:light"]'); await wait(200);
  r = await rows();
  check('cumul LOD + Lumières = l\'un OU l\'autre', r.length === 4 && r.includes('distantlights_hd.ymap'), r.join(', '));
  await page.click('[data-f=""]'); await wait(200);
  check('« Tous » réinitialise', (await rows()).length === 10);

  await page.click('[data-f="ext:ymap"]'); await wait(200);
  r = await rows();
  check('filtre .ymap', r.length === 6 && r.every(n => n.endsWith('.ymap')), r.join(', '));
  await page.click('[data-f="tag:occl"]'); await wait(200);
  check('.ymap OU occlusion', (await rows()).length === 6);

  // « Tout décocher » ne touche que ce qui est affiché
  await page.click('[data-f=""]'); await page.click('[data-f="ext:ybn"]'); await wait(200);
  await page.click('#allOff'); await wait(200);
  const st = await page.evaluate(() => ({ off: S.conflicts.filter(c => !c.checked).map(c => c.name), on: S.conflicts.filter(c => c.checked).length }));
  check('« Tout décocher » ne décoche que le filtre affiché', st.off.length === 1 && st.off[0] === 'col.ybn' && st.on === 9, JSON.stringify(st));
  await page.click('#allOn'); await wait(100);
  check('« Tout cocher » les recoche', await page.evaluate(() => S.conflicts.every(c => c.checked)));

  await page.click('.lang [data-lang="en"]'); await wait(300);
  check('libellés traduits en anglais', (await chips())[0].startsWith('All') && (await chips()).some(x => x.startsWith('Lights')));
  const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: innerHeight }));
  check('la page ne défile toujours pas', m.sh <= m.ih + 1, JSON.stringify(m));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
