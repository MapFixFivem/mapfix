/* MapFix · i18n.js — Français / English. Le français est la langue par défaut ; le choix est mémorisé.
   Les textes fixes du HTML portent data-i18n (texte), data-i18n-html (texte avec mise en forme, écrit ici et donc de
   confiance), data-i18n-ph (placeholder) ou data-i18n-title. Les textes construits par le JS passent par t(). */
'use strict';

const I18N = {
  fr: {
    'step.1': 'Dépose', 'step.2': 'Choisis', 'step.3': 'Récap',
    'win.title': 'Nouvelle mission',
    'hud.wanted': 'Niveau de recherche : 1 étoile par conflit (5 max)', 'hud.cash': 'Total estimé', 'snd.on': 'Son activé — cliquer pour couper', 'snd.off': 'Son coupé — cliquer pour activer',
    'pass.t': 'Mission réussie', 'pass.s': 'Récapitulatif téléchargé — envoie-le sur Discord',
    'hero.h1': 'Tes maps en conflit ?<br><em>On les fixe.</em>',
    'hero.p': 'Dépose tes ressources, corrige les conflits, télécharge ton devis. <b>Tout reste dans ton navigateur.</b>',
    'drop.title': 'Dépose tes fichiers ici',
    'drop.sub': 'Dossier <code>resources</code>, <code>.zip</code>, ou un récap déjà reçu',
    'btn.folder': 'Dossier', 'btn.demo': 'Exemple', 'btn.recap': 'Récap',
    'price.per': 'par conflit', 'price.tip': 'Peu importe le nombre de fichiers concernés',
    'feat.1': 'Résolution de conflits', 'feat.2': "Correction d'erreurs", 'feat.3': 'Récapitulatif clair', 'feat.4': 'Merge & compatibilité', 'feat.5': 'Fiable',
    'res.title': 'Ressources détectées', 'res.hint': 'Clique sur une ressource pour cibler ses conflits',
    'conf.title': 'Fichiers en conflit', 'conf.all': 'Tout cocher', 'conf.none': 'Tout décocher',
    'lock.q': "C'est quoi « Non vérifiable » ?",
    'lock.body': "Au moins un des fichiers du conflit est <b>crypté (escrow FiveM)</b> : la ressource a un <code>.fxap</code> et le fichier n'est pas listé dans <code>escrow_ignore</code> de son manifest. On voit son nom mais pas son contenu, donc on ne peut pas garantir que le conflit est réel ni que le fix sera à 100 %. Un supplément peut s'appliquer. Les <code>ytyp</code>, <code>ymap</code> et collisions (<code>ybn</code>) ne sont jamais cryptés, donc toujours vérifiables.",
    'quote.title': 'Ton devis', 'edit.banner': 'Récapitulatif importé — modifie-le puis retélécharge-le.',
    'disc.pct': 'Remise (%)', 'disc.amt': 'Remise (€)',
    'f.discord': 'Pseudo Discord', 'f.discord.ph': 'ex: lenzo#0001',
    'f.express': 'Livraison express', 'f.msg': 'Message (optionnel)', 'f.msg.ph': 'Précisions, serveur, version...',
    'total': 'Total estimé', 'send': 'Télécharger le récapitulatif', 'send.edit': 'Télécharger le récapitulatif mis à jour',
    'foot.1': 'Votre serveur.<br>Notre expertise.', 'foot.2': '© MapFix · démo front-end — les données restent dans ton navigateur', 'foot.3': 'Des maps<br>sans limites.',
    /* dynamiques */
    'st.res': 'Ressources', 'st.files': 'Fichiers', 'st.conf': 'En conflit', 'st.groups': 'Conflits', 'st.enc': 'Cryptées', 'st.ign': 'Ignorés',
    'st.res.t': 'Ressources détectées dans ton dépôt', 'st.files.t': 'Fichiers lus dans ton dépôt',
    'st.conf.t': 'Fichiers présents dans plusieurs ressources ({n} avec des versions différentes)',
    'st.groups.t': "Groupes de ressources qui se partagent des fichiers : c'est ce qui est facturé",
    'st.enc.t': 'Ressources sous escrow dont le contenu est illisible', 'st.ign.t': "Fichiers écartés par les règles d'analyse (générateurs, manifests…)",
    'r.fxap': '.fxap détecté', 'r.headers': 'en-têtes non standard', 'r.locked': '{n} crypté(s)', 'r.readable': '{n} lisible(s)',
    'r.enc': 'Crypté (escrow)', 'r.escrowOk': 'Escrow, tout lisible', 'r.ok': 'Lisible',
    'r.files': '{n} fichiers', 'r.analysed': '{n} analysés',
    'c.aria': 'Corriger {name}', 'c.critical': 'Critique', 'c.medium': 'Moyen', 'c.same': 'Identique', 'c.diff': 'Version différente',
    'c.unverif': 'Non vérifiable', 'c.unverif.t': 'Ressource cryptée : contenu illisible',
    'c.in': 'Présent dans :', 'c.keep': 'Ressource conservée :', 'c.auto': 'Auto (MapFix décide)',
    'c.warn': 'Non corrigé : ce conflit pourra provoquer des bugs persistants.',
    'f.target': 'Ressource ciblée :', 'f.only': 'Ne corriger que celle-ci', 'f.all': 'Voir tout',
    'c.more': 'Afficher {n} de plus ({m} restants)', 'c.none.res': 'Aucun conflit pour cette ressource.', 'c.none.flt': 'Aucun conflit pour ce filtre.',
    'flt.all': 'Tous', 'flt.lod': 'LOD', 'flt.light': 'Lumières', 'flt.occl': 'Occlusion', 'flt.aria': 'Filtrer par type de fichier', 'c.none': 'Aucun conflit détecté.',
    'c.selected': '· {n}/{m} sélectionnés',
    'q.nRes': '{n} ressources', 'q.pick': 'Coche au moins un fichier pour voir le détail.', 'q.selFiles': 'Fichiers sélectionnés',
    'q.sub': 'Sous-total ({n} conflit{s})', 'q.express': 'Express +{p}%', 'q.min': 'Minimum', 'q.disc': 'Remise', 'q.count': '{n} conflit{s}',
    'm.reading': 'Lecture des fichiers…', 'm.nofile': 'Aucun fichier utilisable trouvé.', 'm.progress': 'Analyse… {a}/{b} fichiers', 'm.fail': "Impossible d'analyser ces fichiers.",
    'm.skipped': '{n} fichier(s) écarté(s) par sécurité (exécutables, chemins invalides, doublons).',
    'm.err': 'Une erreur est survenue. Recharge la page si le problème continue.',
    'm.dropBad': 'Dépose un .zip, un récapitulatif (.html), ou utilise « Dossier ».',
    'm.focus': 'Seuls les conflits de « {n} » sont conservés',
    'm.discord': 'Renseigne ton lien Discord dans js/config.js (discordInvite)',
    'x.name': 'Pseudo invalide ({a} à {b} caractères : lettres, chiffres, . _ # -).', 'x.msg': 'Message trop long ({n} caractères maximum).',
    'x.none': 'Sélectionne au moins un fichier en conflit.', 'x.done': 'Téléchargé : {f} — envoie-le sur Discord.',
    'x.notRecap': "Ce fichier n'est pas un récapitulatif MapFix valide.", 'x.empty': 'Récapitulatif illisible ou vide.', 'x.imported': 'Récapitulatif importé — modifie-le puis retélécharge-le.',
    'i.tooMany': 'Trop de fichiers (maximum {n}).',
    'i.zipBig': 'Archive trop volumineuse ({s}, maximum {m}).', 'i.zipBad': "Archive illisible : ce n'est pas un .zip valide.",
    'i.zipMany': "Trop de fichiers dans l'archive (maximum {n}).", 'i.unpacked': 'Contenu trop volumineux une fois décompressé ({s}, maximum {m}).',
    'i.bomb': 'Archive suspecte : taux de compression anormal (risque de « bombe » de décompression).',
    'i.dirMany': 'Trop de fichiers dans le dossier (maximum {n}).', 'i.dirBig': 'Dossier trop volumineux ({s}, maximum {m}).',
    /* fichier récapitulatif */
    'rc.mod': 'Récapitulatif modifié', 'rc.new': 'Nouveau récapitulatif', 'rc.h1': 'Récapitulatif', 'rc.gen': 'Généré le {d}', 'rc.pseudo': 'Pseudo :', 'rc.express': 'Livraison express',
    'rc.res': '{n} ressource(s)', 'rc.confs': '{n} conflit(s) à corriger', 'rc.none': 'Aucun conflit sélectionné.', 'rc.total': 'Total', 'rc.sub': 'Sous-total {a}', 'rc.plusExp': ' + express', 'rc.off': ', remise -{a}',
    'rc.skipped': 'Non sélectionné ({n}) :',
    'rc.foot': "Fichier généré par MapFix, sans serveur : rien n'a été envoyé nulle part. Pour le modifier (prix, remise, conflits), glisse ce même fichier sur la page MapFix.",
  },
  en: {
    'step.1': 'Drop', 'step.2': 'Pick', 'step.3': 'Recap',
    'win.title': 'New mission',
    'hud.wanted': 'Wanted level: 1 star per conflict (max 5)', 'hud.cash': 'Estimated total', 'snd.on': 'Sound on — click to mute', 'snd.off': 'Sound off — click to unmute',
    'pass.t': 'Mission passed', 'pass.s': 'Recap downloaded — send it on Discord',
    'hero.h1': 'Map conflicts?<br><em>We fix them.</em>',
    'hero.p': 'Drop your resources, fix the conflicts, download your quote. <b>Everything stays in your browser.</b>',
    'drop.title': 'Drop your files here',
    'drop.sub': '<code>resources</code> folder, <code>.zip</code>, or a recap you already received',
    'btn.folder': 'Folder', 'btn.demo': 'Example', 'btn.recap': 'Recap',
    'price.per': 'per conflict', 'price.tip': 'No matter how many files are involved',
    'feat.1': 'Conflict resolution', 'feat.2': 'Error fixing', 'feat.3': 'Clear recap', 'feat.4': 'Merge & compatibility', 'feat.5': 'Reliable',
    'res.title': 'Detected resources', 'res.hint': 'Click a resource to focus its conflicts',
    'conf.title': 'Conflicting files', 'conf.all': 'Select all', 'conf.none': 'Clear all',
    'lock.q': 'What does “Unverifiable” mean?',
    'lock.body': "At least one file in the conflict is <b>encrypted (FiveM escrow)</b>: the resource has a <code>.fxap</code> and the file isn't listed in its manifest's <code>escrow_ignore</code>. We can see its name but not its content, so we can't guarantee the conflict is real or that the fix will be 100%. A surcharge may apply. <code>ytyp</code>, <code>ymap</code> and collisions (<code>ybn</code>) are never encrypted, so always verifiable.",
    'quote.title': 'Your quote', 'edit.banner': 'Recap imported — edit it, then download it again.',
    'disc.pct': 'Discount (%)', 'disc.amt': 'Discount (€)',
    'f.discord': 'Discord username', 'f.discord.ph': 'e.g. lenzo#0001',
    'f.express': 'Express delivery', 'f.msg': 'Message (optional)', 'f.msg.ph': 'Details, server, version...',
    'total': 'Estimated total', 'send': 'Download the recap', 'send.edit': 'Download the updated recap',
    'foot.1': 'Your server.<br>Our expertise.', 'foot.2': '© MapFix · front-end demo — your data stays in your browser', 'foot.3': 'Maps<br>without limits.',
    'st.res': 'Resources', 'st.files': 'Files', 'st.conf': 'Conflicting', 'st.groups': 'Conflicts', 'st.enc': 'Encrypted', 'st.ign': 'Ignored',
    'st.res.t': 'Resources found in your upload', 'st.files.t': 'Files read from your upload',
    'st.conf.t': 'Files present in several resources ({n} with different versions)',
    'st.groups.t': 'Groups of resources sharing files: this is what is billed',
    'st.enc.t': 'Escrow resources whose content is unreadable', 'st.ign.t': 'Files skipped by the analysis rules (generators, manifests…)',
    'r.fxap': '.fxap detected', 'r.headers': 'non-standard headers', 'r.locked': '{n} encrypted', 'r.readable': '{n} readable',
    'r.enc': 'Encrypted (escrow)', 'r.escrowOk': 'Escrow, all readable', 'r.ok': 'Readable',
    'r.files': '{n} files', 'r.analysed': '{n} analysed',
    'c.aria': 'Fix {name}', 'c.critical': 'Critical', 'c.medium': 'Medium', 'c.same': 'Identical', 'c.diff': 'Different version',
    'c.unverif': 'Unverifiable', 'c.unverif.t': 'Encrypted resource: unreadable content',
    'c.in': 'Found in:', 'c.keep': 'Resource kept:', 'c.auto': 'Auto (MapFix decides)',
    'c.warn': 'Not fixed: this conflict may cause lasting bugs.',
    'f.target': 'Focused resource:', 'f.only': 'Fix only this one', 'f.all': 'Show all',
    'c.more': 'Show {n} more ({m} left)', 'c.none.res': 'No conflict for this resource.', 'c.none.flt': 'No conflict for this filter.',
    'flt.all': 'All', 'flt.lod': 'LOD', 'flt.light': 'Lights', 'flt.occl': 'Occlusion', 'flt.aria': 'Filter by file type', 'c.none': 'No conflict detected.',
    'c.selected': '· {n}/{m} selected',
    'q.nRes': '{n} resources', 'q.pick': 'Select at least one file to see the breakdown.', 'q.selFiles': 'Selected files',
    'q.sub': 'Subtotal ({n} conflict{s})', 'q.express': 'Express +{p}%', 'q.min': 'Minimum', 'q.disc': 'Discount', 'q.count': '{n} conflict{s}',
    'm.reading': 'Reading files…', 'm.nofile': 'No usable file found.', 'm.progress': 'Analysing… {a}/{b} files', 'm.fail': 'Could not analyse these files.',
    'm.skipped': '{n} file(s) skipped for safety (executables, invalid paths, duplicates).',
    'm.err': 'Something went wrong. Reload the page if it keeps happening.',
    'm.dropBad': 'Drop a .zip, a recap (.html), or use “Folder”.',
    'm.focus': 'Only the conflicts of “{n}” are kept',
    'm.discord': 'Set your Discord link in js/config.js (discordInvite)',
    'x.name': 'Invalid username ({a} to {b} characters: letters, digits, . _ # -).', 'x.msg': 'Message too long ({n} characters max).',
    'x.none': 'Select at least one conflicting file.', 'x.done': 'Downloaded: {f} — send it on Discord.',
    'x.notRecap': 'This file is not a valid MapFix recap.', 'x.empty': 'Recap unreadable or empty.', 'x.imported': 'Recap imported — edit it, then download it again.',
    'i.tooMany': 'Too many files (maximum {n}).',
    'i.zipBig': 'Archive too large ({s}, maximum {m}).', 'i.zipBad': 'Unreadable archive: not a valid .zip.',
    'i.zipMany': 'Too many files in the archive (maximum {n}).', 'i.unpacked': 'Content too large once unpacked ({s}, maximum {m}).',
    'i.bomb': 'Suspicious archive: abnormal compression ratio (possible decompression bomb).',
    'i.dirMany': 'Too many files in the folder (maximum {n}).', 'i.dirBig': 'Folder too large ({s}, maximum {m}).',
    'rc.mod': 'Updated recap', 'rc.new': 'New recap', 'rc.h1': 'Recap', 'rc.gen': 'Generated on {d}', 'rc.pseudo': 'Username:', 'rc.express': 'Express delivery',
    'rc.res': '{n} resource(s)', 'rc.confs': '{n} conflict(s) to fix', 'rc.none': 'No conflict selected.', 'rc.total': 'Total', 'rc.sub': 'Subtotal {a}', 'rc.plusExp': ' + express', 'rc.off': ', discount -{a}',
    'rc.skipped': 'Not selected ({n}):',
    'rc.foot': 'File generated by MapFix, no server: nothing was sent anywhere. To edit it (price, discount, conflicts), drop this same file on the MapFix page.',
  },
};

let LANG = (() => { const l = load('mf_lang', 'fr'); return l === 'en' ? 'en' : 'fr'; })();

function t(key, vars, lang = LANG) {
  let s = I18N[lang]?.[key] ?? I18N.fr[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m));
  return s;
}
const plural = n => (n > 1 ? 's' : '');

// (ré)applique la langue aux textes fixes de la page
function applyLang() {
  document.documentElement.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });     // chaînes écrites dans ce fichier : de confiance
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('.lang')?.setAttribute('data-cur', LANG);
  if (typeof sfx !== 'undefined') sfx.sync();
  $$('.lang [data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}

function setLang(l) {
  LANG = l === 'en' ? 'en' : 'fr';
  save('mf_lang', LANG);
  applyLang();
}
