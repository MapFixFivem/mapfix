/* MapFix · security.js — Validation des entrées et assainissement.
   Rappel : tout ce qui s'exécute dans le navigateur peut être contourné par quelqu'un qui ouvre la console.
   Le site n'a plus de compte ni de base partagée à protéger ; ce qui reste ici défend contre deux choses :
   des fichiers déposés par un inconnu (zip piégé, noms de dossiers hostiles) et un récapitulatif importé
   qui pourrait avoir été trafiqué avant d'être réouvert. */
'use strict';

/* ---------- dictionnaires sans prototype ---------- */
// Une clé venant d'un fichier déposé (nom de dossier « __proto__ », « constructor »…) ne doit jamais toucher Object.prototype.
const safeDict = () => Object.create(null);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ---------- texte ---------- */
// retire les caractères de contrôle et de renversement du sens de lecture (le point de code 0x202E fait passer
// « exe.ydr » pour autre chose). Construit à partir des points de code (jamais écrits en toutes lettres ici) pour
// être certain qu'aucun caractère invisible réel ne se glisse dans ce fichier source.
const BIDI_POINTS = [0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];
const CTRL_RE = new RegExp('[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f' + BIDI_POINTS.map(c => String.fromCodePoint(c)).join('') + ']', 'g');
function cleanText(v, max = LIMITS.nameLength, multiline = false) {
  let s = typeof v === 'string' ? v : (typeof v === 'number' || typeof v === 'boolean') ? String(v) : '';   // jamais String(objet) : un toString piégé lèverait une exception
  s = s.replace(CTRL_RE, '');
  if (!multiline) s = s.replace(/[\t\r\n]+/g, ' ');
  return s.slice(0, max);
}

const num = (v, min, max, def = 0) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;   // jamais +objet (valueOf piégé)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/* ---------- chemins de fichiers (anti « zip-slip ») ---------- */
// Normalise un chemin venant d'une archive ou d'un dossier : jamais de « .. », de chemin absolu, de lecteur, de caractère interdit.
function sanitizePath(raw) {
  const parts = [];
  for (let seg of cleanText(raw, LIMITS.pathLength * 2).normalize('NFC').replace(/\\/g, '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { parts.pop(); continue; }                   // ne remonte jamais au-dessus de la racine
    seg = seg.replace(/[<>:"|?*]/g, '_').replace(/[. ]+$/, '');   // caractères interdits sous Windows, points et espaces finaux
    if (seg === '') continue;
    parts.push(seg);
  }
  const out = parts.join('/');
  return out.length > LIMITS.pathLength ? '' : out;
}

const extOf = p => { const b = String(p).split('/').pop(), i = b.lastIndexOf('.'); return i >= 0 ? b.slice(i + 1).toLowerCase() : ''; };
const isBlockedFile = p => BLOCKED_EXT.includes(extOf(p));

/* ---------- validation des formulaires ---------- */
function validPseudo(v) {
  const s = cleanText(v, LIMITS.pseudo[1] + 10).trim().replace(/\s+/g, ' ');
  return s.length >= LIMITS.pseudo[0] && s.length <= LIMITS.pseudo[1] && /^[\p{L}\p{N}._#\- ]+$/u.test(s) ? s : '';
}

function validDeadline(v) {
  if (!v) return '';   // champ optionnel : vide = pas de préférence
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return '';
  const d = new Date(v + 'T00:00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
  const max = today.getTime() + LIMITS.maxDeadlineDays * 864e5;
  return !isNaN(d) && d.getTime() >= today.getTime() && d.getTime() <= max ? v : '';
}

/* ---------- motifs (« glob ») sans RegExp ---------- */
// Les motifs d'ignore (dans DEFAULTS.ignore) et surtout `escrow_ignore` (écrit par le CLIENT dans son manifest) ne sont
// jamais compilés en RegExp : un motif malveillant pourrait bloquer le navigateur (ReDoS). Comparaison itérative, bornée
// et avec budget de calcul.
let matchBudget = LIMITS.matchBudget;
const resetMatchBudget = () => { matchBudget = LIMITS.matchBudget; };

function compileGlob(pat) {
  const p = cleanText(pat, LIMITS.patternLength).toLowerCase().replace(/\*{2,}/g, '**');
  const tokens = []; let stars = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] === '*') { if (p[i + 1] === '*') { tokens.push('**'); i++; } else tokens.push('*'); stars++; }
    else tokens.push(p[i]);
  }
  if (!tokens.length || stars > LIMITS.wildcards) return null;
  const first = tokens.findIndex(t => t === '*' || t === '**');
  return { tokens, literal: first === -1 ? p : null, prefix: (first === -1 ? tokens : tokens.slice(0, first)).join('') };
}

const compileGlobs = list => (Array.isArray(list) ? list : []).slice(0, LIMITS.patterns).map(compileGlob).filter(Boolean);

function globMatch(g, str) {
  const s = String(str).toLowerCase();
  if (g.literal !== null) return s === g.literal;
  if (!s.startsWith(g.prefix)) return false;
  matchBudget -= g.tokens.length * (s.length + 1);
  if (matchBudget < 0) return false;                       // budget épuisé : on considère « pas de correspondance »
  let prev = new Uint8Array(s.length + 1); prev[0] = 1;
  for (const tk of g.tokens) {
    const cur = new Uint8Array(s.length + 1);
    if (tk === '*' || tk === '**') {
      cur[0] = prev[0];
      for (let j = 1; j <= s.length; j++) cur[j] = prev[j] | (cur[j - 1] & (tk === '**' || s[j - 1] !== '/' ? 1 : 0));
    } else for (let j = 1; j <= s.length; j++) cur[j] = prev[j - 1] & (s[j - 1] === tk ? 1 : 0);
    prev = cur;
  }
  return !!prev[s.length];
}
