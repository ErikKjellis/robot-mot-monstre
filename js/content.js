// content.js - alt "innholdet": oppgraderinger, monstre, sjefer og nivaaer.
// Vil du gjoere spillet lettere eller vanskeligere er det her du skrur.

// ============================================================
//  OPPGRADERINGER (butikken)
// ============================================================
export const UPGRADES = [
  { key: 'dmg',    ico: '\u{1F4A5}', name: 'SKADE',  prices: [15, 30, 55, 90, 140] },
  { key: 'rate',   ico: '⚡',    name: 'SKYT',   prices: [12, 25, 45, 75, 120] },
  { key: 'speed',  ico: '\u{1F45F}', name: 'FART',   prices: [10, 20, 35, 60, 95] },
  { key: 'hp',     ico: '❤️', name: 'LIV', prices: [20, 40, 70, 110, 160] },
  { key: 'shield', ico: '\u{1F6E1}️', name: 'SKJOLD', prices: [25, 45, 75, 115, 165] },
  { key: 'magnet', ico: '\u{1F9F2}', name: 'MAGNET', prices: [8, 16, 30, 50, 80] },
];

export const MAX_LEVEL = 5; // hver oppgradering kan kjoepes 5 ganger

export function emptyUpgrades() {
  const u = {};
  UPGRADES.forEach((x) => (u[x.key] = 0));
  return u;
}

/** Regner ut robotens faktiske egenskaper ut fra oppgraderingsnivaaene. */
export function stats(up) {
  return {
    dmg: 2 + up.dmg * 2,                 // 2 .. 12
    cool: 0.42 - up.rate * 0.052,        // 0.42s .. 0.16s mellom skudd
    speed: 250 + up.speed * 32,          // 250 .. 410 px/s
    jump: 760 + up.speed * 26,           // hoppkraft
    maxHp: 3 + up.hp,                    // 3 .. 8 hjerter
    hasShield: up.shield > 0,
    shieldCool: 7 - up.shield,           // 6s .. 2s paa aa lade skjoldet
    magnet: 70 + up.magnet * 55,         // rekkevidde paa myntmagneten
  };
}

// ============================================================
//  MONSTRE
// ============================================================
// ai: 'walk'   = gaar mot roboten paa bakken
//     'fly'    = flyr i boelger mot roboten
//     'hop'    = hopper mot roboten
//     'shoot'  = holder avstand og skyter
//     'cast'   = kaster magi som foelger etter deg
export const ENEMIES = {
  slim:   { hp: 4,  sp: 52,  w: 46, h: 42, ai: 'hop',   coins: [1, 3], touch: 1, body: '#5fd36a', dark: '#2f8f44', eyes: 2, face: '\u{1F7E2}' },
  edder:  { hp: 4,  sp: 108, w: 50, h: 38, ai: 'walk',  coins: [2, 4], touch: 1, body: '#a06bf0', dark: '#5c3399', eyes: 4, legs: 6, face: '\u{1F577}️' },
  flagg:  { hp: 2,  sp: 100, w: 48, h: 34, ai: 'fly',   coins: [2, 4], touch: 1, body: '#7a86c8', dark: '#3e4680', wings: true, face: '\u{1F987}' },
  oye:    { hp: 10, sp: 40,  w: 50, h: 50, ai: 'shoot', coins: [4, 7], touch: 1, body: '#f472b6', dark: '#9d2c66', float: true, shotSpeed: 220, shotEvery: 2.1, face: '\u{1F441}️' },
  stein:  { hp: 26, sp: 42,  w: 66, h: 70, ai: 'walk',  coins: [6, 10], touch: 2, body: '#8d8577', dark: '#57514a', rocky: true, face: '\u{1FAA8}' },
  trollm: { hp: 16, sp: 50,  w: 50, h: 64, ai: 'cast',  coins: [6, 10], touch: 1, body: '#3ec7d6', dark: '#1d6d78', hood: true, shotSpeed: 150, shotEvery: 2.6, homing: true, face: '\u{1F9D9}' },
};

// ============================================================
//  SJEFER (en paa slutten av hvert nivaa)
// ============================================================
export const BOSSES = {
  slimking:  { hp: 55,  w: 130, h: 118, sp: 60,  body: '#4fd06a', dark: '#22713a', face: '\u{1F451}', crown: true, pattern: 'jump-spawn', coins: 45 },
  edderdron: { hp: 120, w: 150, h: 112, sp: 80,  body: '#a06bf0', dark: '#5c3399', face: '\u{1F578}️', legs: 8, pattern: 'spread',    coins: 65 },
  flaggkon:  { hp: 190, w: 150, h: 96,  sp: 130, body: '#6b78c8', dark: '#333b74', face: '\u{1F987}', wings: true, fly: true, pattern: 'dive-bomb', coins: 85 },
  steinkje:  { hp: 280, w: 160, h: 158, sp: 58,  body: '#8d8577', dark: '#4d4740', face: '\u{1F5FF}', rocky: true, pattern: 'slam',     coins: 110 },
  trollmes:  { hp: 380, w: 130, h: 150, sp: 95,  body: '#3ec7d6', dark: '#155a63', face: '\u{1F9D9}', hood: true, pattern: 'teleport-orb', coins: 140 },
  megamon:   { hp: 520, w: 190, h: 172, sp: 85,  body: '#ef4d5a', dark: '#8c1c28', face: '\u{1F479}', crown: true, horns: true, pattern: 'all-in',  coins: 200 },
};

// ============================================================
//  TEMAFARGER
// ============================================================
export const THEMES = {
  skrap: { sky: ['#2b3350', '#6a7aa4'], far: '#3c4668', mid: '#2b3450', ground: '#5b6455', ground2: '#414838', accent: '#9fe8ff', particle: '#cfd8e8' },
  skog:  { sky: ['#5ec6ff', '#c4efff'], far: '#357f4e', mid: '#1f5c37', ground: '#55913f', ground2: '#35642a', accent: '#ffe27a', particle: '#bff0a0' },
  hule:  { sky: ['#1a1030', '#3a2566'], far: '#3a2566', mid: '#281646', ground: '#4d3773', ground2: '#332250', accent: '#c48bff', particle: '#d8b4ff' },
  is:    { sky: ['#8fd4ff', '#e8f8ff'], far: '#86bfe8', mid: '#5f97cc', ground: '#cbe9ff', ground2: '#9dc8e8', accent: '#3aa0ee', particle: '#ffffff' },
  lava:  { sky: ['#3a0f12', '#a8391b'], far: '#61201a', mid: '#3d1210', ground: '#5f2d20', ground2: '#3c1b15', accent: '#ff9a3d', particle: '#ffb057' },
  rom:   { sky: ['#05060f', '#1d2350'], far: '#1b2050', mid: '#10142f', ground: '#2f3566', ground2: '#1e2348', accent: '#7ae6ff', particle: '#ffffff', stars: true },
};

// ============================================================
//  NIVAAENE
// ============================================================
// len    = hvor langt nivaaet er (piksler)
// mobs   = hvilke monstre og hvor mange
// coins  = loese mynter spredd utover
// root   = grunntone til musikken
export const LEVELS = [
  {
    theme: 'skrap', len: 4600, boss: 'slimking', coins: 24, root: 110,
    mobs: [['slim', 9], ['edder', 3]],
    preview: ['\u{1F7E2}', '\u{1F577}️'],
  },
  {
    theme: 'skog', len: 5200, boss: 'edderdron', coins: 28, root: 123,
    mobs: [['slim', 7], ['edder', 7], ['flagg', 5]],
    preview: ['\u{1F577}️', '\u{1F987}'],
  },
  {
    theme: 'hule', len: 5800, boss: 'flaggkon', coins: 32, root: 98,
    mobs: [['flagg', 9], ['edder', 6], ['oye', 4]],
    preview: ['\u{1F987}', '\u{1F441}️'],
  },
  {
    theme: 'is', len: 6200, boss: 'steinkje', coins: 34, root: 131,
    mobs: [['edder', 7], ['oye', 6], ['stein', 4], ['flagg', 4]],
    preview: ['\u{1F441}️', '\u{1FAA8}'],
  },
  {
    theme: 'lava', len: 6600, boss: 'trollmes', coins: 38, root: 104,
    mobs: [['stein', 6], ['oye', 7], ['trollm', 5], ['flagg', 5]],
    preview: ['\u{1FAA8}', '\u{1F9D9}'],
  },
  {
    theme: 'rom', len: 7000, boss: 'megamon', coins: 42, root: 87,
    mobs: [['trollm', 7], ['stein', 6], ['oye', 7], ['flagg', 7], ['edder', 6]],
    preview: ['\u{1F9D9}', '\u{1F479}'],
  },
];

/** Monstre blir litt seigere og gir litt mer mynt jo lenger ut i spillet du kommer. */
export function levelScale(i) {
  return { hp: 1 + i * 0.16, coin: 1 + i * 0.35 };
}
