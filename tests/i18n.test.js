// Bascule FR / EN : le français est la langue par défaut, l'anglais traduit les textes fixes ET dynamiques,
// le choix est mémorisé, et l'express est bien à +15 %.
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

  const txt = sel => page.$eval(sel, e => e.textContent.trim());
  check('FR par défaut', (await txt('.hero h1')).includes('On les fixe') && await page.evaluate(() => document.documentElement.lang) === 'fr');

  await page.click('.lang [data-lang="en"]'); await wait(150);
  check('EN : titre traduit', (await txt('.hero h1')).includes('We fix them'));
  check('EN : bouton exemple traduit', (await txt('#btnDemo')) === 'Example');
  check('EN : <html lang="en">', await page.evaluate(() => document.documentElement.lang) === 'en');
  check('EN : mémorisé', await page.evaluate(() => localStorage.getItem('mf_lang')) === '"en"' || await page.evaluate(() => /en/.test(localStorage.getItem('mf_lang'))));

  await page.evaluate(() => document.getElementById('btnDemo').click()); await wait(800);
  check('EN : stats dynamiques', (await txt('#stats')).includes('Resources'));
  check('express = +15 %', (await txt('#expressLbl')) === '(+15%)');
  await page.click('.lang [data-lang="fr"]'); await wait(150);
  check('retour FR : stats redessinées', (await txt('#stats')).includes('Ressources'));
  check('retour FR : bouton d\'envoi', (await txt('#btnSend')).includes('Télécharger'));

  // le total express = sous-total × 1,15
  const totals = await page.evaluate(() => { const q = quote(); return { sub: q.sub, extra: q.extra }; });
  await page.evaluate(() => document.getElementById('express').click()); await wait(100);
  const after = await page.evaluate(() => { const q = quote(); return { sub: q.sub, extra: q.extra }; });
  check('express = 15 % du sous-total', Math.abs(after.extra - after.sub * 0.15) < 0.01, JSON.stringify(after));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
