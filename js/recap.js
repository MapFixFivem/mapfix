/* MapFix · recap.js — Le devis ne part pas vers un serveur : il devient un fichier .html autonome
   (lisible tel quel, et réouvrable ici pour le modifier). C'est tout l'« envoi » de MapFix. */
'use strict';

const RECAP_V = 1;

/* ---------- construction (état courant → objet à exporter) ---------- */
function buildRecap() {
  const q = quote();
  return {
    v: RECAP_V,
    lang: LANG,
    createdAt: new Date().toISOString(),
    mode: S.imported ? 'edit' : 'client',
    meta: {
      name: cleanText($('#discord').value, LIMITS.pseudo[1]),
      message: cleanText($('#msg').value, LIMITS.message, true),
    },
    express: q.express,
    discountPct: S.imported ? num($('#discPct').value, 0, 100, 0) : 0,
    discountAmount: S.imported ? num($('#discAmt').value, 0, 1e6, 0) : 0,
    resources: S.resources.map(r => ({ name: r.name, files: r.files, size: r.size, encrypted: !!r.encrypted })),
    conflicts: S.conflicts.map(c => ({ name: c.name, ext: c.ext, critical: !!c.critical, identical: !!c.identical, locked: !!c.locked, checked: !!c.checked, keep: c.keep, res: c.res })),
    snapshot: { groups: q.groups, sub: q.sub, extra: q.extra, base: q.base, off: q.off, total: q.total },   // juste pour l'affichage humain, jamais relu
  };
}

/* ---------- relecture d'un fichier importé : donnée non fiable, tout est revalidé ---------- */
function sanitizeRecap(raw) {
  if (!isObj(raw) || raw.v !== RECAP_V) return null;
  const meta = isObj(raw.meta) ? raw.meta : {};
  const conflicts = list(raw.conflicts, LIMITS.recapConflicts).filter(isObj).map(c => ({
    name: cleanText(c.name, 300), ext: cleanText(c.ext, 12), critical: !!c.critical, identical: !!c.identical, locked: !!c.locked,
    checked: !!c.checked, keep: cleanText(c.keep, 200), res: list(c.res, 50).map(x => cleanText(x, 200)).filter(Boolean),
  })).filter(c => c.res.length >= 2).map((c, id) => ({ ...c, id }));   // ids réattribués ici, jamais ceux du fichier
  if (!conflicts.length) return null;
  const resources = list(raw.resources, LIMITS.recapResources).filter(isObj)
    .map(r => ({ name: cleanText(r.name, 200), files: num(r.files, 0, 1e7, 0), size: num(r.size, 0, 1e13, 0), encrypted: !!r.encrypted }));
  return {
    meta: { name: cleanText(meta.name, LIMITS.pseudo[1]), message: cleanText(meta.message, LIMITS.message, true) },
    lang: raw.lang === 'en' ? 'en' : 'fr',
    express: !!raw.express, discountPct: num(raw.discountPct, 0, 100, 0), discountAmount: num(raw.discountAmount, 0, 1e6, 0),
    resources, conflicts,
  };
}

/* ---------- gabarit du fichier exporté : un .html autonome, lisible sans le site, avec la donnée cachée dedans ---------- */
function recapHTML(data) {
  const L = data.lang === 'en' ? 'en' : 'fr';
  const T = (k, v) => t(k, v, L);
  const q = data.snapshot;
  const g3 = g => `<div class="ln"><div><b>${g.res.map(esc).join(' + ')}</b><small>${g.files.slice(0, 4).map(esc).join(', ')}${g.files.length > 4 ? ` +${g.files.length - 4}` : ''}</small></div><b class="pr">${eur(g.price)}</b></div>`;
  const skipped = data.conflicts.filter(c => !c.checked);
  return `<!doctype html>
<html lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>MapFix — ${esc(T('rc.h1'))} — ${esc(data.meta.name || 'client')}</title>
<style>
:root{color-scheme:dark;--bg:#08051a;--card:rgba(11,7,32,.93);--stroke:rgba(255,255,255,.14);--t1:#fff;--t2:rgba(255,255,255,.76);--t3:rgba(255,255,255,.5);--accent:#ff4f9a;--accent-2:#ffd23f;--pink:#ff4f9a;--green:#4dffb0;--display:Impact,"Arial Narrow Bold","Franklin Gothic Heavy",sans-serif}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,#06031a 0%,#140a3a 40%,#48155e 72%,#a82a78 92%,#ff7a4a 100%) fixed;color:var(--t1);font:400 15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;padding:32px 16px 60px}
main{max-width:640px;margin:0 auto}
h1{font:400 2.3rem/1 var(--display);margin:0 0 4px;letter-spacing:.03em;text-transform:uppercase;font-style:italic;text-shadow:3px 3px 0 var(--pink)}
h1 em{font-style:italic;color:var(--accent-2)}
.mut{color:var(--t2)}
.small{color:var(--t3);font-size:.8rem}
.card{background:var(--card);border:1px solid var(--stroke);border-top:3px solid var(--accent);border-radius:6px;padding:20px 22px;margin-top:18px}
.kv{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:.86rem}
.kv b{color:var(--t1)}
.ln{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid var(--stroke);font-size:.88rem}
.ln:last-child{border-bottom:0}
.ln small{display:block;color:var(--t3);font-size:.76rem;margin-top:2px}
.ln b{font:600 .88rem ui-monospace,'JetBrains Mono',monospace}
.ln .pr{font:400 1.2rem/1 var(--display);letter-spacing:.04em;color:var(--green);white-space:nowrap}
.tot{display:flex;justify-content:space-between;align-items:baseline;padding-top:14px;margin-top:8px;border-top:1px solid var(--stroke)}
.tot b{font:400 2.6rem/1 var(--display);letter-spacing:.03em;color:var(--green);text-shadow:0 3px 0 #053a2b,3px 3px 0 #000}
.skip{opacity:.55;font-size:.82rem;padding:4px 0}
.tag{display:inline-block;padding:2px 10px;border-radius:2px;background:linear-gradient(90deg,var(--accent-2),var(--accent));color:#0a0614;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
footer{margin-top:26px;color:var(--t3);font-size:.78rem;line-height:1.6}
</style></head>
<body><main>
  <span class="tag">${T(data.mode === 'edit' ? 'rc.mod' : 'rc.new')}</span>
  <h1>MAP<em>FIX</em> · ${esc(T('rc.h1'))}</h1>
  <p class="small">${esc(T('rc.gen', { d: new Date(data.createdAt).toLocaleString(L === 'en' ? 'en-GB' : 'fr-FR') }))}</p>

  <div class="card">
    <div class="kv">
      <span>${esc(T('rc.pseudo'))} <b>${esc(data.meta.name || '—')}</b></span>
      ${data.express ? `<span>${esc(T('rc.express'))}</span>` : ''}
    </div>
    ${data.meta.message ? `<p class="mut" style="margin:12px 0 0">« ${esc(data.meta.message)} »</p>` : ''}
  </div>

  <div class="card">
    <div class="kv" style="margin-bottom:4px"><span>${esc(T('rc.res', { n: data.resources.length }))}</span><span>${esc(T('rc.confs', { n: q.groups.length }))}</span></div>
    ${q.groups.map(g3).join('') || `<p class="mut">${esc(T('rc.none'))}</p>`}
    <div class="tot"><span class="mut">${esc(T('rc.total'))}</span><b>${eur(q.total)}</b></div>
    ${q.off ? `<p class="small">${esc(T('rc.sub', { a: eur(q.sub) }))}${data.express ? esc(T('rc.plusExp')) : ''}${q.off ? esc(T('rc.off', { a: eur(q.off) })) : ''}</p>` : ''}
  </div>

  ${skipped.length ? `<div class="card"><p class="small" style="margin:0 0 8px">${esc(T('rc.skipped', { n: skipped.length }))}</p>${skipped.map(c => `<div class="skip">${esc(c.res.join(' + '))} — <code>${esc(c.name)}</code></div>`).join('')}</div>` : ''}

  <footer>${esc(T('rc.foot'))}</footer>
</main>
<script type="application/json" id="mf-data">${JSON.stringify(data).replace(/</g, '\\u003c')}<\/script>
</body></html>`;
}

/* ---------- export ---------- */
function exportRecap() {
  const hint = $('#sendHint');
  const fail = msg => { hint.textContent = msg; hint.className = 'hint err'; };
  hint.className = 'hint';
  const name = validPseudo($('#discord').value);
  if (!name) return fail(t('x.name', { a: LIMITS.pseudo[0], b: LIMITS.pseudo[1] }));
  if ($('#msg').value.length > LIMITS.message) return fail(t('x.msg', { n: LIMITS.message }));
  const q = quote();
  if (!q.sel.length) return fail(t('x.none'));

  const data = buildRecap();
  const html = recapHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `mapfix-recap-${safeName(name)}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  save('mf_discord', name);

  hint.className = 'hint ok';
  hint.textContent = t('x.done', { f: a.download });
  if (typeof missionPassed === 'function') missionPassed();
}

/* ---------- import : réouverture d'un récapitulatif pour le modifier ---------- */
async function importRecapFile(file) {
  let raw;
  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');   // n'exécute rien : lecture passive du DOM
    const tag = doc.getElementById('mf-data');
    if (!tag) throw new Error('no-data');
    raw = JSON.parse(tag.textContent);
  } catch {
    return toast(t('x.notRecap'));
  }
  const data = sanitizeRecap(raw);
  if (!data) return toast(t('x.empty'));

  S = { imported: true, resources: data.resources, conflicts: data.conflicts,
    totalFiles: data.resources.reduce((n, r) => n + r.files, 0), ignored: 0, focus: null, limit: CONF_PAGE };
  enterWorking();
  $('#discord').value = data.meta.name;
  $('#msg').value = data.meta.message;
  $('#express').checked = data.express;
  $('#discPct').value = data.discountPct || '';
  $('#discAmt').value = data.discountAmount || '';
  $('#editBar').hidden = false;
  $('#btnSend').textContent = t('send.edit');
  renderAnalysis();
  toast(t('x.imported'));
}
