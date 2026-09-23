// Parcours complet, logique pure (rapide, sans navigateur réel) : analyse → choix des conflits → devis →
// export d'un récapitulatif → réouverture pour le modifier (remise) → réexport.
const { JSDOM, VirtualConsole } = require('jsdom');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail?.stack || e.message)));
vc.on('error', e => errors.push('console.error: ' + e));

(async () => {
  const fs = require('fs'), root = require('./lib').SITE.split(String.fromCharCode(92)).join('/') + '/';
  const html = fs.readFileSync(root + 'index.html', 'utf8')
    .replace(/<script src="(js\/[\w.-]+\.js|vendor\/[\w.-]+\.js)"><\/script>/g, (m, f) => '<script>' + fs.readFileSync(root + f, 'utf8') + '</script>');
  const dom = new JSDOM(html, {
    beforeParse(window) {
      if (!window.Blob.prototype.text) window.Blob.prototype.text = function () { return new Promise(r => { const fr = new window.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(this); }); };
    }, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, url: 'http://localhost/',
  });
  const w = dom.window, d = w.document;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  let ok = 0, ko = 0;
  const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };

  await wait(500);

  // ---- analyse
  click($('#btnDemo')); await wait(400);
  check('analyse affichée', !$('#analysis').hidden);
  check('vue « working » (page tenant à l\'écran)', $('#devis').classList.contains('working'));
  const confs = $$('#confList .conf');
  check('conflits détectés', confs.length > 0, confs.length + ' conflits');
  check('manifest_generator ignoré (règle par défaut)', !$('#confList').textContent.includes('manifest_generator'));
  const total0 = $('#total').textContent;
  console.log('   total initial :', total0.replace(/\s/g, ' '), '|', $$('#lines .line').map(l => l.textContent.replace(/\s+/g, ' ').trim()).join(' / '));

  // ---- cases : cocher/décocher touche la bonne ligne (régression : les ids doivent être attribués après le tri)
  const first = confs[0], name0 = first.querySelector('b').textContent;
  click(first.querySelector('.tick')); await wait(30);
  const row0 = $$('#confList .conf').find(r => r.querySelector('b').textContent === name0);
  check('décocher touche la bonne ligne', !row0.querySelector('.tick').checked && row0.classList.contains('off'));
  check('les autres restent cochées', $$('#confList .tick:checked').length === confs.length - 1);
  click(row0.querySelector('.tick')); await wait(30);
  check('recocher', $$('#confList .tick:checked').length === confs.length);

  // ---- cible une ressource
  click($$('#resList .res')[2]); await wait(30);
  check('focus ressource filtre la liste', $$('#confList .conf').length < confs.length, $$('#confList .conf').length + ' visibles');
  click($('#clearFocus')); await wait(30);

  // ---- décocher un conflit change le total
  const deco = $$('#confList .conf').find(r => r.querySelector('b').textContent === 'deco_plant.ydr');
  click(deco.querySelector('.tick')); await wait(30);
  const total1 = $('#total').textContent;
  check('décocher un conflit change le total', total1 !== total0, total0 + ' -> ' + total1);
  click(deco.querySelector('.tick')); await wait(30);   // recoché pour la suite

  // ---- export du récapitulatif (données pures, sans déclencher le téléchargement réel)
  $('#discord').value = 'testeur#0001';
  const data = JSON.parse(w.eval('JSON.stringify(buildRecap())'));
  check('récapitulatif : contient les conflits cochés et le pseudo', data.meta.name === 'testeur#0001' && data.conflicts.length === confs.length && data.snapshot.groups.length > 0);
  check('récapitulatif : mode "client" (pas encore modifié)', data.mode === 'client');
  const total = data.snapshot.total;

  const doc = w.eval('recapHTML(buildRecap())');
  check('le fichier exporté est un document autonome (pas de <script src>, une seule donnée intégrée)', doc.includes('id="mf-data"') && !/<script[^>]*\ssrc=/.test(doc));

  // ---- réouverture du récapitulatif pour le modifier
  w.__doc = doc;
  await w.eval('importRecapFile({ text: async () => window.__doc })');
  await wait(50);
  check('réouverture : bascule en vue « working » avec la même sélection', !$('#editBar').hidden && $$('#confList .conf').length === confs.length);
  check('réouverture : champs pré-remplis', $('#discord').value === 'testeur#0001');
  check('réouverture : total identique avant remise', Math.abs(JSON.parse(w.eval('JSON.stringify(quote())')).total - total) < 0.01);

  $('#discPct').value = '20'; $('#discPct').dispatchEvent(new w.Event('input'));
  await wait(30);
  const q = JSON.parse(w.eval('JSON.stringify(quote())'));
  check('remise de 20 % appliquée au total', Math.abs(q.total - Math.round(total * 0.8 * 100) / 100) < 0.02, `${total} -> ${q.total}`);

  const data2 = JSON.parse(w.eval('JSON.stringify(buildRecap())'));
  check('le récapitulatif réexporté passe en mode "edit"', data2.mode === 'edit' && data2.discountPct === 20);

  // ---- un récapitulatif hostile ne doit jamais faire planter la relecture
  const junk = [null, 5, 'x', { v: 1 }, { v: 2, conflicts: [] }, { v: 1, conflicts: [{ res: ['a', 'b'] }] }];
  const safe = junk.every(j => { w.__j = j; try { return w.eval('sanitizeRecap(window.__j)') !== undefined; } catch { return false; } });
  check('sanitizeRecap : jamais d\'exception sur une donnée quelconque', safe);
  w.__j2 = { v: 2, conflicts: [{ res: ['a', 'b'] }] };
  check('sanitizeRecap : version manquante/différente refusée', w.eval('sanitizeRecap(window.__j2)') === null);

  const realErrors = errors.filter(e => !/Not implemented: Window's scrollTo/.test(e));   // limite connue de jsdom, sans rapport avec le site
  console.log('\nRÉSULTAT :', ok, 'OK,', ko, 'échec(s)');
  if (realErrors.length) { console.log('\nERREURS JS :'); realErrors.slice(0, 8).forEach(e => console.log(' -', e.split('\n').slice(0, 3).join(' | '))); }
  else console.log('Aucune erreur JS.');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('CRASH du test', e); process.exit(2); });
