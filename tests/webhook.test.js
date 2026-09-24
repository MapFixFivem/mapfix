// Webhook Discord (Components V2) : rien par défaut (CONFIG.webhookUrl vide), et quand il est configuré, une
// notification part au début de l'analyse et une autre au téléchargement du récapitulatif, bien formées et sans
// mentions actives (protection anti-ping même si le pseudo/message contient "@everyone").
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

  // espionne fetch avant toute interaction (le webhook reste désactivé : CONFIG.webhookUrl est vide par défaut)
  await page.evaluate(() => { window.__calls = []; window.fetch = (u, o) => { window.__calls.push({ u, o }); return Promise.resolve({ ok: true }); }; });
  await page.evaluate(() => document.getElementById('btnDemo').click());
  await wait(1000);
  check('sans CONFIG.webhookUrl : aucun appel réseau à l\'analyse', (await page.evaluate(() => window.__calls.length)) === 0);
  await page.click('#btnSend'); // pseudo vide -> échoue avant tout envoi, mais vérifie qu'aucun appel n'a été tenté
  await wait(200);
  check('sans CONFIG.webhookUrl : toujours aucun appel réseau', (await page.evaluate(() => window.__calls.length)) === 0);

  // configure un faux webhook et une nouvelle analyse (avec un pseudo/message piégés : tentative de ping)
  await page.evaluate(() => { CONFIG.webhookUrl = 'https://discord.com/api/webhooks/1/faux-token'; });
  await page.evaluate(() => document.getElementById('btnDemo').click());
  await wait(1000);
  let calls = await page.evaluate(() => window.__calls.map(c => ({ url: c.u, body: JSON.parse(c.o.body) })));
  check('l\'analyse déclenche un appel vers le webhook Discord', calls.length === 1, JSON.stringify(calls.map(c => c.url)));
  check('URL exacte = CONFIG.webhookUrl', calls[0]?.url === 'https://discord.com/api/webhooks/1/faux-token');
  const start = calls[0]?.body;
  check('flag Components V2 (32768) posé', start?.flags === (1 << 15));
  check('mentions désactivées (allowed_mentions.parse = [])', Array.isArray(start?.allowed_mentions?.parse) && start.allowed_mentions.parse.length === 0);
  check('un composant Container (type 17) à la racine', Array.isArray(start?.components) && start.components[0]?.type === 17);
  const flat = JSON.stringify(start);
  check('contient bien le nombre de ressources et de fichiers de la démo', /Ressources.*\*\*.*4/.test(flat.replace(/\\/g, '')) || /"content":"[^"]*4/.test(flat));
  check('pas de doublon si on relance la même analyse à l\'identique', await page.evaluate(async () => { window.__calls.length = 0; document.getElementById('btnDemo').click(); await new Promise(r => setTimeout(r, 600)); return window.__calls.length === 0; }));

  // pseudo + message contenant une tentative de mention : ne doit jamais planter, et allowed_mentions doit rester vide
  await page.evaluate(() => { window.__calls.length = 0; });
  await page.type('#discord', 'lenzo');
  await page.type('#msg', '@everyone ping <@123456> et <@&999>');
  await page.click('#btnSend'); await wait(300);
  calls = await page.evaluate(() => window.__calls.map(c => JSON.parse(c.o.body)));
  const finalCall = calls[calls.length - 1];
  check('le téléchargement du récapitulatif envoie aussi une notification', calls.length >= 1);
  check('mentions toujours désactivées sur la notification finale', finalCall?.allowed_mentions?.parse?.length === 0);
  check('le pseudo piégé est bien présent tel quel dans le texte (les mentions sont neutralisées par Discord, pas retirées)', JSON.stringify(finalCall).includes('everyone'));
  check('un total en euros figure dans la notification finale', /€/.test(JSON.stringify(finalCall)));

  /* ---- réglage discret par l'admin : triple-clic sur le logo (jamais dans le dépôt) ---- */
  await page.evaluate(() => { CONFIG.webhookUrl = ''; localStorage.removeItem('mf_webhook_url'); window.__calls.length = 0; });

  await page.evaluate(() => { window.prompt = () => 'pas une url discord'; });
  await page.click('.logo'); await wait(80); await page.click('.logo'); await wait(80); await page.click('.logo');
  await wait(150);
  check('triple-clic : une adresse invalide est refusée (rien enregistré)', await page.evaluate(() => localStorage.getItem('mf_webhook_url') === null));

  const real = 'https://discord.com/api/webhooks/999/depuis-le-navigateur';
  await page.evaluate(u => { window.prompt = () => u; }, real);
  await page.click('.logo'); await wait(80); await page.click('.logo'); await wait(80); await page.click('.logo');
  await wait(150);
  // stocké via save() comme le reste du site : la valeur est en JSON dans localStorage, on compare donc à JSON.stringify(real)
  check('triple-clic : l\'URL saisie est stockée en local, jamais dans CONFIG', await page.evaluate(u => localStorage.getItem('mf_webhook_url') === JSON.stringify(u), real) && await page.evaluate(() => !CONFIG.webhookUrl));

  // start() a un anti-doublon par contenu analysé : on revérifie donc via l'envoi du récapitulatif (final(), sans
  // dédoublonnage), et on exige au moins un appel pour ne jamais valider un tableau vide par accident.
  await page.evaluate(() => { window.__calls.length = 0; document.getElementById('btnSend').click(); });
  await wait(300);
  let sent = await page.evaluate(() => window.__calls.map(c => c.u));
  check('la valeur réglée dans le navigateur est bien utilisée pour l\'envoi', sent.length > 0 && sent.every(u => u === real), JSON.stringify(sent));

  await page.evaluate(() => { CONFIG.webhookUrl = 'https://discord.com/api/webhooks/1/config-js'; window.__calls.length = 0; document.getElementById('btnSend').click(); });
  await wait(300);
  sent = await page.evaluate(() => window.__calls.map(c => c.u));
  check('la valeur du navigateur prime toujours sur CONFIG.webhookUrl', sent.length > 0 && sent.every(u => u === real), JSON.stringify(sent));

  await page.evaluate(() => { window.prompt = () => ''; });
  await page.click('.logo'); await wait(80); await page.click('.logo'); await wait(80); await page.click('.logo');
  await wait(150);
  check('triple-clic avec un champ vide efface le réglage local', await page.evaluate(() => JSON.parse(localStorage.getItem('mf_webhook_url')) === ''));

  console.log(ko ? `\n${ko} échec(s)` : '\nTout passe');
  console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : 'Aucune erreur JS/console');
  await browser.close();
  process.exit(ko || errs.length ? 1 : 0);
})();
