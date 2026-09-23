/* MapFix · config.js — Configuration et constantes.
   Le site ne parle à aucun serveur : tout se passe dans le navigateur, et l'échange avec le client
   se fait par un fichier de récapitulatif qu'on s'envoie soi-même sur Discord. Rien à héberger. */
'use strict';

const CONFIG = {
  discordInvite: 'https://discord.gg/mapfix',   // lien d'invitation (ex. https://discord.gg/xxxx) : active le bouton Discord du header
  showDemo: false,     // true = affiche le bouton « Exemple » (charge de fausses ressources pour tester)
};

// Limites de robustesse (protection contre les archives piégées, les saisies abusives, la surcharge)
const LIMITS = {
  zipBytes: 1.5e9,            // taille max d'une archive .zip déposée
  entries: 30000,             // nombre max de fichiers
  uncompressedBytes: 6e9,     // taille décompressée totale max
  ratio: 200,                 // rapport décompressé/compressé max (au-delà : « bombe » de décompression)
  ratioMinBytes: 2e8,         // le contrôle de ratio ne s'applique qu'au-dessus de cette taille
  headerReadBytes: 32e6,      // on ne décompresse pas un fichier plus gros juste pour lire son en-tête
  pathLength: 260, nameLength: 200,
  pseudo: [2, 40], message: 1000,
  patterns: 100, patternLength: 120, wildcards: 6,    // motifs d'ignore / escrow_ignore
  maxDeadlineDays: 366,
  matchBudget: 3e8,           // budget de calcul pour la comparaison de motifs (anti-lenteur)
  recapConflicts: 20000, recapResources: 2000,        // bornes à la relecture d'un récapitulatif importé
};

// Fichiers exécutables : jamais listés dans le récapitulatif (défense en profondeur si un jour on rouvre l'envoi de fichiers)
const BLOCKED_EXT = ['exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'msi', 'msp', 'ps1', 'psm1', 'vbs', 'vbe', 'wsf', 'lnk', 'hta', 'jar', 'reg', 'cpl'];

const EXT_RE = /^[a-z0-9]{2,8}$/;
const BINARY_EXT = ['ydr', 'ydd', 'yft', 'ytd', 'ybn', 'ycd'];   // doivent commencer par RSC7 si non chiffrés

// Réglages de prix et d'analyse. Pas de panneau d'administration : si tu veux changer un prix ou une règle,
// modifie directement les valeurs ci-dessous (le site est rechargé, pas besoin de rien redéployer d'autre).
const DEFAULTS = {
  exts: {   // types de fichiers analysés (on) et marqués critiques (crit)
    ydr: { on: true, crit: false }, ydd: { on: true, crit: false }, yft: { on: true, crit: false },
    ytd: { on: true, crit: false }, ybn: { on: true, crit: true },  ymap: { on: true, crit: true },
    ytyp: { on: true, crit: true }, ycd: { on: true, crit: false }, ynv: { on: true, crit: false },
    ymt: { on: true, crit: false }, ymf: { on: true, crit: false }, ynd: { on: true, crit: false },
  },
  readable: ['ytyp', 'ymap', 'ybn', 'ymf'],   // types qui ne sont jamais cryptés (escrow ne les touche pas)
  billBy: 'set',      // 'set' = 1 conflit par groupe de ressources identique · 'file' = 1 conflit par fichier
  conflictBase: 10,   // prix d'un conflit entre 2 ressources
  extraResource: 5,   // + par ressource supplémentaire sur le même fichier (3 ressources = 15 €, 4 = 20 €…)
  lockedExtra: 0,      // supplément si le conflit implique une ressource cryptée (0 = désactivé)
  expressPct: 15,      // majoration express
  minOrder: 5,         // minimum facturé dès qu'au moins un conflit est coché
  ignore: ['fxmanifest.lua', '__resource.lua', '_manifest.ymf', '*generator*', '*.md', '*.txt'],   // _manifest.ymf : présent dans presque tous les MLO, ce n'est pas un vrai conflit
};
