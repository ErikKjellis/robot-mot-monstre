// lag-startrigg.js - lager en rigg.json aa starte med for en figur av loese deler.
//
//   node verktoy/lag-startrigg.js art/monstre/roddrage flygende
//   node verktoy/lag-startrigg.js art/monstre/godzaur tobeint --vis godzaur.png
//
// Kroppstyper: tobeint, flygende, firbeint, klump.
// Verktoeyet finner leddene i bildene selv - toppen av beina og armene,
// halsenden paa hodet, den tykke enden av halen, vingeroten - og fester dem
// paa kroppen der de hoerer hjemme. Beina blir akkurat lange nok til aa naa
// bakken. Resultatet er et UTGANGSPUNKT: finjuster i verktoy/rigger.html.
//
// Alle deler maa vende mot hoeyre. Fila skrives ikke over hvis den finnes
// fra foer (bruk --overskriv). --ut <fil> skriver et annet sted, --vis <png>
// tegner figuren i hvile og i begge ytterstillinger.

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');

// ------------------------------------------------------------------
//  Maal i bildene (0-1 i delens eget bilde)
// ------------------------------------------------------------------
function maske(im) {
  const m = new Uint8Array(im.w * im.h);
  for (let k = 0; k < m.length; k++) m[k] = im.px[k * 4 + 3] > 40 ? 1 : 0;
  return m;
}

/** Tyngdepunktet til de synlige pikslene i et rektangel (0-1). */
function senter(del, x0, y0, x1, y1) {
  const { im, m } = del;
  let sx = 0, sy = 0, n = 0;
  for (let y = Math.floor(y0 * im.h); y < Math.ceil(y1 * im.h); y++) {
    for (let x = Math.floor(x0 * im.w); x < Math.ceil(x1 * im.w); x++) {
      if (m[y * im.w + x]) { sx += x; sy += y; n++; }
    }
  }
  return n ? [sx / n / im.w, sy / n / im.h] : [(x0 + x1) / 2, (y0 + y1) / 2];
}

const LEDD = {
  topp: (d) => [senter(d, 0, 0, 1, 0.12)[0], 0.08],          // toppen av bein og armer
  bunn: (d) => [senter(d, 0, 0.85, 1, 1)[0], 0.9],           // halsenden paa hodet
  hoyre: (d) => [0.94, senter(d, 0.88, 0, 1, 1)[1]],         // tykk haleende, vingerot
  midt: () => [0.5, 0.5],
};

/** Oeverste / nederste synlige piksel i en kolonne av kroppen (0-1). */
function kant(d, u, fra) {
  const { im, m } = d;
  const x = Math.min(im.w - 1, Math.max(0, Math.round(u * im.w)));
  if (fra === 'topp') { for (let y = 0; y < im.h; y++) if (m[y * im.w + x]) return y / im.h; return 0.5; }
  for (let y = im.h - 1; y >= 0; y--) if (m[y * im.w + x]) return y / im.h;
  return 0.5;
}
function venstreKant(d, v) {
  const { im, m } = d;
  const y = Math.min(im.h - 1, Math.round(v * im.h));
  for (let x = 0; x < im.w; x++) if (m[y * im.w + x]) return x / im.w;
  return 0;
}

// ------------------------------------------------------------------
//  Kroppstyper. Plass paa kroppen: u bortover, og enten 'topp'/'bunn' + et
//  lite stykke inn fra kanten, eller 'venstre' for halen.
//  h = hoeyde (andel av figuren), 'bakke' = lang nok til aa naa bakken.
// ------------------------------------------------------------------
const TYPER = {
  tobeint: {
    kropp: { h: 0.6, paa: [0, -0.5] },
    deler: {
      hale: { z: -35, ledd: 'hoyre', feste: ['venstre', 0.74, 0.12], lengde: 0.8, beveg: 'hale' },
      'bein-bak': { z: -20, ledd: 'topp', feste: ['bunn', 0.36, 0.2], h: 'bakke', beveg: 'gaa', fase: Math.PI, styrke: 0.34 },
      'arm-bak': { z: -10, ledd: 'topp', feste: ['topp', 0.58, 0.34], h: 0.3, beveg: 'sving', styrke: 0.24 },
      'bein-fram': { z: 10, ledd: 'topp', feste: ['bunn', 0.52, 0.2], h: 'bakke', beveg: 'gaa', styrke: 0.34 },
      hode: { z: 20, ledd: 'bunn', feste: ['topp', 0.8, 0.1], h: 0.42, beveg: 'nikk' },
      'arm-fram': { z: 30, ledd: 'topp', feste: ['topp', 0.7, 0.36], h: 0.32, beveg: 'sving', fase: 0, styrke: 0.24 },
    },
  },
  flygende: {
    kropp: { h: 0.36, paa: [0, -0.52] },
    deler: {
      'vinge-bak': { z: -40, ledd: 'hoyre', feste: ['topp', 0.46, 0.06], h: 0.45, beveg: 'vinge', fart: 6, fase: 0.4, styrke: 0.5 },
      hale: { z: -35, ledd: 'hoyre', feste: ['venstre', 0.56, 0.1], lengde: 0.62, beveg: 'hale', styrke: 0.26 },
      'bein-bak': { z: -20, ledd: 'topp', feste: ['bunn', 0.42, 0.18], h: 0.28, beveg: 'sving', styrke: 0.14 },
      'bein-fram': { z: -5, ledd: 'topp', feste: ['bunn', 0.6, 0.18], h: 0.3, beveg: 'sving', fase: 0.6, styrke: 0.14 },
      hode: { z: 20, ledd: 'bunn', feste: ['topp', 0.84, 0.12], h: 0.44, beveg: 'nikk' },
      'vinge-fram': { z: 40, ledd: 'hoyre', feste: ['topp', 0.56, 0.08], h: 0.5, beveg: 'vinge', fart: 6, styrke: 0.6 },
    },
  },
  firbeint: {
    kropp: { h: 0.5, paa: [0, -0.4] },
    deler: {
      hale: { z: -35, ledd: 'hoyre', feste: ['venstre', 0.6, 0.12], lengde: 0.7, beveg: 'hale', styrke: 0.22 },
      'bein-bak': { z: -25, ledd: 'topp', feste: ['bunn', 0.24, 0.2], h: 'bakke', beveg: 'gaa', fase: Math.PI, styrke: 0.38 },
      'arm-bak': { z: -15, ledd: 'topp', feste: ['bunn', 0.62, 0.2], h: 'bakke', beveg: 'gaa', fase: 0.6, styrke: 0.38 },
      'bein-fram': { z: 10, ledd: 'topp', feste: ['bunn', 0.34, 0.2], h: 'bakke', beveg: 'gaa', styrke: 0.38 },
      'arm-fram': { z: 20, ledd: 'topp', feste: ['bunn', 0.74, 0.2], h: 'bakke', beveg: 'gaa', fase: Math.PI + 0.6, styrke: 0.38 },
      hode: { z: 30, ledd: 'bunn', feste: ['topp', 0.8, 0.12], h: 0.56, beveg: 'nikk' },
    },
  },
  klump: {
    kropp: { h: 0.56, paa: [0, -0.52] },
    deler: {
      'bein-bak': { z: -25, ledd: 'topp', feste: ['bunn', 0.4, 0.12], h: 'bakke', beveg: 'gaa', fase: Math.PI, styrke: 0.24 },
      'arm-bak': { z: -15, ledd: 'topp', feste: ['topp', 0.44, 0.14], h: 0.5, beveg: 'sving', styrke: 0.26 },
      'bein-fram': { z: 10, ledd: 'topp', feste: ['bunn', 0.6, 0.12], h: 'bakke', beveg: 'gaa', styrke: 0.24 },
      hode: { z: 20, ledd: 'bunn', feste: ['topp', 0.8, 0.16], h: 0.3, beveg: 'nikk' },
      'arm-fram': { z: 30, ledd: 'topp', feste: ['topp', 0.68, 0.16], h: 0.55, beveg: 'sving', fase: 0, styrke: 0.26 },
    },
  },
};

// Blinkeboksen i js/sprites.js: 1.9 x 1.7 figurhoeyder, foettene 85 % ned.
const BOKS = { x0: -0.95, x1: 0.95, y0: -1.445, y1: 0.255 };

function lagRigg(mappe, type) {
  const plan = TYPER[type];
  if (!plan) throw new Error('ukjent kroppstype ' + type + ' - bruk ' + Object.keys(TYPER).join(', '));
  const last = (navn) => {
    const f = path.join(mappe, navn + '.png');
    if (!fs.existsSync(f)) return null;
    const im = F.decode(f);
    return { im, m: maske(im) };
  };
  const kropp = last('kropp');
  if (!kropp) throw new Error('fant ikke kropp.png i ' + mappe);
  const kh = plan.kropp.h, kw = kh * kropp.im.w / kropp.im.h;
  const kpaa = plan.kropp.paa;
  // punkt i kroppens bilde (0-1) -> figurkoordinater (andel av H)
  const tilFigur = (u, v) => [+(kpaa[0] + (u - 0.5) * kw).toFixed(3), +(kpaa[1] + (v - 0.5) * kh).toFixed(3)];

  const deler = [{ navn: 'kropp', z: 0, h: kh, fest: [0.5, 0.5], paa: kpaa, beveg: 'duv' }];
  for (const [navn, s] of Object.entries(plan.deler)) {
    const d = last(navn);
    if (!d) continue;
    const fest = LEDD[s.ledd](d).map((v) => +v.toFixed(3));
    const [hvor, a, inn] = s.feste;
    let u, v;
    if (hvor === 'venstre') { v = a; u = venstreKant(kropp, v) + inn; }
    else { u = a; v = hvor === 'topp' ? kant(kropp, u, 'topp') + inn : kant(kropp, u, 'bunn') - inn; }
    const paa = tilFigur(u, v);
    const aspekt = d.im.w / d.im.h;
    let h;
    if (s.h === 'bakke') h = Math.min(0.6, Math.max(0.15, -paa[1] / (1 - fest[1])));
    else if (s.lengde) {
      // halen maa ikke stikke ut av blinkeboksen bakover
      const maksBredde = (paa[0] - BOKS.x0 - 0.03) / Math.max(0.5, fest[0]);
      h = Math.min(0.3, Math.max(0.1, Math.min(s.lengde, maksBredde) / aspekt));
    } else h = s.h;
    const o = { navn, z: s.z, h: +h.toFixed(3), fest, paa, beveg: s.beveg };
    for (const k of ['fase', 'fart', 'styrke']) if (s[k] != null) o[k] = +(+s[k]).toFixed(3);
    deler.push(o);
  }
  deler.sort((a, b) => a.z - b.z);

  // Holder alt seg inne i blinkeboksen? (i hvile, uten rotasjon)
  const utenfor = [];
  for (const p of deler) {
    const d = p.navn === 'kropp' ? kropp : last(p.navn);
    const ph = p.h, pw = ph * d.im.w / d.im.h;
    const x0 = p.paa[0] - p.fest[0] * pw, x1 = x0 + pw, y0 = p.paa[1] - p.fest[1] * ph, y1 = y0 + ph;
    if (x0 < BOKS.x0 || x1 > BOKS.x1 || y0 < BOKS.y0 || y1 > BOKS.y1) utenfor.push(p.navn);
  }
  return { rigg: { plassert: true, deler }, utenfor };
}

// ------------------------------------------------------------------
//  Forhaandsvisning: hvile og begge ytterstillinger side om side
// ------------------------------------------------------------------
const UTSLAG = { gaa: 0.42, sving: 0.3, vinge: 0.55, hale: 0.18, nikk: 0.08 };
function tegn(mappe, rigg, ut, H = 300) {
  const PW = Math.round(H * 1.9), PH = Math.round(H * 1.7), stillinger = [0, 1, -1];
  const W = PW * stillinger.length;
  const px = Buffer.alloc(W * PH * 4);
  for (let y = 0; y < PH; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, c = ((x >> 4) + (y >> 4)) & 1 ? 200 : 222;
    px[i] = c; px[i + 1] = c; px[i + 2] = c + 10; px[i + 3] = 255;
  }
  const deler = rigg.deler.map((p) => ({ p, im: F.decode(path.join(mappe, p.navn + '.png')) }));
  stillinger.forEach((fortegn, si) => {
    const ox = PW * si + PW / 2, oy = PH * 0.85;
    // bakkelinje
    for (let x = PW * si; x < PW * (si + 1); x++) { const i = (Math.round(oy) * W + x) * 4; px[i] = 90; px[i + 1] = 90; px[i + 2] = 90; }
    for (const { p, im } of deler) {
      const ph = H * p.h, pw = ph * im.w / im.h;
      const ax = p.paa[0] * H, ay = p.paa[1] * H;
      const rot = (p.vinkel || 0) + fortegn * (p.styrke ?? UTSLAG[p.beveg] ?? 0);
      const c = Math.cos(rot), s = Math.sin(rot);
      const r = Math.hypot(pw, ph);
      for (let y = Math.max(0, Math.floor(oy + ay - r)); y < Math.min(PH, Math.ceil(oy + ay + r)); y++) {
        for (let x = Math.max(PW * si, Math.floor(ox + ax - r)); x < Math.min(PW * (si + 1), Math.ceil(ox + ax + r)); x++) {
          const qx = x - ox - ax, qy = y - oy - ay;
          const lx = qx * c + qy * s, ly = -qx * s + qy * c;
          const u = Math.floor((lx / pw + p.fest[0]) * im.w), v = Math.floor((ly / ph + p.fest[1]) * im.h);
          if (u < 0 || v < 0 || u >= im.w || v >= im.h) continue;
          const k = (v * im.w + u) * 4, a = im.px[k + 3] / 255;
          if (!a) continue;
          const d = (y * W + x) * 4;
          for (let j = 0; j < 3; j++) px[d + j] = Math.round(im.px[k + j] * a + px[d + j] * (1 - a));
        }
      }
    }
  });
  fs.writeFileSync(ut, F.encode({ w: W, h: PH, px }));
}

module.exports = { lagRigg, tegn, TYPER };

if (require.main === module) {
  const [mappe, type] = process.argv.slice(2);
  const flagg = process.argv.slice(4);
  const verdi = (navn) => { const i = flagg.indexOf(navn); return i >= 0 ? flagg[i + 1] : null; };
  if (!mappe || !type) {
    console.log('Bruk: node verktoy/lag-startrigg.js <figurmappe> <' + Object.keys(TYPER).join('|') + '> [--vis fil.png] [--ut rigg.json] [--overskriv]');
    process.exit(1);
  }
  const { rigg, utenfor } = lagRigg(mappe, type);
  const ut = verdi('--ut') || path.join(mappe, 'rigg.json');
  if (fs.existsSync(ut) && !flagg.includes('--overskriv') && !verdi('--ut')) {
    console.log(ut + ' finnes fra foer - den er kanskje finjustert for haand. Bruk --overskriv eller --ut.');
    process.exit(2);
  }
  fs.writeFileSync(ut, JSON.stringify(rigg, null, 2) + '\n');
  console.log('Skrev ' + ut + ' (' + rigg.deler.length + ' deler)');
  for (const p of rigg.deler) console.log('  ' + p.navn.padEnd(11) + 'z ' + String(p.z).padStart(3) + '  h ' + p.h + '  fest ' + p.fest.join(',') + '  paa ' + p.paa.join(','));
  if (utenfor.length) console.log('  ! stikker utenfor blinkeboksen i hvile: ' + utenfor.join(', ') + ' - krymp eller flytt i riggverkstedet');
  const vis = verdi('--vis');
  if (vis) { tegn(mappe, rigg, vis); console.log('Forhaandsvisning: ' + vis); }
}
