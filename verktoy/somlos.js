// somlos.js - gjoer et bakgrunnsbilde klart til aa gjentas bortover uten synlig skjoet.
//
//   node verktoy/somlos.js art/bane/skog/himmel.png            bare skjoeten
//   node verktoy/somlos.js --lag art/bane/skog/midt.png         + fjern hvitt, beskjaer opp og ned
//   node verktoy/somlos.js --bakke art/bane/skog/bakke.png      + fjern hvitt over og under bakken, bakkekanten paa 1/12
//   ... --hoyde 450                                              + skaler til 450 piksler hoeyt
//
// Skjoeten: bildet legges omlagt over seg selv (hoeyre ende over venstre ende),
// og det skjaeres en snirklete skjoet ovenfra og ned der de to endene er mest
// like. Bildet blir litt smalere (en femtedel), men gaar i ett naar det gjentas.
// Originalen kopieres til art/original/ foerst, som i fiks-figurer.

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');

// ------------------------------------------------------------------
//  Skjoeten
// ------------------------------------------------------------------
function forskjell(px, i, j) {
  const ai = px[i + 3], aj = px[j + 3];
  let d = 0;
  for (let c = 0; c < 3; c++) d += Math.abs(px[i + c] * ai - px[j + c] * aj) / 255;
  return d / 3 + Math.abs(ai - aj) * 1.5;
}

/**
 * Gjoer bildet saa det henger sammen naar det gjentas bortover. Returnerer
 * { im, snitt } der snitt er hvor ulike endene var langs skjoeten (0 = helt like,
 * over ca. 40 = skjoeten kan synes).
 */
function somlos(im, andel = 0.2) {
  const { w, h, px } = im;
  const O = Math.max(8, Math.round(w * andel));
  const nw = w - O;
  // kostnad[y][x]: hvor ulik slutten (x + nw) og starten (x) er i kolonne x
  const kost = new Float64Array(O * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < O; x++) {
      kost[y * O + x] = forskjell(px, (y * w + x + nw) * 4, (y * w + x) * 4)
        + Math.abs(x - O / 2) * 0.02;       // litt mot midten naar alt er likt
    }
  }
  // billigste vei ovenfra og ned, ett steg til siden om gangen
  const sum = new Float64Array(O * h), fra = new Int8Array(O * h);
  for (let x = 0; x < O; x++) sum[x] = kost[x];
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < O; x++) {
      let best = sum[(y - 1) * O + x], b = 0;
      if (x > 0 && sum[(y - 1) * O + x - 1] < best) { best = sum[(y - 1) * O + x - 1]; b = -1; }
      if (x < O - 1 && sum[(y - 1) * O + x + 1] < best) { best = sum[(y - 1) * O + x + 1]; b = 1; }
      sum[y * O + x] = best + kost[y * O + x];
      fra[y * O + x] = b;
    }
  }
  const skjoet = new Int32Array(h);
  let x = 0;
  for (let k = 1; k < O; k++) if (sum[(h - 1) * O + k] < sum[(h - 1) * O + x]) x = k;
  let total = 0;
  for (let y = h - 1; y >= 0; y--) {
    skjoet[y] = x;
    total += kost[y * O + x];
    x += fra[y * O + x];
  }
  // sett sammen: venstre for skjoeten slutten av bildet, hoeyre for den starten,
  // med en myk overgang paa noen piksler
  const FJAER = 3;
  const ut = Buffer.alloc(nw * h * 4);
  for (let y = 0; y < h; y++) {
    px.copy(ut, y * nw * 4, y * w * 4, (y * w + nw) * 4);
    for (let x = 0; x < O; x++) {
      const t = Math.max(0, Math.min(1, (x - skjoet[y] + FJAER) / (2 * FJAER)));
      const a = (y * w + x + nw) * 4, b = (y * w + x) * 4, d = (y * nw + x) * 4;
      const aa = px[a + 3] * (1 - t), ab = px[b + 3] * t, al = aa + ab;
      for (let c = 0; c < 3; c++) ut[d + c] = al > 0 ? Math.round((px[a + c] * aa + px[b + c] * ab) / al) : 0;
      ut[d + 3] = Math.round(al);
    }
  }
  return { im: { w: nw, h, px: ut }, snitt: Math.round(total / h) };
}

// ------------------------------------------------------------------
//  Bakgrunnslag og bakke
// ------------------------------------------------------------------
/** Fjerner lys bakgrunn som henger sammen med de valgte kantene. */
function fjernHvitt(im, kanter = ['topp', 'bunn', 'venstre', 'hoeyre']) {
  const { w, h, px } = im;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (bg[k] || !F.bgLike(px, k * 4)) return;
    bg[k] = 1; stack.push(k);
  };
  if (kanter.includes('topp')) for (let x = 0; x < w; x++) push(x, 0);
  if (kanter.includes('bunn')) for (let x = 0; x < w; x++) push(x, h - 1);
  if (kanter.includes('venstre')) for (let y = 0; y < h; y++) push(0, y);
  if (kanter.includes('hoeyre')) for (let y = 0; y < h; y++) push(w - 1, y);
  while (stack.length) {
    const k = stack.pop();
    const x = k % w, y = (k / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  let n = 0;
  for (let k = 0; k < w * h; k++) if (bg[k]) { px[k * 4 + 3] = 0; n++; }
  // myk kant: lyse piksler inntil bakgrunnen er halvveis bakgrunn
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (bg[k]) continue;
      if (!((x > 0 && bg[k - 1]) || (x < w - 1 && bg[k + 1]) || (y > 0 && bg[k - w]) || (y < h - 1 && bg[k + w]))) continue;
      const i = k * 4, lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (lum > 175) px[i + 3] = Math.round(px[i + 3] * (1 - Math.min(1, (lum - 175) / 70)));
    }
  }
  return n / (w * h);
}

function dekning(im, y) {
  let n = 0;
  for (let x = 0; x < im.w; x++) if (im.px[(y * im.w + x) * 4 + 3] > 128) n++;
  return n / im.w;
}

function rader(im, y0, y1) {
  // rad y0 til (ikke med) y1; rader utenfor bildet blir gjennomsiktige
  const nh = y1 - y0, ut = Buffer.alloc(im.w * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy = y + y0;
    if (sy >= 0 && sy < im.h) im.px.copy(ut, y * im.w * 4, sy * im.w * 4, (sy + 1) * im.w * 4);
  }
  return { w: im.w, h: nh, px: ut };
}

/** Gjennomsnittlig alfa og lysstyrke i en rad. */
function radSnitt(im, y) {
  let a = 0, l = 0, n = 0;
  for (let x = 0; x < im.w; x++) {
    const i = (y * im.w + x) * 4;
    a += im.px[i + 3];
    if (im.px[i + 3] > 128) { l += (im.px[i] + im.px[i + 1] + im.px[i + 2]) / 3; n++; }
  }
  return { alfa: a / im.w, lys: n ? l / n : 0 };
}

/**
 * Bakgrunnslag: beskjaer bort tomt over innholdet og tom stripe under det.
 * Bunnen blir den nederste raden som er helt dekket, og en tynn moerk strek
 * langs undersiden (tegnet rundt et svevende baand) tas bort, ellers ligger
 * den som en strek paa horisonten.
 */
function beskjaerLag(im) {
  let topp = 0;
  while (topp < im.h - 1) {
    let noe = false;
    for (let x = 0; x < im.w && !noe; x++) if (im.px[(topp * im.w + x) * 4 + 3] > 10) noe = true;
    if (noe) break;
    topp++;
  }
  let bunn = im.h;
  while (bunn > topp + 1 && (dekning(im, bunn - 1) < 0.97 || radSnitt(im, bunn - 1).alfa < 230)) bunn--;
  const maks = Math.max(1, Math.round((bunn - topp) * 0.015));
  const ref = radSnitt(im, Math.max(topp, bunn - 1 - Math.round((bunn - topp) * 0.05))).lys;
  let kuttet = 0;
  while (kuttet < maks && bunn > topp + 2 && radSnitt(im, bunn - 1).lys < ref * 0.7) { bunn--; kuttet++; }
  return rader(im, Math.max(0, topp - 2), bunn);
}

/**
 * Smaa innestengte lommer av papirhvitt (alle kanaler 235+) blir gjennomsiktige.
 * Stoerre lyse flater (snoe, skyer) er stoerre enn grensen og blir staaende.
 */
function fjernHvitePlomper(im, maksAndel = 0.0005) {
  const { w, h, px } = im;
  const hvit = (k) => px[k * 4 + 3] > 0 && px[k * 4] >= 235 && px[k * 4 + 1] >= 235 && px[k * 4 + 2] >= 235;
  const sett = new Uint8Array(w * h), maks = Math.max(4, Math.round(w * h * maksAndel));
  let fjernet = 0;
  for (let start = 0; start < w * h; start++) {
    if (sett[start] || !hvit(start)) continue;
    const bit = [start]; sett[start] = 1;
    for (let i = 0; i < bit.length; i++) {
      const k = bit[i], x = k % w, y = (k / w) | 0;
      for (const n of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (n >= 0 && !sett[n] && hvit(n)) { sett[n] = 1; bit.push(n); }
      }
    }
    if (bit.length <= maks) { for (const k of bit) px[k * 4 + 3] = 0; fjernet += bit.length; }
  }
  return fjernet;
}

/**
 * Et baand som er for tynt (for bredt i forhold til hoeyden) forlenges nedover
 * med sin egen nederste rad, et for tykt kortes inn nedenfra. aspekt maales
 * etter skjoeten, som tar en femtedel av bredden.
 */
function justerAspekt(im, [min, max]) {
  const aspekt = (h) => (im.w * 0.8) / h;
  if (aspekt(im.h) > max) {
    const nh = Math.min(Math.round(im.w * 0.8 / max), Math.round(im.h * 1.5));
    const ut = Buffer.alloc(im.w * nh * 4);
    im.px.copy(ut, 0, 0, im.w * im.h * 4);
    for (let y = im.h; y < nh; y++) im.px.copy(ut, y * im.w * 4, (im.h - 1) * im.w * 4, im.h * im.w * 4);
    return { im: { w: im.w, h: nh, px: ut }, endring: '+' + (nh - im.h) + ' rader' };
  }
  if (aspekt(im.h) < min) {
    let nh = Math.round(im.w * 0.8 / min);
    while (nh < im.h && dekning(im, nh) < 0.97) nh++;     // kutt bare i det helt tette
    if (nh < im.h) return { im: rader(im, 0, nh), endring: '-' + (im.h - nh) + ' rader' };
  }
  return { im, endring: '' };
}

/**
 * Bakken: finner bakkekanten (der det faste begynner i de fleste kolonnene)
 * og beskjaerer slik at den havner en tolvdel ned i bildet.
 */
function tilpassBakke(im) {
  const topp = [];
  for (let x = 0; x < im.w; x++) {
    let y = 0;
    while (y < im.h && im.px[(y * im.w + x) * 4 + 3] <= 128) y++;
    topp.push(y);
  }
  topp.sort((a, b) => a - b);
  const kant = topp[Math.floor(topp.length * 0.7)];      // gresstuster stikker over, de teller ikke
  let bunn = im.h;
  while (bunn > kant + 1 && dekning(im, bunn - 1) < 0.9) bunn--;
  // en moerk kontur langs undersiden av et svevende baand skal ikke bli nederste rad
  const ref = radSnitt(im, Math.max(kant, bunn - 1 - Math.round((bunn - kant) * 0.06))).lys;
  const maks = Math.max(1, Math.round((bunn - kant) * 0.04));
  for (let k = 0; k < maks && bunn > kant + 2 && radSnitt(im, bunn - 1).lys < ref * 0.7; k++) bunn--;
  const over = Math.round((bunn - kant) / 11);
  const ut = rader(im, kant - over, bunn);
  return { im: ut, kant: over, avkuttet: Math.max(0, topp[0] < kant - over ? kant - over - topp[0] : 0) };
}

/** Skalerer til en bestemt hoeyde (gjennomsnitt av pikslene, riktig for kantene). */
function skaler(im, nh) {
  if (!nh || nh === im.h) return im;
  const nw = Math.max(1, Math.round(im.w * nh / im.h));
  const out = Buffer.alloc(nw * nh * 4);
  const fx = im.w / nw, fy = im.h / nh;
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor(y * fy), sy1 = Math.max(sy0 + 1, Math.min(im.h, Math.ceil((y + 1) * fy)));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor(x * fx), sx1 = Math.max(sx0 + 1, Math.min(im.w, Math.ceil((x + 1) * fx)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * im.w + sx) * 4, al = im.px[i + 3] / 255;
          r += im.px[i] * al; g += im.px[i + 1] * al; b += im.px[i + 2] * al; a += al; n++;
        }
      }
      const d = (y * nw + x) * 4;
      if (a > 0.0001) { out[d] = Math.round(r / a); out[d + 1] = Math.round(g / a); out[d + 2] = Math.round(b / a); }
      out[d + 3] = Math.round((a / n) * 255);
    }
  }
  return { w: nw, h: nh, px: out };
}

/**
 * Hele behandlingen. type: 'himmel' (bare skjoet), 'lag' eller 'bakke'.
 * Returnerer bildet og maal som sier om det ble bra.
 */
function behandle(im, type, hoyde, valg = {}) {
  const maal = { type, inn: im.w + 'x' + im.h };
  if (type === 'lag') {
    if (F.andelGjennomsiktig(im) <= 0.01) {
      maal.fjernet = +fjernHvitt(im).toFixed(3);
      maal.hvitePlommer = fjernHvitePlomper(im);
      maal.smaaBiter = F.despeckle(im, 0.01).fjernet;
    }
    im = beskjaerLag(im);
    if (valg.aspekt) {
      const j = justerAspekt(im, valg.aspekt);
      im = j.im;
      if (j.endring) maal.aspektJustert = j.endring;
    }
  } else if (type === 'bakke') {
    // ovenfra (over bakken) og nedenfra (hvis bakken stopper foer bildet slutter)
    if (F.andelGjennomsiktig(im) <= 0.01) maal.fjernet = +fjernHvitt(im, ['topp', 'bunn']).toFixed(3);
    const b = tilpassBakke(im);
    im = b.im; maal.avkuttetOver = b.avkuttet;
  }
  maal.bunnDekning = +dekning(im, im.h - 1).toFixed(3);
  maal.toppDekning = +dekning(im, 0).toFixed(3);
  const s = somlos(im);
  im = skaler(s.im, hoyde);
  maal.skjoet = s.snitt;
  maal.ut = im.w + 'x' + im.h;
  return { im, maal };
}

module.exports = { somlos, fjernHvitt, fjernHvitePlomper, beskjaerLag, justerAspekt, tilpassBakke, skaler, behandle, dekning };

// ------------------------------------------------------------------
//  Kommandolinje
// ------------------------------------------------------------------
if (require.main === module) {
  const a = process.argv.slice(2);
  const type = a.includes('--bakke') ? 'bakke' : a.includes('--lag') ? 'lag' : 'himmel';
  const hi = a.indexOf('--hoyde');
  const hoyde = hi >= 0 ? +a[hi + 1] : 0;
  const filer = a.filter((x, i) => !x.startsWith('--') && !(hi >= 0 && i === hi + 1));
  if (!filer.length) {
    console.log('Bruk: node verktoy/somlos.js [--lag | --bakke] [--hoyde N] <fil.png> ...');
    process.exit(1);
  }
  for (const f of filer) {
    const rel = path.relative('art', f).replace(/\\/g, '/');
    const kopi = path.join('art', 'original', rel);
    if (!rel.startsWith('..') && !fs.existsSync(kopi)) {
      fs.mkdirSync(path.dirname(kopi), { recursive: true });
      fs.copyFileSync(f, kopi);
    }
    const r = behandle(F.decode(f), type, hoyde);
    fs.writeFileSync(f, F.encode(r.im));
    console.log(f + '  ' + JSON.stringify(r.maal));
  }
}
