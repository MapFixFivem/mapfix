/* MapFix · main.js — Branchement des événements de la page Devis (chargé en dernier).
   Une seule page : pas de routeur, pas de compte, pas de stockage partagé. */
'use strict';

// Anti-clickjacking : la page ne s'affiche pas si elle est encadrée dans un autre site
// (la vraie protection est l'en-tête HTTP frame-ancestors, impossible à poser sur GitHub Pages).
if (window.top !== window.self) { document.documentElement.textContent = ''; throw new Error('Affichage dans un cadre refusé.'); }

// Une erreur inattendue ne doit ni figer l'écran ni afficher de détails techniques
addEventListener('error', () => toast(t('m.err')));
addEventListener('unhandledrejection', () => toast(t('m.err')));

/* ---------- dépôt des fichiers ---------- */
$('#inZip').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) handleEntries(() => entriesFromZip(f)); };
$('#inDir').onchange = e => { const files = [...e.target.files]; e.target.value = ''; if (files.length) handleEntries(() => entriesFromFolder(files)); };
$('#inRecap').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) importRecapFile(f); };
$('#btnDemo').onclick = () => handleEntries(demoEntries);

const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (/\.html?$/i.test(f.name)) importRecapFile(f);
  else if (/\.zip$/i.test(f.name)) handleEntries(() => entriesFromZip(f));
  else toast(t('m.dropBad'));
});

/* ---------- analyse : conflits, ressources, devis ---------- */
// « Tout cocher / décocher » s'applique à ce qui est affiché (donc au filtre et à la ressource ciblée en cours)
$('#allOn').onclick = () => { visibleConflicts().forEach(c => c.checked = true); renderConflicts(); };
$('#allOff').onclick = () => { visibleConflicts().forEach(c => c.checked = false); renderConflicts(); };

// filtres par type de fichier
$('#filterBar').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  const k = b.dataset.f, f = (S.filters ??= []);
  if (!k) S.filters = [];
  else S.filters = f.includes(k) ? f.filter(x => x !== k) : [...f, k];
  S.limit = CONF_PAGE;
  renderConflicts();
});
$('#express').onchange = renderQuote;
$('#btnSend').onclick = exportRecap;
$('#discPct').oninput = renderQuote;
$('#discAmt').oninput = renderQuote;

// liste des conflits : délégation (une seule fois, pas de re-render au clic → cases fiables)
$('#confList').addEventListener('change', e => {
  const row = e.target.closest('.conf'); if (!row) return;
  const c = S.conflicts[+row.dataset.id]; if (!c) return;
  if (e.target.matches('.tick')) setChecked(c, e.target.checked, row);
  else if (e.target.matches('[data-keep]')) c.keep = c.res.includes(e.target.value) ? e.target.value : '';
});

$('#confList').addEventListener('click', e => {
  if (e.target.closest('#moreConf')) { S.limit += CONF_PAGE; return renderConflicts(); }
  const row = e.target.closest('.conf');
  if (!row || e.target.closest('select, input, .keep')) return;
  const c = S.conflicts[+row.dataset.id]; if (!c) return;
  setChecked(c, !c.checked, row);
});

// ciblage d'une ressource
$('#resList').addEventListener('click', e => {
  const el = e.target.closest('.res'); if (!el) return;
  S.focus = S.focus === el.dataset.res ? null : el.dataset.res;
  renderResources(); renderConflicts();
});

$('#focusBar').addEventListener('click', e => {
  if (e.target.id === 'clearFocus') { S.focus = null; renderResources(); renderConflicts(); }
  if (e.target.id === 'onlyFocus') {
    S.conflicts.forEach(c => c.checked = c.res.includes(S.focus));
    renderConflicts(); toast(t('m.focus', { n: S.focus }));
  }
});

/* ---------- langue FR / EN ---------- */
// Les textes fixes sont retraduits par applyLang() ; ceux que le JS construit (stats, conflits, devis) sont redessinés.
$$('.lang [data-lang]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.lang === LANG) return;
  setLang(b.dataset.lang);
  sfx.play('switch');
  if (S) {
    renderAnalysis();
    if (S.imported) $('#btnSend').textContent = t('send.edit');
  }
  $('#sendHint').textContent = ''; $('#sendHint').className = 'hint';
}));

/* ---------- démarrage ---------- */
applyLang();
{
  const a = $('#discordLink');
  if (/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(CONFIG.discordInvite)) a.href = CONFIG.discordInvite;
  else a.addEventListener('click', e => { e.preventDefault(); toast(t('m.discord')); });
}
if (!CONFIG.showDemo) $('#btnDemo').hidden = true;
$('#heroPrice').textContent = eur(DEFAULTS.conflictBase);
