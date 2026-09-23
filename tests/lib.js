// Outils communs aux tests : chemins portables, navigateur.
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

const SITE = path.resolve(__dirname, '..');
const URL = pathToFileURL(path.join(SITE, 'index.html')).href;
const OUT = path.join(__dirname, 'out');                    // captures d'écran (ignoré par git)

// Chemin du navigateur : variable EDGE_PATH, sinon Edge/Chrome aux emplacements habituels
const CANDIDATES = [process.env.EDGE_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const EDGE = CANDIDATES.find(p => p && fs.existsSync(p));
if (!EDGE) console.warn('⚠ Aucun navigateur trouvé : définis EDGE_PATH (chemin de msedge / chrome).');

const wait = ms => new Promise(r => setTimeout(r, ms));

// Lance le navigateur en mode headless via un port de débogage (les versions récentes d'Edge refusent le mode « pipe »
// utilisé par défaut par puppeteer) puis s'y connecte. Retourne un objet browser puppeteer ; browser.close() arrête tout.
let portSeed = 9400 + Math.floor(Math.random() * 400);
async function launch(puppeteer) {
  const port = portSeed++;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-edge-'));
  const child = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
    `--user-data-dir=${userDataDir}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
  let browser = null, lastErr;
  for (let i = 0; i < 60 && !browser; i++) {
    await wait(250);
    try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null }); } catch (e) { lastErr = e; }
  }
  if (!browser) { child.kill(); throw lastErr || new Error('navigateur injoignable'); }
  const close = browser.close.bind(browser);
  browser.close = async () => { try { await close(); } catch {} try { child.kill(); } catch {} try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {} };
  return browser;
}

module.exports = { SITE, URL, OUT, EDGE, wait, launch };
