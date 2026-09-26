// rigs.js - hvilke kroppsdeler hver figur har, og hvordan de beveger seg.
//
// Vil du lage din egen figur: finn rigen under, se hvilke deler den bruker,
// og lag en PNG med akkurat det navnet i mappa som staar i "mappe".
// Mangler en del, hopper spillet bare over den.
//
//   z          = hva som ligger foran hva (hoeyere tall = naermere deg)
//   beveg      = hvordan delen animeres (se MOVES i sprites.js)
//   fase       = forskyver bevegelsen, saa hoeyre og venstre bein gaar i utakt
//   dreiepunkt = [x, y] som andel av bildet. Der delen henger fast og roterer.

const Z = {
  'vinge-bak': -40, 'hale': -35, 'rygg': -30, 'bein-bak': -20, 'arm-bak': -10,
  'kropp': 0, 'bein-fram': 10, 'hode': 20, 'arm-fram': 30, 'vapen': 35, 'vinge-fram': 40,
};

const d = (navn, beveg, extra) => Object.assign({ navn, z: Z[navn] ?? 0, beveg }, extra || {});

// ============================================================
//  ROBOTEN
// ============================================================
// Hver oppgradering kan bytte ut en kroppsdel. Kjoeper du kanon niva 3
// leter spillet etter arm-fram-kanon3.png, saa -kanon2, -kanon1, og til
// slutt arm-fram.png. Du kan altsaa lage bare en, eller alle fem.
// Delene er tegnet hver for seg, saa riggen sier hvor paa roboten hver av
// dem hoerer hjemme. Alle tall er andeler av robotens hoeyde, med (0,0) midt
// mellom foettene og y negativt oppover.
//   plass  { x, y, h }  senter og hoeyde paa delen
//   anker  [x, y]       punktet delen roterer om (skulder, hofte, nakke)
//   krever 'kanon'      delen vises foerst naar oppgraderingen er kjoept
const SKULDER = [0.02, -0.72];   // der armene henger fast
const HOFTE = [0.0, -0.46];      // der beina henger fast
const HAAND_F = [0.20, -0.44];   // fremre haand
const HAAND_B = [-0.14, -0.44];  // bakre haand

export const ROBOT_RIG = {
  mappe: 'art/robot',
  plassert: true,
  variant: {
    'kropp': 'panser',
    'hode': 'laser',
    'arm-fram': 'kanon',
    'arm-bak': 'hammer',
    'bein-bak': 'bein',
    'bein-fram': 'bein',
    'rygg': 'jet',
    'vapen': 'kanon',
    'hammer': 'hammer',
  },
  // Deler som har et eget bilde i en bestemt tilstand: naar roboten flyr, brukes
  // rygg-jet3-flamme.png (jetpakken med flammer) i stedet for rygg-jet3.png.
  tilstander: { rygg: ['flamme'] },
  deler: [
    // jetpack paa ryggen - godt ut til venstre saa den stikker ut bak kroppen
    { navn: 'rygg', z: -40, beveg: 'ingen', krever: 'jet', speil: true,
      fest: [0.5, 0.5], paa: [-0.31, -0.66], h: 0.34 },

    // bakre bein - hofteleddet er oeverst i bildet
    { navn: 'bein-bak', z: -20, beveg: 'gaa', fase: Math.PI, styrke: 0.34,
      fest: [0.55, 0.07], paa: [-0.10, -0.46], h: 0.50 },

    // bakre arm - skulderen er oeverst i bildet
    { navn: 'arm-bak', z: -10, beveg: 'slag',
      fest: [0.55, 0.08], paa: [-0.12, -0.70], h: 0.42 },

    // Hammeren holdes i bakre haand og svinger om skulderen. Den speilvendes
    // saa hodet peker opp BAK roboten - ellers forsvinner den bak kroppen.
    { navn: 'hammer', z: -8, beveg: 'slag', krever: 'hammer', speil: true,
      fest: [0.12, 0.86], paa: [-0.20, -0.46], omkring: SKULDER, h: 0.50, vinkel: 0.25 },

    // kroppen er tegnet med brystet mot venstre, saa den speilvendes
    { navn: 'kropp', z: 0, beveg: 'duv', speil: true,
      fest: [0.5, 0.5], paa: [0, -0.62], h: 0.42 },

    { navn: 'bein-fram', z: 10, beveg: 'gaa', styrke: 0.34,
      fest: [0.60, 0.07], paa: [0.08, -0.46], h: 0.50 },

    { navn: 'hode', z: 20, beveg: 'nikk',
      fest: [0.42, 0.92], paa: [0.02, -0.80], h: 0.28 },

    // fremre arm - skulderen er oeverst til venstre i bildet
    { navn: 'arm-fram', z: 30, beveg: 'sikte',
      fest: [0.16, 0.10], paa: SKULDER, h: 0.44 },

    // kanonen holdes i fremre haand og peker mot hoeyre
    { navn: 'vapen', z: 35, beveg: 'sikte', krever: 'kanon',
      fest: [0.12, 0.5], paa: HAAND_F, omkring: SKULDER, h: 0.19 },
  ],
};

// ============================================================
//  MONSTRE
// ============================================================

/** Tobeint kjempe - godzilla-typen: to bein, to armer, hale. */
function tobeint(mappe, o = {}) {
  return {
    mappe, fyll: o.fyll ?? 1,
    deler: [
      d('hale', 'hale'),
      d('bein-bak', 'gaa', { fase: Math.PI, styrke: 0.34 }),
      d('arm-bak', 'sving', { styrke: 0.24 }),
      d('kropp', 'duv'),
      d('bein-fram', 'gaa', { styrke: 0.34 }),
      d('hode', 'nikk'),
      d('arm-fram', 'sving', { fase: 0, styrke: 0.24 }),
    ],
  };
}

/** Flygende drage - vinger som flakser, bein som henger. */
function flygende(mappe, o = {}) {
  return {
    mappe, fyll: o.fyll ?? 1,
    deler: [
      d('vinge-bak', 'vinge', { fart: o.fart ?? 8, fase: 0.4, styrke: 0.5 }),
      d('hale', 'hale', { styrke: 0.26 }),
      d('bein-bak', 'sving', { styrke: 0.14 }),
      d('kropp', 'duv'),
      d('bein-fram', 'sving', { fase: 0.6, styrke: 0.14 }),
      d('hode', 'nikk'),
      d('vinge-fram', 'vinge', { fart: o.fart ?? 8, styrke: 0.6 }),
    ],
  };
}

/** Firbeint oegle - fire bein, lang hale, ingen armer. */
function firbeint(mappe, o = {}) {
  return {
    mappe, fyll: o.fyll ?? 1,
    deler: [
      d('hale', 'hale', { styrke: 0.22 }),
      d('bein-bak', 'gaa', { fase: Math.PI, styrke: 0.38 }),
      d('arm-bak', 'gaa', { fase: 0.6, styrke: 0.38 }),
      d('kropp', 'duv'),
      d('bein-fram', 'gaa', { styrke: 0.38 }),
      d('arm-fram', 'gaa', { fase: Math.PI + 0.6, styrke: 0.38 }),
      d('hode', 'nikk'),
    ],
  };
}

/** Klump uten bein - troll, stein, slim. Duver og vrikker. */
function klump(mappe, o = {}) {
  return {
    mappe, fyll: o.fyll ?? 1,
    deler: [
      d('bein-bak', 'gaa', { fase: Math.PI, styrke: 0.22 }),
      d('arm-bak', 'sving', { styrke: 0.3 }),
      d('kropp', 'duv'),
      d('bein-fram', 'gaa', { styrke: 0.22 }),
      d('hode', 'nikk'),
      d('arm-fram', 'sving', { fase: 0, styrke: 0.3 }),
    ],
  };
}

// Mappenavn = art/monstre/<noekkel>
const M = (key, maker, o) => maker('art/monstre/' + key, o);

/**
 * Smaadragen er tegnet som loese deler, saa den bruker plassert rigg.
 * Finjuster den i verktoy/rigger.html - da lagres art/monstre/smaadrage/rigg.json
 * og den overstyrer disse tallene.
 */
const SMAADRAGE = {
  mappe: 'art/monstre/smaadrage',
  plassert: true,
  deler: [
    { navn: 'hale', z: -35, beveg: 'hale', styrke: 0.22,
      fest: [0.94, 0.5], paa: [-0.26, -0.50], h: 0.22 },
    { navn: 'bein-bak', z: -20, beveg: 'gaa', fase: Math.PI, styrke: 0.32,
      fest: [0.50, 0.08], paa: [-0.10, -0.44], h: 0.54 },
    { navn: 'arm-bak', z: -10, beveg: 'sving', styrke: 0.24,
      fest: [0.50, 0.10], paa: [0.02, -0.58], h: 0.26 },
    { navn: 'kropp', z: 0, beveg: 'duv',
      fest: [0.5, 0.5], paa: [0, -0.46], h: 0.62 },
    { navn: 'bein-fram', z: 10, beveg: 'gaa', styrke: 0.32,
      fest: [0.45, 0.08], paa: [0.10, -0.42], h: 0.52 },
    { navn: 'hode', z: 20, beveg: 'nikk',
      fest: [0.08, 0.58], paa: [0.22, -0.70], h: 0.46 },
    { navn: 'arm-fram', z: 30, beveg: 'sving', fase: 0, styrke: 0.24,
      fest: [0.50, 0.12], paa: [0.18, -0.56], h: 0.20 },
  ],
};

/** Flygedragen - kroppen er tegnet med halsen mot venstre, saa den speilvendes. */
const FLYGEDRAGE = {
  mappe: 'art/monstre/flygedrage',
  plassert: true,
  deler: [
    { navn: 'vinge-bak', z: -40, beveg: 'vinge', fart: 8, fase: 0.4, styrke: 0.5,
      fest: [0.88, 0.86], paa: [-0.04, -0.72], h: 0.50 },
    { navn: 'hale', z: -35, beveg: 'hale', styrke: 0.26,
      fest: [0.96, 0.5], paa: [-0.30, -0.58], h: 0.13 },
    { navn: 'bein-bak', z: -20, beveg: 'sving', styrke: 0.16,
      fest: [0.50, 0.06], paa: [-0.10, -0.44], h: 0.34 },
    { navn: 'arm-bak', z: -10, beveg: 'sving', styrke: 0.18,
      fest: [0.50, 0.10], paa: [0.08, -0.54], h: 0.26 },
    { navn: 'kropp', z: 0, beveg: 'duv', speil: true,
      fest: [0.5, 0.5], paa: [0, -0.56], h: 0.30 },
    { navn: 'bein-fram', z: 10, beveg: 'sving', fase: 0.6, styrke: 0.16,
      fest: [0.50, 0.06], paa: [0.06, -0.42], h: 0.34 },
    { navn: 'arm-fram', z: 15, beveg: 'sving', fase: 0.3, styrke: 0.18,
      fest: [0.22, 0.22], paa: [0.18, -0.50], h: 0.24 },
    { navn: 'hode', z: 20, beveg: 'nikk',
      fest: [0.18, 0.80], paa: [0.30, -0.70], h: 0.46 },
    { navn: 'vinge-fram', z: 40, beveg: 'vinge', fart: 8, styrke: 0.6,
      fest: [0.88, 0.86], paa: [0.03, -0.70], h: 0.56 },
  ],
};

/** Ildoeglen gaar paa fire - arm-delene er frambeina. Kroppen speilvendes. */
const ILDOEGLE = {
  mappe: 'art/monstre/ildoegle',
  plassert: true,
  deler: [
    { navn: 'hale', z: -35, beveg: 'hale', styrke: 0.2,
      fest: [0.95, 0.5], paa: [-0.28, -0.58], h: 0.16 },
    { navn: 'bein-bak', z: -25, beveg: 'gaa', fase: Math.PI, styrke: 0.3,
      fest: [0.50, 0.08], paa: [-0.18, -0.52], h: 0.50 },
    { navn: 'arm-bak', z: -15, beveg: 'gaa', fase: 0.6, styrke: 0.3,
      fest: [0.30, 0.12], paa: [0.14, -0.50], h: 0.44 },
    { navn: 'kropp', z: 0, beveg: 'duv', speil: true,
      fest: [0.5, 0.5], paa: [0, -0.58], h: 0.36 },
    { navn: 'bein-fram', z: 10, beveg: 'gaa', styrke: 0.3,
      fest: [0.50, 0.08], paa: [-0.08, -0.50], h: 0.50 },
    { navn: 'arm-fram', z: 20, beveg: 'gaa', fase: Math.PI + 0.6, styrke: 0.3,
      fest: [0.22, 0.18], paa: [0.22, -0.48], h: 0.44 },
    { navn: 'hode', z: 30, beveg: 'nikk',
      fest: [0.12, 0.78], paa: [0.28, -0.68], h: 0.44 },
  ],
};

/** Isoegla gaar ogsaa paa fire. */
const ISOEGLE = {
  mappe: 'art/monstre/isoegle',
  plassert: true,
  deler: [
    { navn: 'hale', z: -35, beveg: 'hale', styrke: 0.2,
      fest: [0.95, 0.5], paa: [-0.26, -0.56], h: 0.15 },
    { navn: 'bein-bak', z: -25, beveg: 'gaa', fase: Math.PI, styrke: 0.3,
      fest: [0.45, 0.08], paa: [-0.16, -0.52], h: 0.46 },
    { navn: 'arm-bak', z: -15, beveg: 'gaa', fase: 0.6, styrke: 0.3,
      fest: [0.55, 0.08], paa: [0.12, -0.50], h: 0.46 },
    { navn: 'kropp', z: 0, beveg: 'duv', speil: true,
      fest: [0.5, 0.5], paa: [0, -0.55], h: 0.32 },
    { navn: 'bein-fram', z: 10, beveg: 'gaa', styrke: 0.3,
      fest: [0.45, 0.08], paa: [-0.06, -0.50], h: 0.42 },
    { navn: 'arm-fram', z: 20, beveg: 'gaa', fase: Math.PI + 0.6, styrke: 0.3,
      fest: [0.45, 0.08], paa: [0.20, -0.48], h: 0.46 },
    { navn: 'hode', z: 30, beveg: 'nikk',
      fest: [0.12, 0.80], paa: [0.26, -0.64], h: 0.40 },
  ],
};

/** Kolossen - sjefen paa nivaa 5. Mosegrodd steinkjempe. */
const KOLOSSEN = {
  mappe: 'art/monstre/kolossen',
  plassert: true,
  deler: [
    { navn: 'bein-bak', z: -25, beveg: 'gaa', fase: Math.PI, styrke: 0.24,
      fest: [0.48, 0.10], paa: [-0.11, -0.40], h: 0.44 },
    { navn: 'arm-bak', z: -15, beveg: 'sving', styrke: 0.26,
      fest: [0.50, 0.12], paa: [-0.17, -0.72], h: 0.46 },
    { navn: 'kropp', z: 0, beveg: 'duv',
      fest: [0.5, 0.5], paa: [0, -0.58], h: 0.42 },
    { navn: 'bein-fram', z: 10, beveg: 'gaa', styrke: 0.24,
      fest: [0.48, 0.10], paa: [0.09, -0.38], h: 0.44 },
    { navn: 'hode', z: 20, beveg: 'nikk',
      fest: [0.50, 0.88], paa: [0.05, -0.78], h: 0.36 },
    { navn: 'arm-fram', z: 30, beveg: 'sving', fase: 0, styrke: 0.26,
      fest: [0.50, 0.12], paa: [0.19, -0.70], h: 0.48 },
  ],
};

/**
 * Skyggedragen. Halen og vingene er tegnet med festet mot venstre, saa de
 * speilvendes for aa svinge bakover naar dragen ser mot hoeyre.
 */
const SKYGGEDRAGE = {
  mappe: 'art/monstre/skyggedrage',
  plassert: true,
  deler: [
    { navn: 'vinge-bak', z: -40, beveg: 'vinge', fart: 7, fase: 0.4, styrke: 0.42,
      speil: true, fest: [0.07, 0.74], paa: [-0.04, -0.66], h: 0.40 },
    { navn: 'hale', z: -35, beveg: 'hale', styrke: 0.24, speil: true,
      fest: [0.05, 0.5], paa: [-0.13, -0.50], h: 0.13 },
    { navn: 'bein-bak', z: -20, beveg: 'sving', styrke: 0.18,
      fest: [0.50, 0.08], paa: [-0.04, -0.36], h: 0.30 },
    { navn: 'kropp', z: 0, beveg: 'duv',
      fest: [0.5, 0.5], paa: [0, -0.52], h: 0.38 },
    { navn: 'bein-fram', z: 10, beveg: 'sving', fase: 0.6, styrke: 0.18,
      fest: [0.50, 0.08], paa: [0.08, -0.34], h: 0.30 },
    { navn: 'hode', z: 20, beveg: 'nikk',
      fest: [0.14, 0.80], paa: [0.23, -0.62], h: 0.32 },
    { navn: 'vinge-fram', z: 40, beveg: 'vinge', fart: 7, styrke: 0.5,
      speil: true, fest: [0.07, 0.74], paa: [0.03, -0.63], h: 0.44 },
  ],
};

export const MONSTER_RIGS = {
  // smaa monstre
  smaadrage: SMAADRAGE,
  skyggedrage: SKYGGEDRAGE,
  flygedrage: FLYGEDRAGE,
  ildoegle: ILDOEGLE,
  isoegle: ISOEGLE,
  steintroll: M('steintroll', klump),

  // sjefer
  godzaur:     M('godzaur', tobeint),
  roddrage:    M('roddrage', flygende, { fart: 6 }),
  hydra:       M('hydra', firbeint),   // gaar paa fire - arm-delene er frambeina
  kolossen: KOLOSSEN,
  frostdragen: M('frostdragen', flygende, { fart: 6 }),
  kongedragen: M('kongedragen', tobeint),
};

export function rigFor(key) {
  return MONSTER_RIGS[key] || null;
}
