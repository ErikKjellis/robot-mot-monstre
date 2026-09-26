// lag-font.js - lager en bildefont (bitmapfont) av et ark med tegnede bokstaver.
//
//   node verktoy/lag-font.js ark/font-kilde.png spillfont \
//        "ABCDEFGHIJKLM" "NOPQRSTUVWXYZ" "ÆØÅ" "abcdefghijklm" "nopqrstuvwxyz" "æøå" "0123456789!?.,-"
//
// Arket: bokstavene staar i rader paa gjennomsiktig (eller hvit) bakgrunn, godt
// adskilt. Hver rad paa kommandolinja sier hvilke tegn som staar i den raden, fra
// venstre mot hoeyre. Verktoeyet finner hver bokstav, finner grunnlinja i hver rad
// (der bokstavene uten hale staar), og lager:
//   art/font/<navn>.png    alle bokstavene pakket tett (bokstavhoeyde --hoyde, standard 64 px)
//   art/font/<navn>.json   hvor hver bokstav ligger, og hvor bred den er - brukes av js/skrift.js
//   art/font/<navn>.xml    det samme i BMFont-format, som Phaser og andre spillmotorer leser
// og art/font/<navn>-oversikt.png, der du ser at hver bokstav fikk riktig tegn.
//
// --som "I=l"  lar et tegn laane formen til et annet (her: stor I tegnes som liten l).

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');
const S = require('./somlos.js');

const HALER = new Set('gjpqyQ,'.split(''));     // tegn som stikker under grunnlinja

function biter(im, terskel = 60) {
  const { w, h, px } = im;
  const lab = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h), ut = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] !== -1 || px[s * 4 + 3] <= terskel) continue;
    let hd = 0, tl = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    q[tl++] = s; lab[s] = ut.length;
    while (hd < tl) {
      const k = q[hd++], x = k % w, y = (k / w) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const nk of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (nk >= 0 && lab[nk] === -1 && px[nk * 4 + 3] > terskel) { lab[nk] = ut.length; q[tl++] = nk; }
      }
    }
    ut.push({ id: ut.length, n, x0, y0, x1, y1 });
  }
  ut.lab = lab;
  return ut;
}

const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

function lagFont(kilde, navn, rader, maalHoyde = 64, som = {}) {
  let im = F.decode(kilde);
  if (F.andelGjennomsiktig(im) <= 0.01) F.stripBackground(im);
  const alle = biter(im);
  const storst = Math.max(...alle.map((b) => b.n));
  const store = alle.filter((b) => b.n > storst * 0.02);

  // Radene finnes av bokstavkroppene alene. Loese prikker (i, j, !, ?) og ringer
  // (Å) er smaa og ligger over eller under kroppen - de ville ellers laget sine
  // egne "rader".
  const hMed = median(store.map((b) => b.y1 - b.y0));
  const kropper = store.filter((b) => b.y1 - b.y0 >= hMed * 0.4);
  const grupper = [];
  for (const b of kropper.sort((a, c) => (a.y0 + a.y1) - (c.y0 + c.y1))) {
    const cy = (b.y0 + b.y1) / 2;
    const g = grupper.find((r) => cy > r.y0 && cy < r.y1);
    if (g) { g.b.push(b); g.y0 = Math.min(g.y0, b.y0); g.y1 = Math.max(g.y1, b.y1); } else grupper.push({ y0: b.y0, y1: b.y1, b: [b] });
  }
  grupper.sort((a, c) => a.y0 - c.y0);
  // Resten: prikker, ringer og aksenter festes til bokstaven de ligger over eller
  // under. Smaa tegn som ligger inni en rad for seg selv (. , -) er egne tegn.
  // Det som verken er det ene eller det andre, er stoey.
  let droppet = 0;
  for (const b of alle) {
    if (kropper.includes(b) || b.n <= storst * 0.0015) continue;
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    let best = null, bd = Infinity;
    for (const g of grupper) {
      const d = cy < g.y0 ? g.y0 - cy : cy > g.y1 ? cy - g.y1 : 0;
      if (d > hMed * 0.6) continue;
      const over = g.b.some((k) => kropper.includes(k) && cx >= k.x0 - 2 && cx <= k.x1 + 2);
      if ((over || d === 0) && d < bd) { bd = d; best = g; }
    }
    if (best) best.b.push(b); else droppet++;
  }
  if (droppet) console.log('  (' + droppet + ' smaa flekker laa ikke over noen bokstav og ble tatt bort)');
  if (grupper.length !== rader.length) {
    throw new Error('fant ' + grupper.length + ' rader i arket, men fikk ' + rader.length + ' rader med tegn');
  }
  // Loese smaa flekker (stoey fra arket) tas ikke med - prikker og ringer henger fast i bokstaven.
  const glyfer = [];
  grupper.forEach((g, ri) => {
    const tegn = [...rader[ri]];
    // biter som overlapper sideveis er samme tegn
    const sortert = g.b.sort((a, c) => a.x0 - c.x0);
    const tegnBokser = [];
    for (const b of sortert) {
      const forrige = tegnBokser[tegnBokser.length - 1];
      const overlapp = forrige ? Math.min(forrige.x1, b.x1) - Math.max(forrige.x0, b.x0) : -1;
      if (forrige && overlapp > Math.min(forrige.x1 - forrige.x0, b.x1 - b.x0) * 0.5) {
        forrige.x0 = Math.min(forrige.x0, b.x0); forrige.x1 = Math.max(forrige.x1, b.x1);
        forrige.y0 = Math.min(forrige.y0, b.y0); forrige.y1 = Math.max(forrige.y1, b.y1);
        forrige.ids.push(b.id);
      } else tegnBokser.push({ ...b, ids: [b.id] });
    }
    if (tegnBokser.length !== tegn.length) {
      throw new Error('rad ' + (ri + 1) + ' ("' + rader[ri] + '"): fant ' + tegnBokser.length + ' tegn, ventet ' + tegn.length);
    }
    // grunnlinja: der bokstavene uten hale slutter nede
    const uten = tegnBokser.filter((b, i) => !HALER.has(tegn[i]) && !'-.'.includes(tegn[i]));
    const grunn = median((uten.length ? uten : tegnBokser).map((b) => b.y1));
    tegnBokser.forEach((b, i) => glyfer.push({ tegn: tegn[i], ...b, grunn }));
  });

  // skala: store bokstaver (uten ring og hale) skal bli maalHoyde hoeye
  const store_ = glyfer.filter((g) => /[A-Z]/.test(g.tegn) && !HALER.has(g.tegn));
  const kildeHoyde = median(store_.length ? store_.map((g) => g.grunn - g.y0) : glyfer.map((g) => g.y1 - g.y0));
  const skala = maalHoyde / kildeHoyde;

  // pakk tett i et atlas
  const PAD = 3, MAKSB = 1024;
  let x = PAD, y = PAD, radH = 0, atlasB = 0;
  const utsnitt = glyfer.map((g) => {
    const w = g.x1 - g.x0 + 1, h = g.y1 - g.y0 + 1;
    // bare bokstavens egne piksler (og de svake kantpikslene rundt), ikke flekker som ligger inni rektangelet
    const buf = Buffer.alloc(w * h * 4), mine = new Set(g.ids);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const k = (g.y0 + yy) * im.w + g.x0 + xx, l = alle.lab[k];
      if (l >= 0 ? !mine.has(l) : im.px[k * 4 + 3] === 0) continue;
      im.px.copy(buf, (yy * w + xx) * 4, k * 4, k * 4 + 4);
    }
    const liten = S.skaler({ w, h, px: buf }, Math.max(1, Math.round(h * skala)));
    if (x + liten.w + PAD > MAKSB) { x = PAD; y += radH + PAD; radH = 0; }
    const plass = { x, y };
    x += liten.w + PAD; radH = Math.max(radH, liten.h); atlasB = Math.max(atlasB, x);
    return { g, liten, plass };
  });
  const atlasH = y + radH + PAD;
  const atlas = { w: atlasB, h: atlasH, px: Buffer.alloc(atlasB * atlasH * 4) };
  for (const u of utsnitt) {
    for (let yy = 0; yy < u.liten.h; yy++) {
      u.liten.px.copy(atlas.px, ((u.plass.y + yy) * atlas.w + u.plass.x) * 4, yy * u.liten.w * 4, (yy + 1) * u.liten.w * 4);
    }
  }

  // maal i atlas-piksler, relativt til grunnlinja
  const tett = Math.round(maalHoyde * 0.05);     // tykke konturer: la bokstavene gaa litt inn i hverandre
  const data = { navn, storrelse: maalHoyde, bredde: atlas.w, hoyde: atlas.h, glyfer: {} };
  let over = 0, under = 0;
  for (const u of utsnitt) {
    const topp = Math.round((u.g.y0 - u.g.grunn) * skala);
    over = Math.max(over, -topp); under = Math.max(under, u.liten.h + topp);
    data.glyfer[u.g.tegn] = [u.plass.x, u.plass.y, u.liten.w, u.liten.h, topp, u.liten.w - tett];
  }
  // tegn som laaner formen til et annet (f.eks. stor I som ser ut som liten l)
  for (const [t, fra] of Object.entries(som)) if (data.glyfer[fra]) data.glyfer[t] = data.glyfer[fra].slice();
  data.grunnlinje = over;
  data.linjehoyde = over + under;
  data.mellomrom = Math.round(maalHoyde * 0.38);

  const ut = path.join('art', 'font');
  fs.mkdirSync(ut, { recursive: true });
  fs.writeFileSync(path.join(ut, navn + '.png'), F.encode(atlas));
  fs.writeFileSync(path.join(ut, navn + '.json'), JSON.stringify(data));
  // BMFont (Phaser: this.load.bitmapFont('spillfont', 'art/font/spillfont.png', 'art/font/spillfont.xml'))
  const tegnXml = Object.entries(data.glyfer).map(([t, [gx, gy, gw, gh, topp, adv]]) =>
    '    <char id="' + t.codePointAt(0) + '" x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh +
    '" xoffset="0" yoffset="' + (over + topp) + '" xadvance="' + adv + '" page="0" chnl="15"/>');
  tegnXml.push('    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="' + data.mellomrom + '" page="0" chnl="15"/>');
  fs.writeFileSync(path.join(ut, navn + '.xml'), '<?xml version="1.0"?>\n<font>\n' +
    '  <info face="' + navn + '" size="' + data.linjehoyde + '" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="0,0"/>\n' +
    '  <common lineHeight="' + data.linjehoyde + '" base="' + over + '" scaleW="' + atlas.w + '" scaleH="' + atlas.h + '" pages="1" packed="0"/>\n' +
    '  <pages>\n    <page id="0" file="' + navn + '.png"/>\n  </pages>\n  <chars count="' + tegnXml.length + '">\n' +
    tegnXml.join('\n') + '\n  </chars>\n</font>\n');

  // oversikt: hvert tegn med grunnlinja tegnet inn
  lagOversikt(data, atlas, path.join(ut, navn + '-oversikt.png'));
  return data;
}

function lagOversikt(data, atlas, fil) {
  const tegn = Object.keys(data.glyfer), kol = 16, C = Math.round(data.linjehoyde * 1.15);
  const W = kol * C, H = Math.ceil(tegn.length / kol) * C;
  const px = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { px[i * 4] = 60; px[i * 4 + 1] = 70; px[i * 4 + 2] = 110; px[i * 4 + 3] = 255; }
  tegn.forEach((t, n) => {
    const [gx, gy, gw, gh, topp] = data.glyfer[t];
    const ox = (n % kol) * C + Math.round((C - gw) / 2), base = Math.floor(n / kol) * C + Math.round(data.grunnlinje * 1.05);
    for (let x = (n % kol) * C; x < (n % kol + 1) * C; x++) { const d = (base * W + x) * 4; px[d] = 255; px[d + 1] = 90; px[d + 2] = 90; }
    for (let yy = 0; yy < gh; yy++) for (let xx = 0; xx < gw; xx++) {
      const s = ((gy + yy) * atlas.w + gx + xx) * 4, X = ox + xx, Y = base + topp + yy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const d = (Y * W + X) * 4, a = atlas.px[s + 3] / 255;
      for (let c = 0; c < 3; c++) px[d + c] = Math.round(atlas.px[s + c] * a + px[d + c] * (1 - a));
    }
  });
  fs.writeFileSync(fil, F.encode({ w: W, h: H, px }));
}

module.exports = { lagFont };

if (require.main === module) {
  const a = process.argv.slice(2);
  const hi = a.indexOf('--hoyde');
  const hoyde = hi >= 0 ? +a[hi + 1] : 64;
  const si = a.indexOf('--som');
  const som = {};
  if (si >= 0) for (const par of a[si + 1].split(',')) { const [t, fra] = par.split('='); som[t] = fra; }
  const rest = a.filter((x, i) => !(hi >= 0 && (i === hi || i === hi + 1)) && !(si >= 0 && (i === si || i === si + 1)));
  const [kilde, navn, ...rader] = rest;
  if (!kilde || !navn || !rader.length) {
    console.log('Bruk: node verktoy/lag-font.js <ark.png> <navn> "RAD1" "RAD2" ... [--hoyde 64] [--som "I=l"]');
    process.exit(1);
  }
  const d = lagFont(kilde, navn, rader, hoyde, som);
  console.log('Laget art/font/' + navn + '.png (' + d.bredde + 'x' + d.hoyde + '), .json og .xml med ' +
    Object.keys(d.glyfer).length + ' tegn. Sjekk art/font/' + navn + '-oversikt.png');
}
