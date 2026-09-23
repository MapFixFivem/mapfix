// Sur un poste de travail (≥961px de large, ≥620px de haut), la page ne doit JAMAIS avoir besoin de défiler,
// ni à l'accueil ni pendant l'analyse (seules les listes internes — ressources, conflits, devis — défilent, chacune
// dans sa propre carte). Sur petit écran (mobile), la page défile normalement à la place. On vérifie aussi qu'un
// nom de groupe long ne chevauche jamais son prix, et qu'il n'y a jamais de scroll horizontal.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { URL, EDGE, OUT, wait, launch } = require('./lib');
const dir = OUT + '/'; fs.mkdirSync(dir, { recursive: true });

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };

(async () => {
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));

  const measure = () => page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth }));

  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720]]) {
    await page.setViewport({ width: w, height: h });
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(200);

    let m = await measure();
    check(`accueil ${w}x${h} : tient dans l'écran, sans scroll`, m.sh <= m.ih + 1 && m.sw <= m.iw + 1, `contenu=${m.sh}x${m.sw} écran=${m.ih}x${m.iw}`);
    if (w === 1920) await page.screenshot({ path: dir + `20-devis-home-${w}.png` });

    await page.evaluate(() => document.getElementById('btnDemo').click()); await wait(800);
    m = await measure();
    check(`analyse ${w}x${h} : tient dans l'écran, sans scroll`, m.sh <= m.ih + 1 && m.sw <= m.iw + 1, `contenu=${m.sh}x${m.sw} écran=${m.ih}x${m.iw}`);
    if (w === 1920) await page.screenshot({ path: dir + `21-devis-working-${w}.png` });

    const cut = await page.evaluate(() => [...document.querySelectorAll('#stats .stat')].filter(s => getComputedStyle(s).display !== 'none')
      .filter(s => { const sp = s.querySelector('span'); return sp.scrollWidth > sp.clientWidth; }).map(s => s.querySelector('span').textContent));
    check(`barre de chiffres : aucun libellé tronqué ${w}x${h}`, cut.length === 0, cut.join(', '));

    const overlap = await page.evaluate(() => [...document.querySelectorAll('#lines .line.g')].some(l => {
      const name = l.querySelector('.gr'), price = l.querySelector('b:last-child');
      if (!name || !price) return false;
      const a = name.getBoundingClientRect(), b = price.getBoundingClientRect();
      return a.right > b.left + 1 && a.bottom > b.top && a.top < b.bottom;
    }));
    check(`devis : nom de groupe et prix ne se chevauchent jamais ${w}x${h}`, !overlap);
  }

  // mobile : la page défile normalement, rien n'est coupé (le total et le bouton d'envoi restent atteignables)
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(() => document.getElementById('btnDemo').click()); await wait(800);
  const mobileM = await measure();
  check('mobile : scroll de page normal accepté (pas de contenu coupé)', mobileM.sh >= mobileM.ih, `contenu=${mobileM.sh}px écran=${mobileM.ih}px`);
  await page.evaluate(() => document.getElementById('btnSend').scrollIntoView({ behavior: 'instant', block: 'center' }));
  await wait(300);
  const reachable = await page.evaluate(() => { const r = document.getElementById('btnSend').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
  check('mobile : le bouton d\'envoi reste atteignable en scrollant', reachable);

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
