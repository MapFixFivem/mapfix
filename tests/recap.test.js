// Le cœur du site : le devis ne part pas vers un serveur, il devient un fichier .html qu'on s'envoie soi-même.
// Ce test vérifie le vrai geste, dans un vrai navigateur : télécharger, rouvrir ailleurs, modifier, retélécharger —
// et que le fichier généré s'ouvre correctement tout seul (c'est ce que la personne sur Discord recevra).
const puppeteer = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const { URL, EDGE, OUT, wait, launch } = require('./lib');
const dir = path.join(OUT, 'downloads'); fs.mkdirSync(dir, { recursive: true });
fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { cond ? ok++ : ko++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  → ' + extra : '')); };

(async () => {
  const browser = await launch(puppeteer);
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
  await page.setViewport({ width: 1440, height: 900 });
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: dir });

  // ---- 1. le client : analyse, coche, télécharge son récapitulatif
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  await page.evaluate(() => document.getElementById('btnDemo').click()); await wait(700);
  await page.evaluate(() => { document.querySelector('#discord').value = 'lenzo#0001'; document.querySelector('#msg').value = 'Serveur RP, urgent stp'; });
  const total1 = await page.evaluate(() => document.querySelector('#total').textContent);
  await page.click('#btnSend'); await wait(1000);
  const hint1 = await page.evaluate(() => document.querySelector('#sendHint').textContent);
  check('téléchargement confirmé à l\'écran', /Téléchargé/.test(hint1), hint1);
  const file1 = fs.readdirSync(dir).find(f => f.endsWith('.html'));
  check('un fichier .html a bien été écrit sur le disque', !!file1, JSON.stringify(fs.readdirSync(dir)));

  // ---- 2. ce fichier s'ouvre tout seul, correctement, sans le site (c'est ce que reçoit la personne sur Discord)
  const page2 = await browser.newPage();
  const errs2 = []; page2.on('pageerror', e => errs2.push(e.message));
  await page2.goto('file:///' + path.join(dir, file1).replace(/\\/g, '/').replace(/ /g, '%20'));
  const standalone = await page2.evaluate(() => ({
    total: document.querySelector('.tot b')?.textContent, name: document.querySelector('h1')?.textContent,
    hasData: !!document.getElementById('mf-data'), text: document.body.textContent,
  }));
  check('le fichier ouvert seul affiche le bon total', standalone.total?.trim() === total1.trim(), `${standalone.total} vs ${total1}`);
  check('le fichier ouvert seul montre le pseudo et le message du client', standalone.text.includes('lenzo#0001') && standalone.text.includes('urgent stp'));
  check('aucune erreur JS en ouvrant le fichier seul (pas de <script src>, autonome)', errs2.length === 0, errs2.join(' | '));
  await page2.close();

  // ---- 3. réouverture sur le site pour modifier (remise) puis réexport
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  const input = await page.$('#inRecap');
  await input.uploadFile(path.join(dir, file1));
  await wait(600);
  const state = await page.evaluate(() => ({
    working: document.getElementById('devis').classList.contains('working'),
    editVisible: !document.getElementById('editBar').hidden,
    discord: document.getElementById('discord').value, msg: document.getElementById('msg').value,
    checked: document.querySelectorAll('#confList .tick:checked').length, total: document.getElementById('total').textContent,
  }));
  check('réouverture : passe en mode édition avec les mêmes champs', state.working && state.editVisible && state.discord === 'lenzo#0001' && state.msg === 'Serveur RP, urgent stp');
  check('réouverture : même sélection de conflits, même total', state.total.trim() === total1.trim());

  await page.evaluate(() => { document.getElementById('discPct').value = '10'; document.getElementById('discPct').dispatchEvent(new Event('input')); });
  await wait(150);
  const total2 = await page.evaluate(() => document.getElementById('total').textContent);
  check('remise de 10 % reflétée dans le total affiché', total2 !== total1, `${total1} -> ${total2}`);

  await page.click('#btnSend'); await wait(1000);
  // même nom de fichier possible (même jour, même pseudo) : Edge écrase alors le fichier au lieu de le renommer
  // en téléchargement piloté par CDP — on vérifie donc le contenu réécrit, pas un nouveau nom.
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'pas-un-recap.html');
  const rewritten = files.some(f => fs.readFileSync(path.join(dir, f), 'utf8').includes('"discountPct":10'));
  check('récapitulatif mis à jour retéléchargé (remise de 10 % dans le fichier)', rewritten, JSON.stringify(files));
  const btnLabel = await page.evaluate(() => document.getElementById('btnSend').textContent);
  check('le bouton précise qu\'il s\'agit d\'une mise à jour', /mis à jour/.test(btnLabel), btnLabel);

  // ---- 4. un fichier qui n'est pas un récapitulatif MapFix : message clair, pas de plantage
  const junkPath = path.join(dir, 'pas-un-recap.html');
  fs.writeFileSync(junkPath, '<!doctype html><html><body>bonjour</body></html>');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });
  const input2 = await page.$('#inRecap');
  await input2.uploadFile(junkPath);
  await wait(400);
  const afterJunk = await page.evaluate(() => document.getElementById('devis').classList.contains('working'));
  check('fichier .html quelconque déposé : ignoré proprement, pas de plantage, pas de fausse analyse', !afterJunk);

  check('aucune erreur JS pendant tout le parcours', errs.length === 0, errs.join(' | '));
  console.log('\nRÉSULTAT RÉCAPITULATIF :', ok, 'OK,', ko, 'échec(s)');
  await browser.close();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('CRASH du test', e); process.exit(2); });
