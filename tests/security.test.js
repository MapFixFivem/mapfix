// Tests de sécurité : chaque attaque doit ÉCHOUER. Un « FAIL » = une faille ouverte.
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { SITE, URL, EDGE, wait, launch } = require('./lib');

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');
const LIMITS_RECAP_CONFLICTS = 20000;   // doit rester synchronisé avec LIMITS.recapConflicts (js/config.js)

(async () => {
  /* ============== 1. audit statique des fichiers (sans navigateur) ============== */
  const html = read('index.html');
  const jsFiles = fs.readdirSync(path.join(SITE, 'js')).filter(f => f.endsWith('.js'));
  const src = Object.fromEntries(jsFiles.map(f => [f, read('js/' + f)]));
  const all = html + Object.values(src).join('\n') + read('css/style.css');

  check('CSP présente (meta) et stricte : script-src \'self\', connect-src \'none\', pas d\'unsafe-eval ni de script en ligne',
    /Content-Security-Policy/.test(html) && /script-src 'self'(?!\s+'unsafe)/.test(html) && /connect-src 'none'/.test(html) && !/unsafe-eval/.test(html) && !/script-src[^;]*unsafe-inline/.test(html));
  check('aucune ressource externe (http/https) dans la page', !/(?:src|href)="https?:/i.test(html) && !/url\(\s*['"]?https?:/i.test(read('css/style.css')) && !/url\(\s*['"]?https?:/i.test(read('fonts/fonts.css')));
  check('aucun gestionnaire en ligne (onclick=…) ni script en ligne', !/\son[a-z]+\s*=\s*["']/i.test(html) && !Object.values(src).some(s => /\son(click|change|input|load|error)\s*=\s*["']/.test(s)) && !/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html));
  check('aucun eval / new Function / document.write / setTimeout(string)', !Object.values(src).some(s => /\beval\s*\(|new Function\s*\(|document\.write\s*\(|setTimeout\(\s*['"`]/.test(s)));
  check('aucun mot de passe, jeton ni webhook dans le code public (le site ne parle à aucun serveur)', !/adminPassword|discordWebhook|discord\.com\/api\/webhooks|password\s*[:=]\s*['"][^'"]{3,}|apiKey\s*[:=]/i.test(all));
  check('aucun appel réseau dans le code (fetch/XMLHttpRequest/WebSocket) : le site n\'envoie rien nulle part', !/\bfetch\s*\(|new\s+XMLHttpRequest|new\s+WebSocket/.test(Object.values(src).join('\n')));
  const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
  const bad = [...jsFiles.map(f => 'js/' + f), 'index.html', 'css/style.css'].filter(f => CTRL.test(read(f)));
  check('aucun caractère invisible ou de renversement (« Trojan Source ») dans les sources', bad.length === 0, bad.join(', '));
  check('recap.js n\'écrit jamais un </script> littéral (casserait tout document qui l\'inclinerait en script inline)', !/<\/script>/.test(read('js/recap.js')));
  const sri = fs.readFileSync(path.join(SITE, 'vendor/jszip.sri.txt'), 'utf8').trim();
  const real = 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(SITE, 'vendor/jszip.min.js'))).digest('base64');
  check('JSZip hébergé : empreinte SHA-384 conforme à celle enregistrée', sri === real && /JSZip v3\.10\.1/.test(read('vendor/jszip.min.js').slice(0, 200)));
  check('toutes les balises <script> pointent vers des fichiers du site', [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].every(m => /^(js|vendor)\//.test(m[1])));
  check('liens externes sûrs : target=_blank toujours accompagné de rel=noopener', [...(all.match(/target="_blank"[^>]*/g) || [])].every(a => /noopener/.test(a)));

  /* ============== 2. navigateur ============== */
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.setViewport({ width: 1400, height: 900 });
  await page.evaluateOnNewDocument(() => { window.__fetches = 0; const f = window.fetch; window.fetch = (...a) => { window.__fetches++; return f.apply(window, a); }; });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle2' });
  const E = (fn, ...a) => page.evaluate(fn, ...a);

  /* ---- noms piégés : pollution de prototype ---- */
  const proto = await E(async () => {
    const mk = (rawPath, size = 100) => ({ path: rawPath, size, header: async () => new Uint8Array([0x52, 0x53, 0x43, 0x37]), blob: async () => new Blob(['x']) });
    const es = [];
    for (const n of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '__defineGetter__'])
      es.push(mk(n + '/fxmanifest.lua', 10), mk(n + '/stream/a.ydr'), mk('ok_' + n + '/fxmanifest.lua', 10), mk('ok_' + n + '/stream/a.ydr'));
    let err = null, res = null;
    try { res = await analyze(es); } catch (e) { err = String(e); }
    return { err, keys: Object.keys(Object.prototype), fn: ['files', 'size', 'stream'].some(k => Object.hasOwn(Object, k)), fnproto: ({}).files, n: res?.resources?.length, names: res?.resources?.map(r => r.name) };
  });
  check('noms de ressources piégés (__proto__, constructor…) : pas de plantage', !proto.err && proto.n === 12, proto.err || proto.n + ' ressources');
  check('… et aucune pollution de Object.prototype', proto.keys.length === 0 && !proto.fn && proto.fnproto === undefined, JSON.stringify(proto.keys));

  /* ---- chemins ---- */
  const sp = await E(() => ['../../evil.bat', '/abs/x.ydr', 'C:\\Windows\\x.exe', 'res/../../../outside.ydr', 'a//b///c.ydr', './x/./y.ydr', 'a/..\\..\\b.ydr', 'stream/\u202Eexe.ydr', 'x/y.ydr.', 'con:aux/a<b>.ydr', 'a'.repeat(400) + '.ydr', '..', ''].map(p => [p, sanitizePath(p)]));
  const safe = sp.every(([, o]) => !/(^|\/)\.\.(\/|$)/.test(o) && !o.startsWith('/') && !/^[A-Za-z]:/.test(o) && !/[\u202e<>:"|?*]/.test(o) && !o.includes('\\') && o.length <= 260);
  check('sanitizePath : jamais de « .. », de chemin absolu, de lecteur, de caractère interdit ou de renversement bidi', safe, JSON.stringify(sp.slice(0, 5)));
  check('sanitizePath : « res/../../../outside.ydr » reste dans la racine', sp[3][1] === 'outside.ydr', sp[3][1]);

  const ing = await E(() => {
    const fake = (p, size = 10) => ({ webkitRelativePath: p, name: p.split(/[\\/]/).pop(), size, slice: () => ({ arrayBuffer: async () => new ArrayBuffer(8) }) });
    const out = entriesFromFolder([fake('res/fxmanifest.lua'), fake('res/stream/a.ydr'), fake('../../evil.bat'), fake('C:\\Windows\\x.exe'), fake('res/s/run.ps1'), fake('res/a.ydr.EXE'), fake('/abs/y.ydr'), fake('res/stream/A.YDR'), fake('res/stream/a.ydr'), fake('.exe')]);
    return { paths: out.map(e => e.path), blocked: out.rejected.blocked, dup: out.rejected.duplicate };
  });
  check('dépôt : .exe / .bat / .ps1 / .exe masqués (majuscules, double extension) bloqués', ['evil.bat', 'Windows/x.exe', 'a.ydr.EXE', 'run.ps1', '.exe'].every(b => ing.blocked.some(x => x.toLowerCase().endsWith(b.toLowerCase()))) && !ing.paths.some(p => /\.(exe|bat|ps1)$/i.test(p)), JSON.stringify(ing.blocked));
  check('dépôt : chemins finalement sûrs et doublons (casse) écartés', ing.paths.every(p => !p.startsWith('/') && !p.includes('..')) && ing.dup >= 2, JSON.stringify(ing.paths) + ' dup=' + ing.dup);

  /* ---- limites : bombes, tailles ---- */
  const lim = await E(async () => {
    const r = {};
    const tryIt = async (k, fn) => { try { await fn(); r[k] = 'accepté'; } catch (e) { r[k] = e instanceof IngestError ? e.message : 'ERREUR: ' + e; } };
    await tryIt('big', () => entriesFromZip({ size: 2e9 }));
    const realLoad = JSZip.loadAsync;
    const fakeZip = files => () => Promise.resolve({ forEach: cb => files.forEach(([p, s, c]) => cb(p, { dir: false, _data: { uncompressedSize: s, compressedSize: c }, async: async () => new Uint8Array(1) })) });
    JSZip.loadAsync = fakeZip([['a/x.bin', 1e9, 1000]]);
    await tryIt('ratio', () => entriesFromZip({ size: 1000 }));
    JSZip.loadAsync = fakeZip(Array.from({ length: LIMITS.entries + 1 }, (_, i) => ['f/' + i + '.ydr', 1, 1]));
    await tryIt('count', () => entriesFromZip({ size: 1000 }));
    JSZip.loadAsync = fakeZip([['a/x.bin', 7e9, 7e9]]);
    await tryIt('total', () => entriesFromZip({ size: 1000 }));
    JSZip.loadAsync = () => Promise.reject(new Error('corrupt'));
    await tryIt('corrupt', () => entriesFromZip({ size: 1000 }));
    JSZip.loadAsync = fakeZip([['a/big.ydr', 1e8, 1e7]]);
    const es = await entriesFromZip({ size: 1000 });
    r.header = await es[0].header();
    JSZip.loadAsync = realLoad;
    await tryIt('folder', async () => entriesFromFolder(Array.from({ length: LIMITS.entries + 1 }, (_, i) => ({ webkitRelativePath: 'd/' + i, name: String(i), size: 1 }))));
    return r;
  });
  check('archive > 1,5 Go refusée', /trop volumineuse/.test(lim.big), lim.big);
  check('« bombe » de décompression (ratio 1 000 000:1) refusée', /suspecte/.test(lim.ratio), lim.ratio);
  check('trop de fichiers (30 001) refusé — zip et dossier', /Trop de fichiers/.test(lim.count) && /Trop de fichiers/.test(lim.folder), lim.count + ' | ' + lim.folder);
  check('taille décompressée > 6 Go refusée', /décompressé/.test(lim.total), lim.total);
  check('archive corrompue : message clair, pas de plantage', /illisible/.test(lim.corrupt), lim.corrupt);
  check('gros fichier : l\'en-tête n\'est pas lu (pas de décompression complète)', lim.header === null);

  /* ---- vrai zip avec JSZip ---- */
  const zipRound = await E(async () => {
    const z = new JSZip();
    z.file('pack/fxmanifest.lua', "fx_version 'cerulean'"); z.file('pack/stream/a.ydr', 'x'); z.file('pack/stream/evil.exe', 'MZ'); z.file('pack/run.bat', 'echo'); z.file('../../escape.ydr', 'x');
    const blob = await z.generateAsync({ type: 'blob' });
    const es = await entriesFromZip(blob);
    return { paths: es.map(e => e.path), blocked: es.rejected.blocked };
  });
  check('vrai .zip : exécutables retirés, chemin « ../../escape.ydr » neutralisé', zipRound.blocked.length === 2 && zipRound.paths.every(p => !p.includes('..') && !/\.(exe|bat)$/.test(p)), JSON.stringify(zipRound));

  /* ---- ReDoS / performances ---- */
  const redos = await E(async () => {
    const t0 = performance.now();
    const evil = "escrow_ignore {\n" + Array.from({ length: 200 }, () => "'" + '**/'.repeat(30) + "a'").join(',\n') + '\n}\n' + '--[['.repeat(40000);
    const pats = parseEscrowIgnore(evil), g = compileGlobs(pats);
    resetMatchBudget();
    const long = 'x/'.repeat(120) + 'zzzz';
    const r1 = compileGlobs(['*a*a*a*a*a*a*a*a*b'])[0] ?? null;      // > 6 jokers : refusé
    const g2 = compileGlobs(['*a*a*a*a*b'])[0];
    for (let i = 0; i < 2000; i++) globMatch(g2, long);
    return { ms: Math.round(performance.now() - t0), pats: pats.length, compiled: g.length, r1, budget: matchBudget };
  });
  check('manifest piégé (200 motifs à 30 jokers + 40 000 « --[[ ») : traité en < 1,5 s', redos.ms < 1500, redos.ms + ' ms');
  check('motif avec trop de jokers refusé ; budget de calcul plafonné', redos.r1 === null && redos.budget >= -5e8, 'budget=' + redos.budget);
  const glob = await E(() => { const t = (p, s) => globMatch(compileGlob(p), s); return [t('stream/*.ydr', 'stream/a.ydr'), t('stream/*.ydr', 'stream/x/a.ydr'), t('stream/**.ydr', 'stream/x/a.ydr'), t('*generator*', 'manifest_generator.ytd'), t('A.YDR', 'a.ydr'), t('a?.ydr', 'a?.ydr'), t('a.ydr', 'b.ydr')]; });
  check('comparaison de motifs correcte (*, **, casse, littéraux)', JSON.stringify(glob) === JSON.stringify([true, false, true, true, true, true, false]), JSON.stringify(glob));

  const perf = await E(async () => {
    const t0 = performance.now(); const es = [];
    for (let r = 0; r < 500; r++) { es.push({ path: `res${r}/fxmanifest.lua`, size: 10, header: null, blob: async () => new Blob(['']) }); for (let f = 0; f < 49; f++) es.push({ path: `res${r}/stream/f${f % 30}.ydr`, size: 100 + (f % 3), header: async () => new Uint8Array([0x52, 0x53, 0x43, 0x37]), blob: async () => new Blob(['']) }); }
    const s = await analyze(es);
    return { ms: Math.round(performance.now() - t0), files: es.length, res: s.resources.length, conf: s.conflicts.length };
  });
  check('analyse de 25 000 fichiers / 500 ressources en < 8 s (interface non figée)', perf.ms < 8000 && perf.res === 500, JSON.stringify(perf));

  /* ---- validations ---- */
  const val = await E(() => ({
    pseudo: ['lenzo#0001', 'Kévin_RP', '<img src=x onerror=1>', 'a', 'x'.repeat(41), 'ok name', '‮abc', "a'b", '你好世界'].map(validPseudo),
    date: [new Date(Date.now() + 864e5 * 3).toISOString().slice(0, 10), '2001-01-01', '2999-01-01', '2026-13-40', 'abc', "2026-09-20'; DROP", ''].map(validDeadline),
  }));
  check('pseudo Discord : accepte lettres/chiffres/._#-, refuse HTML, longueur et caractères de contrôle', val.pseudo[0] && val.pseudo[1] && val.pseudo[5] && val.pseudo[8] && !val.pseudo[2] && !val.pseudo[3] && !val.pseudo[4] && !/[202e]/.test(val.pseudo[6]) && !val.pseudo[7], JSON.stringify(val.pseudo));
  check('date de livraison : vide acceptée (optionnelle), mais ni trop lointaine ni invalide', !!val.date[0] && val.date[6] === '' && val.date.slice(1, 6).every(x => !x), JSON.stringify(val.date));

  /* ---- récapitulatif : relecture d'un fichier importé (donnée non fiable) ---- */
  const recapJunk = await E(() => {
    const cases = [null, undefined, 5, 'texte', [], { v: 2, conflicts: [{ res: ['a', 'b'] }] }, { v: 1 }, { v: 1, conflicts: 'oops' },
      { v: 1, conflicts: [{ res: ['a'] }] },   // un seul côté : pas un conflit, doit être écarté
      { v: 1, conflicts: Array.from({ length: 50000 }, () => ({ res: ['a', 'b'] })) },
      { v: 1, conflicts: [{ res: ['a', 'b'] }], meta: { __proto__: { polluted: true }, name: 'x'.repeat(9999) }, resources: 'oops', discountPct: 99999, discountAmount: -50 }];
    const results = cases.map(c => { try { return sanitizeRecap(c); } catch (e) { return 'THROW:' + e.message; } });
    return { results: results.map(r => r === null ? null : typeof r === 'string' ? r : { n: r.conflicts.length, res: r.resources.length, name: r.meta.name.length, disc: r.discountPct, amt: r.discountAmount }), polluted: ({}).polluted };
  });
  check('sanitizeRecap : jamais d\'exception, même sur une donnée totalement absurde', recapJunk.results.every(r => typeof r !== 'string'), JSON.stringify(recapJunk.results));
  check('sanitizeRecap : version absente/différente ou sans conflit valable → rejeté (null)', recapJunk.results[0] === null && recapJunk.results[1] === null && recapJunk.results[2] === null && recapJunk.results[3] === null && recapJunk.results[4] === null && recapJunk.results[5] === null && recapJunk.results[6] === null && recapJunk.results[7] === null, JSON.stringify(recapJunk.results.slice(0, 8)));
  check('sanitizeRecap : un seul côté à un conflit (res à 1 élément) est écarté, pas un conflit facturable', recapJunk.results[8] === null, JSON.stringify(recapJunk.results[8]));
  check('sanitizeRecap : liste de conflits bornée (50 000 → 20 000 max)', recapJunk.results[9]?.n === LIMITS_RECAP_CONFLICTS, JSON.stringify(recapJunk.results[9]));
  check('sanitizeRecap : clé __proto__ dans meta sans effet, champs bornés et types corrects', !recapJunk.polluted && recapJunk.results[10].name <= 40 && recapJunk.results[10].res === 0 && recapJunk.results[10].disc <= 100 && recapJunk.results[10].amt === 0, JSON.stringify(recapJunk.results[10]));

  // ---- un récapitulatif hostile, importé pour de vrai, ne doit jamais s'exécuter (XSS) ni planter le rendu
  const xss = await E(async () => {
    const P = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=(window.__xss||0)+1">';
    const data = { v: 1, meta: { name: P, message: P, deadline: '' }, express: false, discountPct: 0, discountAmount: 0,
      resources: [{ name: P, files: 1, size: 1, encrypted: true }, { name: 'b', files: 1, size: 1, encrypted: false }],
      conflicts: [{ name: P, ext: 'ydr', critical: true, identical: false, locked: true, checked: true, keep: P, res: [P, 'b'] }],
      snapshot: { groups: [{ res: [P, 'b'], files: [P], locked: 1, price: 10 }], sub: 10, extra: 0, base: 10, off: 0, total: 10 } };
    const html = recapHTML(data);
    await importRecapFile({ text: async () => html });
    await new Promise(r => setTimeout(r, 200));
    return { fired: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, svgs: document.querySelectorAll('svg[onload]').length,
      inj: document.querySelectorAll('[onerror],[onload]').length, rendered: document.querySelector('#confList').textContent.includes('img src=x') };
  });
  check('récapitulatif hostile réimporté : rien ne s\'exécute ni ne s\'injecte (pseudo, message, conflit, ressource, fichier)', xss.fired === 0 && xss.imgs === 0 && xss.svgs === 0 && xss.inj === 0 && xss.rendered, JSON.stringify(xss));

  // nom de ressource/fichier piégé provenant d'un dépôt réel (pas un récapitulatif : une archive)
  await page.goto(URL, { waitUntil: 'networkidle2' }); await E(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle2' });
  await E(async () => {
    const P = '"><img src=x onerror="window.__xss=(window.__xss||0)+1">';
    const fake = (p, size = 10) => ({ webkitRelativePath: p, name: p.split('/').pop(), size, slice: () => ({ arrayBuffer: async () => new ArrayBuffer(8) }), text: async () => '' });
    const es = entriesFromFolder([fake(P + '/fxmanifest.lua'), fake(P + '/stream/a.ydr'), fake('ok/fxmanifest.lua'), fake('ok/stream/a.ydr')]);
    await handleEntries(es);
  }); await wait(700);
  const xd = await E(() => ({ fired: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, has: document.querySelector('#resList').textContent.includes('img src=x') && !document.querySelector('#resList').textContent.includes('<img') }));
  check('XSS : nom de dossier piégé dans un dépôt → neutralisé (« < > " | » remplacés) et affiché comme texte, jamais exécuté', xd.fired === 0 && xd.imgs === 0 && xd.has, JSON.stringify(xd));

  /* ---- export : validations avant de générer le fichier ---- */
  await page.goto(URL, { waitUntil: 'networkidle2' }); await E(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle2' });
  const inval = await E(async () => {
    await handleEntries(demoEntries);
    document.querySelector('#discord').value = '<script>alert(1)</script>'; exportRecap(); const a = document.querySelector('#sendHint').textContent;
    document.querySelector('#discord').value = 'ok#1'; document.querySelector('#msg').value = 'y'.repeat(2000); exportRecap(); const b = document.querySelector('#sendHint').textContent;
    document.querySelectorAll('.tick').forEach(t => { t.checked = false; t.dispatchEvent(new Event('change', { bubbles: true })); });
    document.querySelector('#msg').value = ''; exportRecap(); const c = document.querySelector('#sendHint').textContent;
    return a + '|' + b + '|' + c;
  });
  check('export : pseudo HTML, message trop long et aucun conflit coché sont refusés côté logique', /invalide/.test(inval) && /trop long/.test(inval) && /Sélectionne/.test(inval), inval);

  /* ---- réseau : rien ne sort du site ---- */
  const fetches = await E(() => window.__fetches);
  check('aucune requête réseau émise par l\'application (fetch) — le site ne parle à aucun serveur', fetches === 0, String(fetches));

  /* ---- anti-encadrement (clickjacking) ---- */
  const wrapper = path.join(SITE, '..', '__frame_test.html');
  fs.writeFileSync(wrapper, `<!doctype html><iframe id="f" src="site/index.html" width="800" height="600"></iframe>`);
  const p2 = await browser.newPage(); await p2.goto('file:///' + wrapper.replace(/\\/g, '/').replace(/ /g, '%20')); await wait(1200);
  const fr = p2.frames().find(f => f !== p2.mainFrame());
  const framed = fr ? await fr.evaluate(() => document.documentElement.textContent.trim().length + '|' + document.querySelectorAll('main').length).catch(() => 'inaccessible') : 'pas de frame';
  fs.unlinkSync(wrapper); await p2.close();
  check('anti-clickjacking : encadré dans un iframe, le site se vide', /^0\|0$/.test(framed) || framed === 'inaccessible', framed);

  check('aucune erreur JavaScript inattendue pendant tous les tests', errs.filter(e => !/Affichage dans un cadre|URI malformed/.test(e)).length === 0, errs.filter(e => !/Affichage dans un cadre/.test(e)).slice(0, 3).join(' | '));

  console.log('\nRÉSULTAT SÉCURITÉ :', ok, 'OK,', ko, 'échec(s)');
  await browser.close();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('CRASH du test', e); process.exit(2); });
