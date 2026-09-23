/* MapFix · ingest.js — Lecture des fichiers déposés (zip / dossier) et exemple de démonstration.
   Tout ce qui entre ici vient d'un inconnu : on borne les tailles, on nettoie les chemins, on bloque les exécutables. */
'use strict';

// Erreur dont le message est destiné à l'utilisateur (affiché tel quel)
class IngestError extends Error {}

// Chemins nettoyés (anti zip-slip), exécutables et doublons écartés. La liste des rejets est jointe pour informer l'utilisateur.
function finalizeEntries(raw) {
  const seen = new Set(), out = [], rejected = { blocked: [], badPath: 0, duplicate: 0 };
  for (const r of raw) {
    const path = sanitizePath(r.rawPath);
    if (!path) { rejected.badPath++; continue; }
    if (isBlockedFile(path)) { rejected.blocked.push(path); continue; }
    const key = path.toLowerCase();
    if (seen.has(key)) { rejected.duplicate++; continue; }   // deux chemins qui deviennent identiques après nettoyage
    seen.add(key);
    out.push({ path, size: r.size, header: r.header, blob: r.blob });
  }
  out.rejected = rejected;
  return out;
}

async function entriesFromZip(file) {
  if (file.size > LIMITS.zipBytes) throw new IngestError(t('i.zipBig', { s: fmtSize(file.size), m: fmtSize(LIMITS.zipBytes) }));
  let zip;
  try { zip = await JSZip.loadAsync(file); } catch { throw new IngestError(t('i.zipBad')); }
  const raw = []; let total = 0, packed = 0;
  zip.forEach((path, e) => {
    if (e.dir) return;
    if (raw.length >= LIMITS.entries) throw new IngestError(t('i.zipMany', { n: LIMITS.entries }));
    const size = e._data?.uncompressedSize || 0;   // API interne de JSZip 3.x ; vaut 0 si absente (les contrôles de taille sont alors partiels)
    total += size; packed += e._data?.compressedSize || 0;
    raw.push({
      rawPath: path, size,
      // on ne décompresse pas un gros fichier entier juste pour lire ses 8 premiers octets
      header: async () => size > LIMITS.headerReadBytes ? null : new Uint8Array((await e.async('uint8array')).slice(0, 8)),
      blob: () => e.async('blob'),
    });
  });
  if (total > LIMITS.uncompressedBytes) throw new IngestError(t('i.unpacked', { s: fmtSize(total), m: fmtSize(LIMITS.uncompressedBytes) }));
  if (total > LIMITS.ratioMinBytes && packed > 0 && total / packed > LIMITS.ratio) throw new IngestError(t('i.bomb'));
  return finalizeEntries(raw);
}

function entriesFromFolder(files) {
  files = [...files];
  if (files.length > LIMITS.entries) throw new IngestError(t('i.dirMany', { n: LIMITS.entries }));
  const total = files.reduce((t, f) => t + f.size, 0);
  if (total > LIMITS.uncompressedBytes) throw new IngestError(t('i.dirBig', { s: fmtSize(total), m: fmtSize(LIMITS.uncompressedBytes) }));
  return finalizeEntries(files.map(f => ({
    rawPath: f.webkitRelativePath || f.name, size: f.size,
    header: async () => new Uint8Array(await f.slice(0, 8).arrayBuffer()),
    blob: async () => f,
  })));
}

// Exemple de démonstration (aucun fichier réel) : 4 ressources, 1 sous escrow
function demoEntries() {
  const rsc7 = async () => new Uint8Array([0x52, 0x53, 0x43, 0x37, 0, 0, 0, 0]);
  const enc = async () => new Uint8Array([0x9a, 0x11, 0x4f, 0xd2, 7, 8, 9, 1]);
  const mk = (rawPath, size, header = rsc7, text = 'demo ' + rawPath) => ({ rawPath, size, header, blob: async () => new Blob([text]) });
  const escrowManifest = "fx_version 'cerulean'\ngame 'gta5'\nescrow_ignore {\n  'stream/deco_plant.ydr', -- lisible\n}\n";
  return finalizeEntries([
    mk('mlo_lspd_v2/fxmanifest.lua', 300, null),
    mk('mlo_lspd_v2/stream/lspd_int.ytyp', 12000),
    mk('mlo_lspd_v2/stream/lspd_walls.ydr', 520000),
    mk('mlo_lspd_v2/stream/shared_props.ytd', 800000),
    mk('mlo_lspd_v2/stream/lspd_col.ybn', 30000),
    mk('mlo_lspd_v2/stream/city_patch.ymap', 4100),
    mk('mlo_lspd_v2/stream/manifest_generator.ytd', 1000),
    mk('mlo_hospital/fxmanifest.lua', 300, null),
    mk('mlo_hospital/stream/hospital.ytyp', 9000),
    mk('mlo_hospital/stream/hospital_col.ybn', 22000),
    mk('mlo_hospital/stream/shared_props.ytd', 800000),
    mk('mlo_hospital/stream/props_chair.ydr', 90000),
    mk('mlo_hospital/stream/manifest_generator.ytd', 1200),
    mk('mlo_bank/fxmanifest.lua', 300, null),
    mk('mlo_bank/stream/bank_int.ytyp', 7000),
    mk('mlo_bank/stream/deco_plant.ydr', 41000),
    mk('pack_props_premium/fxmanifest.lua', 300, null, escrowManifest),
    mk('pack_props_premium/stream/_manifest.ymf', 800, enc),
    mk('mlo_hospital/stream/_manifest.ymf', 700),
    mk('pack_props_premium/.fxap', 400, null),
    mk('pack_props_premium/stream/props_chair.ydr', 95000, enc),
    mk('pack_props_premium/stream/shared_props.ytd', 810000, enc),
    mk('pack_props_premium/stream/city_patch.ymap', 4300, enc),
    mk('pack_props_premium/stream/deco_plant.ydr', 41000, enc),
  ]);
}
