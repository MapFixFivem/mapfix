// Captures d'écran du parcours réel : accueil, analyse, récapitulatif téléchargé, réouverture pour modifier, mobile.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { URL, EDGE, OUT, launch } = require('./lib');
const dir = OUT + '/';
fs.mkdirSync(dir, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
  await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'networkidle2' });
  const shot = async (name, full = true) => { await wait(350); await page.screenshot({ path: dir + name + '.png', fullPage: full }); console.log('shot', name); };

  await shot('1-home');
  await page.click('#btnDemo'); await wait(700);
  await shot('2-analysis');

  // devis : décoche deco_plant, prépare l'export
  await page.evaluate(() => {
    document.querySelector('#discord').value = 'lenzo#0001';
    const row = [...document.querySelectorAll('#confList .conf')].find(r => r.querySelector('b').textContent === 'deco_plant.ydr');
    row.querySelector('.tick').click();
  });
  await shot('3-quote', false);

  // export réel + réouverture pour modifier
  const dl = dir + 'downloads/'; fs.mkdirSync(dl, { recursive: true });
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await page.click('#btnSend'); await wait(900);
  const file = fs.readdirSync(dl).find(f => f.endsWith('.html'));

  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  if (file) { const input = await page.$('#inRecap'); await input.uploadFile(dl + file); await wait(600); }
  await shot('4-recap-edit', false);

  // mobile
  await page.evaluate(() => localStorage.clear());
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.reload({ waitUntil: 'networkidle2' });
  await shot('5-mobile');

  console.log(errs.length ? '\nERREURS:\n' + errs.join('\n') : '\nAucune erreur JS/console');
  await browser.close();
})();
