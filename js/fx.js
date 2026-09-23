/* MapFix · fx.js — Effets d'ambiance (tout est décoratif : sans ces effets, le site fonctionne pareil).
   Étoiles de recherche = 1 par conflit facturé, argent du HUD, « +10 € » qui s'envole, compteurs, parallaxe, « Mission réussie ». */
'use strict';

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const retrigger = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// le décor suit doucement la souris (soleil et skyline dans des sens opposés)
if (!calm()) {
  let raf = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => {
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; document.body.style.setProperty('--mx', mx.toFixed(3)); document.body.style.setProperty('--my', my.toFixed(3)); });
  }, { passive: true });
}

// les chiffres des statistiques montent de 0 à leur valeur
function countUp(els, ms = 650) {
  if (calm() || typeof requestAnimationFrame !== 'function') return;
  els.forEach(el => {
    const to = Number(el.textContent);
    if (!Number.isFinite(to) || to <= 0) return;
    const t0 = performance.now();
    el.textContent = '0';
    const step = now => {
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = k < 1 ? Math.round(to * (1 - Math.pow(1 - k, 3))) : to;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// HUD : étoiles (1 par conflit facturé, 5 max) et argent ; les étoiles clignotent rouge/bleu quand le niveau change
let lastStars = 0, lastTotal = 0;
function updateHud(q) {
  const n = Math.min(5, q.groups.length), w = $('#wanted'), cash = $('#cash');
  $$('#wanted i').forEach((s, i) => s.classList.toggle('on', i < n));
  const fresh = sfx.recent('start');   // juste après une analyse : le jingle d'arrivée suffit
  if (n !== lastStars && n > 0) { retrigger(w, 'hot'); setTimeout(() => w.classList.remove('hot'), 1800); if (n > lastStars && !fresh) sfx.play('siren'); }
  lastStars = n;
  cash.textContent = eur(q.total);
  const diff = round2(q.total - lastTotal);
  if (diff) {
    retrigger(cash, 'bump');
    const d = $('#delta');
    d.textContent = (diff > 0 ? '+' : '-') + eur(Math.abs(diff));
    d.classList.toggle('neg', diff < 0);
    retrigger(d, 'pop');
    if (!fresh) sfx.play(diff > 0 ? 'cash' : 'down');
  }
  lastTotal = q.total;
}

function missionPassed() {
  const p = $('#passed');
  retrigger(p, 'show');
  sfx.play('passed');
  setTimeout(() => p.classList.remove('show'), 3300);
}

// ondulation au point de clic sur les boutons (retour tactile, façon borne d'arcade)
if (!calm()) addEventListener('pointerdown', e => {
  const b = e.target.closest?.('.btn:not(:disabled)');
  if (!b) return;
  const r = b.getBoundingClientRect(), d = document.createElement('i');
  d.className = 'rip'; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px';
  b.appendChild(d); setTimeout(() => d.remove(), 700);
});
