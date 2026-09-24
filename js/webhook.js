/* MapFix · webhook.js — Notifie un webhook Discord (embed classique) quand un client commence une analyse et quand
   il télécharge son récapitulatif. Désactivé si CONFIG.webhookUrl est vide et rien n'est réglé dans le navigateur.
   Un échec réseau (webhook supprimé, hors ligne…) ne doit jamais gêner le client : tout est avalé silencieusement.
   (Les Components V2 — la mise en page « bloc + séparateurs » plus récente — ont été essayés en premier, mais sont
   systématiquement refusés par l'API Discord avec « message vide », quel que soit le format exact ; les embeds
   classiques, testés en direct, fonctionnent de manière fiable et donnent un rendu tout aussi stylé.)

   Où est l'URL du webhook : dans CONFIG.webhookUrl (js/config.js), en clair, choix assumé (voir le commentaire de ce
   champ et docs/SECURITE.md) — c'est nécessaire pour que la notification parte vraiment quand un CLIENT (pas
   l'admin) utilise le site : un réglage purement local ne s'appliquerait qu'au navigateur qui l'a saisi. Un webhook
   Discord ne permet que d'écrire dans ce salon, jamais de le lire. En complément, un triple-clic sur le logo MAPFIX
   permet à l'admin de régler (ou de tester) une autre URL depuis SON propre navigateur (stockée en localStorage,
   jamais commise) : elle prime alors sur celle de config.js. */
'use strict';

const wh = (() => {
  const COLOR_START = 0xffb04d, COLOR_FINAL = 0x4dffb0;
  const sentKeys = new Set();   // anti-doublon (le temps de l'onglet) : une seule alerte « nouvelle analyse » par dépôt identique

  // L'URL réglée dans le navigateur (triple-clic sur le logo) prime toujours sur celle, facultative, de config.js.
  const whUrl = () => load('mf_webhook_url', '') || CONFIG.webhookUrl;

  // Markdown Discord : on neutralise les caractères de mise en forme d'un texte saisi par le client (pseudo, message)
  // pour qu'il ne casse pas la mise en page. Les mentions (@everyone, rôles…) sont de toute façon coupées plus bas
  // par allowed_mentions, quel que soit le texte tapé.
  const mdEsc = s => String(s).replace(/([\\`*_~|])/g, '\\$1').replace(/^>/gm, '\\>').replace(/\n{3,}/g, '\n\n');

  function post(embed) {
    const url = whUrl();
    if (!url) return;
    embed.timestamp = new Date().toISOString();
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
      }).catch(() => {});
    } catch {}
  }

  const field = (name, value, inline = true) => ({ name, value: String(value).slice(0, 1024), inline });

  function start(state) {
    if (!whUrl() || CONFIG.webhookOnStart === false) return;
    const key = state.resources.map(r => r.name).sort().join('|') + '·' + state.totalFiles;
    if (sentKeys.has(key)) return;
    sentKeys.add(key);
    const enc = state.resources.filter(r => r.encrypted).length;
    const groups = billingGroups(state.conflicts, DEFAULTS);
    const est = groups.reduce((s, g) => s + g.price, 0);
    const known = load('mf_discord', '');
    post({
      title: '🗺️ Nouvelle analyse en cours',
      description: "Un client dépose ses ressources sur MapFix — rien n'a encore été envoyé, il est peut-être en train de cocher ses conflits.",
      color: COLOR_START,
      fields: [
        field('Ressources', state.resources.length),
        field('Fichiers', state.totalFiles),
        field('Conflits', `${state.conflicts.length} (${groups.length} facturable${groups.length > 1 ? 's' : ''})`),
        enc ? field('Cryptées', enc) : null,
        known ? field('Pseudo mémorisé', mdEsc(known)) : null,
        field('Estimation à cet instant', eur(est), false),
      ].filter(Boolean),
      footer: { text: 'MapFix' },
    });
  }

  function final(data, q) {
    if (!whUrl() || CONFIG.webhookOnSend === false) return;
    const lines = q.groups.slice(0, 8).map(g => `• \`${g.res.join(' + ')}\` — ${eur(g.price)}`);
    if (q.groups.length > 8) lines.push(`… +${q.groups.length - 8} autre(s)`);
    post({
      title: '💰 Récapitulatif téléchargé',
      color: COLOR_FINAL,
      fields: [
        field('Pseudo', mdEsc(data.meta.name || '—')),
        data.express ? field('Express', `oui (+${DEFAULTS.expressPct}%)`) : null,
        data.mode === 'edit' ? field('Type', 'récapitulatif modifié') : null,
        data.meta.message ? field('Message', mdEsc(data.meta.message), false) : null,
        field('Détail', lines.join('\n') || 'Aucun conflit sélectionné.', false),
        field('Total', `**${eur(q.total)}**`, false),
      ].filter(Boolean),
      footer: { text: 'MapFix' },
    });
  }

  return { start, final, get url() { return whUrl(); } };
})();

// Réglage discret, réservé à l'admin : triple-clic sur le logo pour saisir (ou effacer) l'URL du webhook dans CE
// navigateur uniquement. Un client ne tombe pas dessus par hasard, et rien n'est jamais écrit dans le dépôt.
{
  let clicks = 0, clickT = null;
  document.querySelector('.logo')?.addEventListener('click', e => {
    if (++clicks < 3) { clearTimeout(clickT); clickT = setTimeout(() => (clicks = 0), 600); return; }
    e.preventDefault();
    clicks = 0;
    const cur = load('mf_webhook_url', '');
    const v = prompt('URL du webhook Discord (vide pour désactiver) — reste dans ce navigateur, jamais publiée :', cur);
    if (v === null) return;
    const clean = v.trim();
    if (clean && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(clean)) return toast(t('wh.bad'));
    save('mf_webhook_url', clean);
    toast(t(clean ? 'wh.on' : 'wh.off'));
  });
}
