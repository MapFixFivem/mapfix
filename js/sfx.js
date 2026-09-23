/* MapFix · sfx.js — Petits bruitages d'arcade, synthétisés à la volée avec Web Audio (aucun fichier audio).
   Volume volontairement bas ; le choix « son coupé » est mémorisé. Le navigateur n'autorise le son qu'après un
   premier clic : avant, rien ne se joue. Sans son, le site fonctionne exactement pareil. */
'use strict';

const sfx = (() => {
  const VOLUME = 0.55;                  // volume général (chaque son a en plus son propre niveau, tous discrets)
  let ctx = null, master = null, on = load('mf_sound', true) !== false, lastPlay = {};

  const audio = () => {
    if (ctx) return ctx;
    const AC = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = VOLUME;
    const lim = ctx.createDynamicsCompressor();          // évite tout pic si plusieurs sons se chevauchent
    master.connect(lim); lim.connect(ctx.destination);
    return ctx;
  };

  // une note : fréquence (avec glissando optionnel), durée, forme d'onde, niveau, décalage en secondes
  const tone = (c, f, dur, { type = 'square', vol = .05, to = null, at = 0 } = {}) => {
    const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  };

  const N = { C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, A6: 1760, G4: 392, C4: 261.6 };
  const SOUNDS = {
    hover: c => tone(c, 1500, .03, { type: 'triangle', vol: .012 }),
    click: c => tone(c, 700, .07, { vol: .045, to: 420 }),
    tick: c => { tone(c, 880, .05, { vol: .04 }); tone(c, 1320, .07, { vol: .04, at: .045 }); },
    untick: c => tone(c, 620, .09, { vol: .04, to: 380 }),
    switch: c => { tone(c, 800, .05, { vol: .04 }); tone(c, 1200, .08, { vol: .04, at: .05 }); },
    cash: c => { tone(c, N.E6, .09, { type: 'triangle', vol: .06 }); tone(c, N.A6, .22, { type: 'triangle', vol: .06, at: .08 }); },
    down: c => tone(c, 520, .16, { type: 'triangle', vol: .05, to: 300 }),
    siren: c => [0, .09, .18, .27].forEach((d, i) => tone(c, i % 2 ? 900 : 700, .08, { vol: .03, at: d })),
    start: c => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(c, f, .12, { vol: .045, at: i * .065 })),
    passed: c => {
      [[N.G4, 0, .16], [N.C5, .15, .16], [N.E5, .3, .16], [N.G5, .45, .7]].forEach(([f, at, d]) => {
        tone(c, f, d, { type: 'square', vol: .04, at }); tone(c, f * 2, d, { type: 'triangle', vol: .03, at });
      });
    },
  };

  const canPlay = () => on && (typeof navigator === 'undefined' || !navigator.userActivation || navigator.userActivation.hasBeenActive);

  function play(name, delay = 0) {
    if (!canPlay() || !SOUNDS[name]) return;
    const now = performance.now();
    if (now - (lastPlay[name] || 0) < (name === 'hover' ? 70 : 35)) return;   // pas de mitraillette
    lastPlay[name] = now;
    const c = audio(); if (!c) return;
    const go = () => SOUNDS[name](c);
    if (c.state === 'suspended') c.resume().then(go).catch(() => {}); else go();
  }
  const recent = (name, ms = 900) => performance.now() - (lastPlay[name] || -1e9) < ms;

  function sync() {
    const b = $('#sndBtn'); if (!b) return;
    b.setAttribute('aria-pressed', String(on));
    b.title = b.ariaLabel = t(on ? 'snd.on' : 'snd.off');
    b.classList.toggle('off', !on);
  }
  function toggle() { on = !on; save('mf_sound', on); sync(); play('click'); }

  return { play, recent, sync, toggle, get on() { return on; } };
})();

/* ---------- branchement : un seul jeu d'écouteurs sur le document, aucun changement dans les autres fichiers ---------- */
{
  const PRESS = '.btn:not(:disabled), .link, .gbtn, .res, .chip, .feats-mini>span';   // (le sélecteur de langue a son propre son)
  let hovered = null;
  addEventListener('pointerdown', e => { if (e.target.closest?.(PRESS) && !e.target.closest('#sndBtn')) sfx.play('click'); }, true);
  addEventListener('pointerover', e => {
    const el = e.target.closest?.('.btn:not(:disabled), .gbtn, .lang button, .res, .chip, .feats-mini>span');
    if (el && el !== hovered && e.pointerType !== 'touch') sfx.play('hover');
    hovered = el || null;
  }, { passive: true });
  // cases des conflits : le clic sur la ligne ou sur la case donne le même bruit selon l'état obtenu
  addEventListener('click', e => {
    const row = e.target.closest?.('.conf');
    if (!row || e.target.closest('select, .keep')) return;
    const checked = e.target.matches('input.tick') ? e.target.checked : !row.classList.contains('off');
    sfx.play(checked ? 'tick' : 'untick');
  });
  addEventListener('change', e => { if (e.target.id === 'express') sfx.play(e.target.checked ? 'tick' : 'untick'); });
  $('#sndBtn')?.addEventListener('click', () => sfx.toggle());
}
