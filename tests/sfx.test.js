// Bruitages : ils se déclenchent (analyse, case cochée), le bouton « son » les coupe pour de bon, et le choix est mémorisé.
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
  await page.evaluate(() => { window.__osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
  const osc = () => page.evaluate(() => window.__osc);

  await page.click('#btnDemo'); await wait(1200);
  const a = await osc();
  check('son à l\'arrivée de l\'analyse', a > 0, `${a} notes`);
  await page.evaluate(() => document.querySelector('.conf .tick').click()); await wait(300);
  check('son en cochant/décochant un conflit', (await osc()) > a);

  await page.click('#sndBtn'); await wait(100);
  check('bouton son : passe en « coupé » et le mémorise', await page.evaluate(() => document.getElementById('sndBtn').classList.contains('off') && localStorage.getItem('mf_sound') === 'false'));
  const before = await osc();
  await page.evaluate(() => document.querySelector('.conf .tick').click());
  await page.click('.lang [data-lang="en"]'); await wait(300);
  check('aucun son une fois coupé', (await osc()) === before);

  await page.reload({ waitUntil: 'networkidle2' });
  check('« coupé » retrouvé après rechargement', await page.evaluate(() => document.getElementById('sndBtn').classList.contains('off')));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
