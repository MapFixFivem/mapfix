/* MapFix · analysis.js — Analyse locale des ressources : conflits, chiffrement, fichiers ignorés.
   Les noms de dossiers/fichiers viennent d'un inconnu : tous les dictionnaires sont sans prototype (safeDict) et aucun
   motif venant d'un fichier n'est compilé en RegExp. */
'use strict';

const base = p => p.slice(p.lastIndexOf('/') + 1);
const ext = extOf;
const dirOf = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';

// fichiers ignorés à l'analyse (motifs de l'admin, ex. « *generator* »)
function isIgnored(path, globs) {
  const b = base(path), full = path;
  return globs.some(g => globMatch(g, b) || globMatch(g, full));
}

const isManifest = p => ['fxmanifest.lua', '__resource.lua'].includes(base(p).toLowerCase());

// Lit les entrées `escrow_ignore` d'un fxmanifest / __resource.lua (ces fichiers ne sont PAS cryptés).
// Analyseur LINÉAIRE (pas de RegExp à retour arrière) : un manifest piégé ne peut pas ralentir le navigateur.
function parseEscrowIgnore(txt) {
  txt = String(txt).slice(0, 200000);
  const out = [], n = txt.length;
  let i = 0, mode = null;   // mode : null | 'brace' (liste { … }) | 'line' (valeur unique sur la ligne)
  while (i < n && out.length < LIMITS.patterns) {
    const c = txt[i];
    if (c === '-' && txt[i + 1] === '-') {                                   // commentaire Lua
      if (txt.startsWith('[[', i + 2)) { const e = txt.indexOf(']]', i + 4); i = e < 0 ? n : e + 2; }
      else { const e = txt.indexOf('\n', i); i = e < 0 ? n : e; }
      continue;
    }
    if (mode === null) {
      if (txt.startsWith('escrow_ignore', i)) {
        i += 13; while (i < n && (txt[i] === ' ' || txt[i] === '\t')) i++;
        if (txt[i] === '{') { mode = 'brace'; i++; } else mode = 'line';
      } else i++;
      continue;
    }
    if ((c === '\n' && mode === 'line') || (c === '}' && mode === 'brace')) { mode = null; i++; continue; }
    if (c === '"' || c === "'") {
      const e = txt.indexOf(c, i + 1); if (e < 0) break;
      const s = txt.slice(i + 1, e);
      if (s && s.length <= LIMITS.patternLength * 2) out.push(s.replace(/^\.\//, ''));
      i = e + 1; continue;
    }
    i++;
  }
  return out;
}

// Ressource propriétaire d'un fichier : le dossier parent le plus proche qui contient un manifest
function resolver(entries) {
  const manifests = new Set(entries.filter(e => isManifest(e.path)).map(e => dirOf(e.path)));
  const resName = dir => dir ? dir.split('/').pop() : '(racine)';
  const ownerDir = path => {
    let d = dirOf(path);
    for (;;) { if (manifests.has(d)) return d; if (d === '') break; d = dirOf(d); }
    return path.includes('/') ? path.split('/')[0] : '';
  };
  return { resName, ownerDir };
}

// { nomRessource: [entrées] } : tous les fichiers de chaque ressource
function splitResources(entries) {
  const { resName, ownerDir } = resolver(entries), map = safeDict();
  entries.forEach(e => (map[resName(ownerDir(e.path))] ??= []).push(e));
  return map;
}

// onProgress(faits, total) est appelé de temps en temps ; l'interface reste réactive pendant l'analyse
async function analyze(entries, onProgress = () => {}) {
  if (entries.length > LIMITS.entries) throw new IngestError(t('i.tooMany', { n: LIMITS.entries }));
  resetMatchBudget();
  const st = DEFAULTS, ignoreGlobs = compileGlobs(st.ignore);
  const cfgOf = x => hasOwn(st.exts, x) ? st.exts[x] : undefined;

  const manifestText = safeDict();
  for (const e of entries.filter(e => isManifest(e.path))) {
    try { manifestText[dirOf(e.path)] = await (await e.blob()).text(); } catch {}
  }
  const { resName, ownerDir } = resolver(entries);

  const resources = safeDict(), stream = [];
  let ignored = 0, n = 0;
  for (const e of entries) {
    if ((n++ & 1023) === 0) { onProgress(n, entries.length); await tick(); }
    const dir = ownerDir(e.path), name = resName(dir);
    const r = resources[name] ??= { name, dir, files: 0, size: 0, stream: 0, fxap: false, suspect: 0, checked: 0, lockedFiles: 0, readableFiles: 0,
      escrowIgnore: compileGlobs(parseEscrowIgnore(manifestText[dir] || '')) };
    r.files++; r.size += e.size;
    const x = ext(e.path);
    if (x === 'fxap') r.fxap = true;
    if (cfgOf(x)?.on) {
      if (isIgnored(e.path, ignoreGlobs)) { ignored++; continue; }
      r.stream++; stream.push({ ...e, res: name });
    }
  }

  // Chiffrement, fichier par fichier :
  //  - ressource sous escrow = présence d'un .fxap (sinon, repli : en-têtes binaires qui ne commencent pas par RSC7)
  //  - jamais crypté : types "readable" (ytyp, ymap, ybn…) et fichiers listés dans escrow_ignore du manifest
  for (const f of stream.filter(f => BINARY_EXT.includes(ext(f.path)) && f.header)) {
    try {
      const r = resources[f.res];
      if (r.fxap || r.checked >= 6) continue; r.checked++;
      const h = await f.header();
      if (h && String.fromCharCode(...h.slice(0, 4)) !== 'RSC7') r.suspect++;   // h = null : fichier trop gros pour être lu, on ne conclut pas
    } catch {}
  }
  for (const r of Object.values(resources)) r.escrow = r.fxap || r.suspect > 0;
  for (const f of stream) {
    const r = resources[f.res];
    const rel = r.dir ? f.path.slice(r.dir.length + 1) : f.path;
    f.locked = r.escrow && !st.readable.includes(ext(f.path)) && !r.escrowIgnore.some(g => globMatch(g, rel));
    f.locked ? r.lockedFiles++ : r.readableFiles++;
  }
  Object.values(resources).forEach(r => r.encrypted = r.lockedFiles > 0);

  // doublons de noms entre ressources différentes
  const byName = safeDict();
  stream.forEach(f => (byName[base(f.path).toLowerCase()] ??= []).push(f));
  const conflicts = Object.entries(byName)
    .filter(([, l]) => new Set(l.map(f => f.res)).size >= 2)
    .map(([name, l]) => {
      const identical = new Set(l.map(f => f.size)).size === 1;
      const e = ext(name), locked = l.some(f => f.locked);
      return { name, ext: e, identical, critical: !!cfgOf(e)?.crit, locked, checked: true, keep: '',
        res: [...new Set(l.map(f => f.res))] };   // seul le nom des ressources compte à partir d'ici (facturation, affichage, récap)
    })
    .sort((a, b) => b.critical - a.critical || a.name.localeCompare(b.name))
    .map((c, i) => ({ ...c, id: i }));      // ids attribués APRÈS le tri (sinon les cases cochent la mauvaise ligne)

  return { resources: Object.values(resources), conflicts, totalFiles: entries.length, ignored, focus: null, rejected: entries.rejected };
}
