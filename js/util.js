/* MapFix · util.js — Utilitaires : sélection DOM, échappement HTML, formats, icônes, toasts. */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Échappement HTML : À UTILISER pour toute donnée venant d'un utilisateur (pseudo, nom de fichier, message…)
const esc = s => (typeof s === 'string' ? s : (typeof s === 'number' || typeof s === 'boolean') ? String(s) : '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));

const eur = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR') + ' €';
const round2 = n => Math.round(n * 100) / 100;

const fmtSize = b => { const u = (typeof LANG !== 'undefined' && LANG === 'en') ? ['GB', 'MB', 'KB', 'B'] : ['Go', 'Mo', 'Ko', 'o'];
  return b > 1e9 ? (b / 1e9).toFixed(2) + ' ' + u[0] : b > 1e6 ? (b / 1e6).toFixed(1) + ' ' + u[1] : b > 1e3 ? (b / 1e3).toFixed(0) + ' ' + u[2] : b + ' ' + u[3]; };

const fmtDate = d => {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t) ? t.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

const now = () => new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

/* petites validations génériques, utilisées pour relire un récapitulatif importé (donnée non fiable) */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v, max = 1000) => (Array.isArray(v) ? v.slice(0, max) : []);
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const badge = (txt, cls, title = '') => `<span class="badge ${cls}" ${title ? `title="${esc(title)}"` : ''}>${txt}</span>`;

const I = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

// nom de fichier sûr pour un téléchargement (pas de séparateur de chemin ni de caractère spécial)
const safeName = s => String(s).replace(/[^\w.+-]+/g, '_').replace(/^\.+/, '').slice(0, 80) || 'fichier';

// rend la main à l'interface (évite de figer la page pendant un long calcul)
const tick = () => new Promise(r => setTimeout(r, 0));

let toastT;

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200);
}
