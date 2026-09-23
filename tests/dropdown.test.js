// Menu « Ressource conservée » : ouverture, choix à la souris et au clavier, valeur réellement enregistrée, fermeture.
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
  await page.click('#btnDemo'); await wait(1200);

  check('plus d\'étiquettes « Critique / Moyen / Identique / Version différente »', await page.evaluate(() => !/CRITIQUE|MOYEN|IDENTIQUE|VERSION DIFF/i.test(document.getElementById('confList').innerText)));
  check('l\'étiquette « Non vérifiable » (fxap) est conservée', await page.evaluate(() => /NON VÉRIFIABLE/i.test(document.getElementById('confList').innerText)));

  await page.click('.conf .dd-btn'); await wait(300);
  check('le menu s\'ouvre', !!(await page.$('.dd-menu')));
  const n = await page.$$eval('.dd-menu .dd-opt', o => o.length);
  check('le menu propose Auto + les ressources du conflit', n === 3, `${n} choix`);
  check('le menu n\'est pas coupé par l\'écran', await page.evaluate(() => { const r = document.querySelector('.dd-menu').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }));

  await page.click('.dd-menu .dd-opt:nth-child(2)'); await wait(300);
  const kept = await page.evaluate(() => ({ keep: S.conflicts[0].keep, label: document.querySelector('.conf .dd-btn span').textContent, open: !!document.querySelector('.dd-menu') }));
  check('le choix est enregistré dans le conflit', kept.keep && kept.keep === kept.label, JSON.stringify(kept));
  check('le menu se ferme après le choix', !kept.open);

  // clavier : flèche bas ouvre, Entrée choisit « Auto », Échap ferme
  await page.focus('.conf .dd-btn'); await page.keyboard.press('ArrowDown'); await wait(200);
  check('flèche bas ouvre le menu', !!(await page.$('.dd-menu')));
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await wait(300);
  check('clavier : « Auto » rechoisi', await page.evaluate(() => S.conflicts[0].keep === ''));
  await page.click('.conf .dd-btn'); await wait(200); await page.keyboard.press('Escape'); await wait(200);
  check('Échap ferme le menu', !(await page.$('.dd-menu')));
  await page.click('.conf .dd-btn'); await wait(200); await page.mouse.click(700, 60); await wait(200);
  check('un clic à côté ferme le menu', !(await page.$('.dd-menu')));
  check('ouvrir le menu ne coche/décoche pas la ligne', await page.evaluate(() => S.conflicts[0].checked === true));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
