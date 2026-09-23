/* MapFix · quote.js — Devis : résultat de l'analyse, choix des conflits, prix.
   Facturation : un CONFLIT = un même fichier présent dans plusieurs ressources.
     2 ressources sur ce fichier = 10 €, 3 = 15 €, 4 = 20 € (base + extra × (n-2)).
     Ressources 1+2 en conflit = 10 € ; puis 3+4+5 sur le même ymap = 15 € ; avec la 6 = 20 €.
   billBy 'set'  : les fichiers partagés par EXACTEMENT les mêmes ressources ne comptent qu'un seul conflit.
   billBy 'file' : chaque fichier partagé est facturé. */
'use strict';

let S = null;   // état de la page : soit une analyse fraîche, soit un récapitulatif rouvert (S.imported = true)

const CONF_PAGE = 150;   // nombre de conflits affichés d'un coup (les listes très longues restent fluides)

const groupPrice = (n, locked, st) => st.conflictBase + st.extraResource * Math.max(0, n - 2) + st.lockedExtra * locked;

// Regroupe les conflits cochés en lignes de facturation. « locked » est ici un simple oui/non (au moins une ressource
// cryptée dans le groupe) : plus fin que ça n'aurait d'intérêt que si lockedExtra est activé (il vaut 0 par défaut).
function billingGroups(sel, st) {
  const lines = new Map();
  for (const c of sel) {
    const res = [...new Set(c.res)].sort();
    const key = st.billBy === 'file' ? 'f:' + c.name : 's:' + res.join('\u0001');
    const l = lines.get(key) ?? { res, files: [], locked: false };
    l.files.push(c.name);
    if (c.locked) l.locked = true;
    lines.set(key, l);
  }
  return [...lines.values()].map(l => ({ res: l.res, files: l.files, locked: l.locked ? 1 : 0, price: groupPrice(l.res.length, l.locked ? 1 : 0, st) }));
}

// Point d'entrée commun (zip, dossier, exemple). Toute erreur de lecture est expliquée à l'utilisateur, jamais silencieuse.
async function handleEntries(getEntries) {
  try {
    toast(t('m.reading'));
    const entries = typeof getEntries === 'function' ? await getEntries() : getEntries;
    if (!entries.length) return toast(t('m.nofile'));
    S = await analyze(entries, (done, total) => toast(t('m.progress', { a: done, b: total })));
  } catch (e) {
    return toast(e instanceof IngestError ? e.message : t('m.fail'));
  }
  S.limit = CONF_PAGE;
  enterWorking();
  if (!$('#discord').value) $('#discord').value = validPseudo(load('mf_discord', ''));
  renderAnalysis();
  const rj = S.rejected;
  if (rj && (rj.blocked.length || rj.badPath || rj.duplicate))
    toast(t('m.skipped', { n: rj.blocked.length + rj.badPath + rj.duplicate }));
}

// Bascule commune à une analyse fraîche et à un récapitulatif rouvert : passe en vue « working » (3 colonnes).
function enterWorking() {
  $('#drop').hidden = true;
  $('#devis').classList.add('working');
  $('#analysis').hidden = false;
  $('#expressLbl').textContent = `(+${DEFAULTS.expressPct}%)`;
  setStep(2);
  sfx.play('start');
  scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(n) {
  $$('.step').forEach(s => {
    const i = +s.dataset.step;
    s.classList.toggle('active', i === n); s.classList.toggle('done', i < n);
  });
}

function renderAnalysis() {
  const { resources, conflicts } = S;
  const enc = resources.filter(r => r.encrypted).length;
  const real = conflicts.filter(c => !c.identical).length;
  const groups = billingGroups(conflicts, DEFAULTS).length;
  $('#stats').innerHTML = `
    <div class="stat" title="${esc(t('st.res.t'))}"><b>${resources.length}</b><span>${t('st.res')}</span></div>
    <div class="stat" title="${esc(t('st.files.t'))}"><b>${S.totalFiles}</b><span>${t('st.files')}</span></div>
    <div class="stat ${conflicts.length ? 'bad' : 'ok'}" title="${esc(t('st.conf.t', { n: real }))}"><b>${conflicts.length}</b><span>${t('st.conf')}</span></div>
    <div class="stat ${groups ? 'bad' : 'ok'}" title="${esc(t('st.groups.t'))}"><b>${groups}</b><span>${t('st.groups')}</span></div>
    <div class="stat ${enc ? 'warn' : 'ok'}" title="${esc(t('st.enc.t'))}"><b>${enc}</b><span>${t('st.enc')}</span></div>
    ${S.ignored ? `<div class="stat" title="${esc(t('st.ign.t'))}"><b>${S.ignored}</b><span>${t('st.ign')}</span></div>` : ''}`;
  if (typeof countUp === 'function') countUp($$('#stats b'));
  renderResources();
  $('#lockInfo').hidden = !conflicts.some(c => c.locked);
  renderConflicts();
}

function renderResources() {
  $('#resList').innerHTML = S.resources.map(r => {
    const known = r.escrow !== undefined;   // faux pour un récapitulatif rouvert : seul un résumé a été conservé
    const detail = known && r.escrow ? `${r.fxap ? t('r.fxap') : t('r.headers')} · ${t('r.locked', { n: r.lockedFiles })} · ${t('r.readable', { n: r.readableFiles })}${r.escrowIgnore.length ? ` (escrow_ignore : ${r.escrowIgnore.length})` : ''}` : '';
    return `
    <div class="res ${S.focus === r.name ? 'focus' : ''}" data-res="${esc(r.name)}" ${detail ? `title="${esc(detail)}"` : ''}><b>${esc(r.name)}</b>
      ${r.encrypted ? badge(I('lock') + t('r.enc'), 'b-warn') : ''}
      <small>${t('r.files', { n: r.files })}${known ? ` · ${t('r.analysed', { n: r.stream })}` : ''} · ${fmtSize(r.size)}</small>
      ${known && r.escrow ? `<small>${t('r.locked', { n: r.lockedFiles })} · ${t('r.readable', { n: r.readableFiles })}</small>` : ''}
    </div>`;
  }).join('');
}

/* ---------- filtres : par type de fichier (ymap, ytyp, ybn…) et par nature déduite du nom (LOD, lumières, occlusion) ----------
   Plusieurs filtres actifs = on montre les conflits qui correspondent à l'un d'eux ; aucun = tout. */
const EXT_ORDER = ['ymap', 'ytyp', 'ybn', 'ydr', 'ytd', 'yft', 'ydd', 'ycd', 'ynv', 'ymt', 'ymf', 'ynd'];
const NAME_TAGS = {   // « lod » est cherché en mot entier pour ne pas attraper « explode »
  lod: n => /(^|[^a-z])s?lod|lod($|[^a-z])/.test(n),
  light: n => n.includes('light'),
  occl: n => n.includes('occl'),
};
const matchesFilter = (c, k) => k.startsWith('ext:') ? c.ext === k.slice(4) : !!NAME_TAGS[k.slice(4)]?.(c.name.toLowerCase());
const focusOnly = () => S.conflicts.filter(c => !S.focus || c.res.includes(S.focus));
const visibleConflicts = () => { const f = S.filters || []; return focusOnly().filter(c => !f.length || f.some(k => matchesFilter(c, k))); };

function renderFilters() {
  const f = (S.filters ??= []), base = focusOnly();
  const exts = [...new Set([...base.map(c => c.ext), ...f.filter(k => k.startsWith('ext:')).map(k => k.slice(4))])]
    .sort((a, b) => (EXT_ORDER.indexOf(a) + 99 * (EXT_ORDER.indexOf(a) < 0)) - (EXT_ORDER.indexOf(b) + 99 * (EXT_ORDER.indexOf(b) < 0)) || a.localeCompare(b));
  const tags = Object.keys(NAME_TAGS).filter(k => f.includes('tag:' + k) || base.some(c => NAME_TAGS[k](c.name.toLowerCase())));
  const chip = (key, label, n, cls = '') => `<button type="button" class="chip ${cls} ${f.includes(key) ? 'on' : ''}" data-f="${key}" aria-pressed="${f.includes(key)}">${esc(label)} <b>${n}</b></button>`;
  const count = k => base.filter(c => matchesFilter(c, k)).length;
  $('#filterBar').innerHTML = base.length < 2 && !f.length ? '' :
    `<button type="button" class="chip ${f.length ? '' : 'on'}" data-f="" aria-pressed="${!f.length}">${t('flt.all')} <b>${base.length}</b></button>` +
    exts.map(x => chip('ext:' + x, '.' + x, count('ext:' + x))).join('') +
    (tags.length ? '<i class="chip-sep"></i>' : '') +
    tags.map(k => chip('tag:' + k, t('flt.' + k), count('tag:' + k), 'tag')).join('');
}

function confHTML(c) {
  return `
    <div class="conf ${c.checked ? '' : 'off'}" data-id="${c.id}">
      <input type="checkbox" class="tick" ${c.checked ? 'checked' : ''} aria-label="${esc(t('c.aria', { name: c.name }))}">
      <div class="conf-main">
        <div class="conf-top"><b>${esc(c.name)}</b>
          ${c.locked ? badge(I('lock') + t('c.unverif'), 'b-warn', t('c.unverif.t')) : ''}
        </div>
        <div class="conf-in">${t('c.in')} ${c.res.map(n => `<code>${esc(n)}</code>`).join(' ')}</div>
        <div class="keep"><span>${t('c.keep')}</span>
          <div class="dd"><select data-keep tabindex="-1" aria-hidden="true"><option value="">${t('c.auto')}</option>
            ${c.res.map(n => `<option value="${esc(n)}" ${c.keep === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
          </select><button type="button" class="dd-btn" aria-haspopup="listbox" aria-expanded="false"><span>${esc(c.res.includes(c.keep) ? c.keep : t('c.auto'))}</span></button></div></div>
        <div class="warnbox" ${c.checked ? 'hidden' : ''}>${I('alert')} ${t('c.warn')}</div>
      </div>
    </div>`;
}

function renderConflicts() {
  renderFilters();
  const list = visibleConflicts(), shown = list.slice(0, S.limit);
  $('#focusBar').innerHTML = S.focus ? `
    <div class="focusbar">${I('target')} ${t('f.target')} <b>${esc(S.focus)}</b>
      <button class="link" id="onlyFocus">${t('f.only')}</button>
      <button class="link" id="clearFocus">${t('f.all')}</button></div>` : '';
  $('#confList').innerHTML = list.length ? shown.map(confHTML).join('') + (list.length > shown.length
      ? `<div class="empty"><button class="btn sm ghost" id="moreConf">${t('c.more', { n: Math.min(CONF_PAGE, list.length - shown.length), m: list.length - shown.length })}</button></div>` : '')
    : `<div class="empty">${S.conflicts.length ? t(S.focus && !(S.filters || []).length ? 'c.none.res' : 'c.none.flt') : I('circle-check') + ' ' + t('c.none')}</div>`;
  updateCounters(); renderQuote();
}

function updateCounters() {
  const n = S.conflicts.filter(c => c.checked).length;
  $('#selCount').textContent = t('c.selected', { n, m: S.conflicts.length });
}

function setChecked(c, v, row) {
  c.checked = v;
  if (row) {
    row.classList.toggle('off', !v);
    row.querySelector('.tick').checked = v;
    row.querySelector('.warnbox').hidden = v;
  }
  updateCounters(); renderQuote();
}

// Total : lignes de facturation (+ express), puis minimum, puis remise (uniquement quand on modifie un récap importé).
function quote() {
  const st = DEFAULTS;
  const sel = S.conflicts.filter(c => c.checked);
  const groups = billingGroups(sel, st);
  const sub = groups.reduce((s, g) => s + g.price, 0);
  const express = $('#express').checked;
  const extra = express ? sub * st.expressPct / 100 : 0;
  const base = sel.length ? Math.max(sub + extra, st.minOrder) : 0;
  const discountPct = S.imported ? num($('#discPct')?.value, 0, 100, 0) : 0;
  const discountAmount = S.imported ? num($('#discAmt')?.value, 0, 1e6, 0) : 0;
  const off = S.imported ? round2(Math.min(base, base * discountPct / 100 + discountAmount)) : 0;
  const total = round2(base - off);
  return { sel, groups, sub, extra, base, off, total, express, minApplied: sel.length && Math.max(sub + extra, st.minOrder) > sub + extra };
}

function renderQuote() {
  const q = quote();
  const st = DEFAULTS;
  const g3 = g => `<div class="line g"><span><b class="gr">${g.res.map(esc).join(' <em>+</em> ')}</b><small>${g.files.slice(0, 3).map(esc).join(', ')}${g.files.length > 3 ? ` +${g.files.length - 3}` : ''} · ${t('q.nRes', { n: g.res.length })}</small></span><b>${eur(g.price)}</b></div>`;
  $('#lines').innerHTML = `
    <div class="glines">${q.groups.length ? q.groups.map(g3).join('') : `<div class="empty">${t('q.pick')}</div>`}</div>
    <div class="lsum">
      <div class="line"><span>${t('q.selFiles')}</span><b>${q.sel.length} / ${S.conflicts.length}</b></div>
      <div class="line"><span>${t('q.sub', { n: q.groups.length, s: plural(q.groups.length) })}</span><b>${eur(q.sub)}</b></div>
      ${q.express ? `<div class="line"><span>${t('q.express', { p: st.expressPct })}</span><b>${eur(q.extra)}</b></div>` : ''}
      ${q.minApplied ? `<div class="line"><span>${t('q.min')}</span><b>${eur(q.base)}</b></div>` : ''}
      ${q.off ? `<div class="line"><span>${t('q.disc')}</span><b>-${eur(q.off)}</b></div>` : ''}
    </div>`;
  const qc = $('#qCount'); if (qc) qc.textContent = q.groups.length ? t('q.count', { n: q.groups.length, s: plural(q.groups.length) }) : '';
  const total = $('#total'), next = eur(q.total);
  if (total.textContent !== next && total.textContent !== '') { total.classList.remove('bump'); void total.offsetWidth; total.classList.add('bump'); }
  total.textContent = next;
  $('#btnSend').disabled = !q.sel.length;
  if (typeof updateHud === 'function') updateHud(q);
}
