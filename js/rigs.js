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
export const ROBOT_RIG = {
  mappe: 'art/robot',
  fyll: 1,
  variant: {
    'kropp': 'panser',
    'hode': 'laser',
    'arm-fram': 'kanon',
    'arm-bak': 'hammer',
    'bein-bak': 'bein',
    'bein-fram': 'bein',
    'rygg': 'jet',
  },
  deler: [
    d('rygg', 'ingen'),
    d('bein-bak', 'gaa', { fase: Math.PI }),
    d('arm-bak', 'slag'),
    d('kropp', 'duv'),
    d('bein-fram', 'gaa'),
    d('hode', 'nikk'),
    d('arm-fram', 'sikte'),
    d('vapen', 'sikte'),
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

export const MONSTER_RIGS = {
  // smaa monstre
  smaadrage:  M('smaadrage', tobeint),
  ildoegle:   M('ildoegle', firbeint),
  flygedrage: M('flygedrage', flygende, { fart: 10 }),
  steintroll: M('steintroll', klump),
  isoegle:    M('isoegle', firbeint),
  skyggedrage: M('skyggedrage', flygende, { fart: 7 }),

  // sjefer
  godzaur:     M('godzaur', tobeint),
  roddrage:    M('roddrage', flygende, { fart: 6 }),
  hydra:       M('hydra', tobeint),
  kolossen:    M('kolossen', klump),
  frostdragen: M('frostdragen', flygende, { fart: 6 }),
  kongedragen: M('kongedragen', tobeint),
};

export function rigFor(key) {
  return MONSTER_RIGS[key] || null;
}
