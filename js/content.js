// content.js - alt "innholdet": oppgraderinger, monstre, sjefer og nivaaer.
// Vil du gjoere spillet lettere eller vanskeligere er det her du skrur.

// ============================================================
//  OPPGRADERINGER
//  Hver av dem bytter ut en synlig kroppsdel paa roboten, og
//  roboten blir stoerre for hver eneste oppgradering du kjoeper.
// ============================================================
export const UPGRADES = [
  { key: 'kanon',  ico: '\u{1F52B}', name: 'KANON',  del: 'arm-fram', prices: [18, 38, 70, 115, 175] },
  { key: 'laser',  ico: '\u{1F441}️', name: 'LASER', del: 'hode', prices: [30, 55, 90, 140, 210] },
  { key: 'hammer', ico: '\u{1F528}', name: 'HAMMER', del: 'arm-bak', prices: [25, 48, 82, 130, 195] },
  { key: 'bein',   ico: '\u{1F9BF}', name: 'BEIN',   del: 'bein',     prices: [14, 28, 48, 78, 120] },
  { key: 'panser', ico: '\u{1F6E1}️', name: 'PANSER', del: 'kropp', prices: [22, 44, 78, 124, 185] },
  { key: 'jet',    ico: '\u{1F680}', name: 'JET',    del: 'rygg',     prices: [20, 40, 70, 110, 165] },
];

export const MAX_LEVEL = 5;

export function emptyUpgrades() {
  const u = {};
  UPGRADES.forEach((x) => (u[x.key] = 0));
  return u;
}

export function totalLevels(up) {
  return UPGRADES.reduce((s, u) => s + (up[u.key] || 0), 0);
}

/** Robotens faktiske egenskaper ut fra oppgraderingsnivaaene. */
export function stats(up) {
  const total = totalLevels(up);
  return {
    // KANON - hovedvaapenet: hardere og raskere
    dmg: 2 + up.kanon * 2.4,
    cool: 0.44 - up.kanon * 0.05,        // 0.44s -> 0.19s

    // LASER - skyter av seg selv mot naermeste monster
    laser: up.laser,
    laserDmg: up.laser * 3.5,
    laserEvery: 3.4 - up.laser * 0.36,   // 3.0s -> 1.6s

    // HAMMER - smeller automatisk paa alt som kommer for naerme
    hammer: up.hammer,
    hammerDmg: up.hammer * 4.5,
    hammerRange: 26 + up.hammer * 13,
    hammerEvery: 1.5 - up.hammer * 0.13,

    // BEIN - fart og hopp
    speed: 240 + up.bein * 32,
    jump: 740 + up.bein * 30,

    // PANSER - hjerter og skjold
    maxHp: 3 + Math.ceil(up.panser * 0.8),   // 3 -> 7
    hasShield: up.panser >= 2,
    shieldCool: 9 - up.panser,

    // JET - ekstra hopp i lufta
    jumps: 1 + (up.jet > 0 ? 1 : 0) + (up.jet >= 4 ? 1 : 0),
    jetPower: 0.62 + up.jet * 0.05,

    // vokser med ALT du kjoeper
    magnet: 90 + total * 9,
    size: 50 + total * 2.3,              // robothoeyde: 50 -> 119 piksler
    total,
  };
}

// ============================================================
//  MONSTRE
// ============================================================
// ai: 'walk'  gaar mot deg      'hop' hopper mot deg
//     'fly'   flyr mot deg (spytter ild hvis den har shotEvery)
//     'shoot' holder avstand og skyter
//     'cast'  kaster magi som svinger etter deg
export const ENEMIES = {
  smaadrage:   { hp: 5,  sp: 58,  w: 56, h: 52, ai: 'hop',   coins: [2, 4],  touch: 1, body: '#5fd36a', dark: '#2f8f44', face: '\u{1F432}' },
  ildoegle:    { hp: 5,  sp: 118, w: 64, h: 46, ai: 'walk',  coins: [2, 5],  touch: 1, body: '#f0743c', dark: '#9c3a12', face: '\u{1F98E}' },
  flygedrage:  { hp: 4,  sp: 108, w: 68, h: 50, ai: 'fly',   coins: [3, 6],  touch: 1, body: '#7a86c8', dark: '#3e4680', face: '\u{1F409}', shotSpeed: 250, shotEvery: 2.6, shotColor: '#ff9a3d' },
  isoegle:     { hp: 13, sp: 46,  w: 66, h: 60, ai: 'shoot', coins: [5, 9],  touch: 1, body: '#6fd6ef', dark: '#2a7f96', face: '\u{1F9CA}', shotSpeed: 250, shotEvery: 2.2, shotColor: '#bdf0ff' },
  steintroll:  { hp: 32, sp: 46,  w: 82, h: 88, ai: 'walk',  coins: [8, 13], touch: 2, body: '#8d8577', dark: '#57514a', face: '\u{1F5FF}' },
  skyggedrage: { hp: 20, sp: 60,  w: 74, h: 66, ai: 'cast',  coins: [8, 13], touch: 1, body: '#8b5cf6', dark: '#4c2a8f', face: '\u{1F311}', shotSpeed: 165, shotEvery: 2.7, shotColor: '#c9a3ff' },
};

// ============================================================
//  SJEFER - kjempestore, en paa slutten av hvert nivaa
// ============================================================
export const BOSSES = {
  godzaur:     { hp: 40,  w: 200, h: 180, sp: 56,  body: '#4f8f5a', dark: '#23512d', face: '\u{1F996}', pattern: 'slam',         coins: 65 },
  roddrage:    { hp: 130, w: 250, h: 150, sp: 125, body: '#e04b3a', dark: '#8c1c14', face: '\u{1F409}', fly: true, pattern: 'dive-bomb', coins: 100 },
  hydra:       { hp: 200, w: 220, h: 190, sp: 80,  body: '#3fb98a', dark: '#1a6b4d', face: '\u{1F40D}', pattern: 'spread',       coins: 145 },
  frostdragen: { hp: 300, w: 225, h: 200, sp: 98,  body: '#7fd8f0', dark: '#256f8a', face: '❄️', fly: true, pattern: 'teleport-orb', coins: 200 },
  kolossen:    { hp: 400, w: 235, h: 225, sp: 60,  body: '#a06a4a', dark: '#5a3624', face: '\u{1F5FF}', pattern: 'jump-spawn',   coins: 265 },
  kongedragen: { hp: 560, w: 290, h: 250, sp: 90,  body: '#f0a63c', dark: '#8a520c', face: '\u{1F451}', pattern: 'all-in',       coins: 360 },
};

// ============================================================
//  TEMAFARGER
//  form: hva silhuettene i bakgrunnen er - 'hus', 'tre', 'spiss', 'fjell'
// ============================================================
export const THEMES = {
  by:    { sky: ['#2b3350', '#7a6a94'], far: '#3c4668', mid: '#232b48', ground: '#4a4f5e', ground2: '#343846', accent: '#9fe8ff', particle: '#cfd8e8', form: 'hus' },
  skog:  { sky: ['#5ec6ff', '#c4efff'], far: '#357f4e', mid: '#1f5c37', ground: '#55913f', ground2: '#35642a', accent: '#ffe27a', particle: '#bff0a0', form: 'tre' },
  hule:  { sky: ['#1a1030', '#3a2566'], far: '#3a2566', mid: '#281646', ground: '#4d3773', ground2: '#332250', accent: '#c48bff', particle: '#d8b4ff', form: 'spiss' },
  is:    { sky: ['#8fd4ff', '#e8f8ff'], far: '#86bfe8', mid: '#5f97cc', ground: '#cbe9ff', ground2: '#9dc8e8', accent: '#3aa0ee', particle: '#ffffff', form: 'spiss' },
  lava:  { sky: ['#3a0f12', '#a8391b'], far: '#61201a', mid: '#3d1210', ground: '#5f2d20', ground2: '#3c1b15', accent: '#ff9a3d', particle: '#ffb057', form: 'fjell' },
  rom:   { sky: ['#05060f', '#1d2350'], far: '#1b2050', mid: '#10142f', ground: '#2f3566', ground2: '#1e2348', accent: '#7ae6ff', particle: '#ffffff', form: 'fjell', stars: true },
};

// ============================================================
//  NIVAAENE
// ============================================================
export const LEVELS = [
  {
    theme: 'by', len: 4600, boss: 'godzaur', coins: 26, root: 110,
    mobs: [['smaadrage', 9], ['ildoegle', 4]],
    preview: ['\u{1F432}', '\u{1F996}'],
  },
  {
    theme: 'skog', len: 5200, boss: 'roddrage', coins: 30, root: 123,
    mobs: [['smaadrage', 7], ['ildoegle', 7], ['flygedrage', 5]],
    preview: ['\u{1F98E}', '\u{1F409}'],
  },
  {
    theme: 'hule', len: 5800, boss: 'hydra', coins: 34, root: 98,
    mobs: [['flygedrage', 8], ['ildoegle', 6], ['isoegle', 5]],
    preview: ['\u{1F409}', '\u{1F40D}'],
  },
  {
    theme: 'is', len: 6200, boss: 'frostdragen', coins: 36, root: 131,
    mobs: [['isoegle', 7], ['flygedrage', 6], ['steintroll', 4], ['smaadrage', 4]],
    preview: ['\u{1F9CA}', '❄️'],
  },
  {
    theme: 'lava', len: 6600, boss: 'kolossen', coins: 40, root: 104,
    mobs: [['steintroll', 6], ['ildoegle', 7], ['skyggedrage', 5], ['flygedrage', 5]],
    preview: ['\u{1F5FF}', '\u{1F5FF}'],
  },
  {
    theme: 'rom', len: 7000, boss: 'kongedragen', coins: 44, root: 87,
    mobs: [['skyggedrage', 7], ['steintroll', 6], ['isoegle', 6], ['flygedrage', 7], ['ildoegle', 6]],
    preview: ['\u{1F311}', '\u{1F451}'],
  },
];

/** Monstre blir seigere og gir mer mynt jo lenger ut i spillet du kommer. */
export function levelScale(i) {
  return { hp: 1 + i * 0.18, coin: 1 + i * 0.42 };
}
