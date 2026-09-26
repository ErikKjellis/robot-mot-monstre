// lag-ramme.js - deler et ark med rammedeler opp i ni biter spillet bygger rammer av.
//
//   node verktoy/lag-ramme.js art/grafikk/panel-deler.png
//
// Arket har ni deler i et rutenett, tegnet hver for seg:
//
//   hjoerne oppe venstre   kant oppe      hjoerne oppe hoeyre
//   kant venstre           midten         kant hoeyre
//   hjoerne nede venstre   kant nede      hjoerne nede hoeyre
//
// Hver del lagres i art/grafikk/ramme/ (f.eks. hjorne-oppe-venstre.png), og
// art/grafikk/ramme/ramme.json sier hvor STEINEN er i hvert bilde - gress og stein
// som stikker ut, teller ikke. Spillet (js/ramme.js) setter hjoernene i hjoernene,
// legger hele planker langs kantene og fliser i midten. Vil du tegne en del paa
// nytt, bytt ut bildet og kjoer verktoeyet paa arket igjen (eller rett ramme.json).

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');

const NAVN = [
  'hjorne-oppe-venstre', 'kant-oppe', 'hjorne-oppe-hoyre',
  'kant-venstre', 'midt', 'kant-hoyre',
  'hjorne-nede-venstre', 'kant-nede', 'hjorne-nede-hoyre',
];

function biter(im) {
  const { w, h, px } = im;
  const lab = new Int32Array(w * h).fill(-1), q = new Int32Array(w * h), ut = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] !== -1 || px[s * 4 + 3] <= 40) continue;
    let hd = 0, tl = 0, x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    q[tl++] = s; lab[s] = ut.length;
    while (hd < tl) {
      const k = q[hd++], x = k % w, y = (k / w) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const nk of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
        if (nk >= 0 && lab[nk] === -1 && px[nk * 4 + 3] > 40) { lab[nk] = ut.length; q[tl++] = nk; }
      }
    }
    ut.push({ id: ut.length, n, x0, y0, x1, y1 });
  }
  ut.lab = lab;
  return ut;
}

/** Er pikselen stein (farget flate eller den moerke kanten rundt), og ikke gress eller en grein stein? */
function erStein(px, i) {
  if (px[i + 3] < 128) return false;
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), lys = (r + g + b) / 3;
  if (g > r + 25 && g >= b) return false;            // gress
  if (mx - mn < 30 && lys > 70) return false;         // graa smaastein
  return true;                                        // steinflate (farget) eller kontur (moerk)
}

/**
 * Rektangelet steinen fyller: raden/kolonnen der minst 'andel' av pikslene er stein.
 * Gress og smaastein som stikker ut i kantene faller dermed utenfor.
 */
function steinBoks(im, andel = 0.35) {
  const { w, h, px } = im;
  const rad = new Array(h).fill(0), kol = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (erStein(px, (y * w + x) * 4)) { rad[y]++; kol[x]++; }
  const maxR = Math.max(...rad), maxK = Math.max(...kol);
  const y0 = rad.findIndex((n) => n >= maxR * andel), y1 = h - 1 - [...rad].reverse().findIndex((n) => n >= maxR * andel);
  const x0 = kol.findIndex((n) => n >= maxK * andel), x1 = w - 1 - [...kol].reverse().findIndex((n) => n >= maxK * andel);
  return [x0, y0, x1 + 1, y1 + 1];
}

function lagRamme(ark, utMappe = path.join('art', 'grafikk', 'ramme')) {
  const im = F.decode(ark);
  if (F.andelGjennomsiktig(im) <= 0.01) F.stripBackground(im);
  const alle = biter(im);
  const storst = Math.max(...alle.map((b) => b.n));
  const deler = alle.filter((b) => b.n > storst * 0.15);
  if (deler.length !== 9) throw new Error('fant ' + deler.length + ' deler i arket, ventet 9 (3 x 3)');
  // tre rader, sortert ovenfra og ned, og hver rad fra venstre
  deler.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rader = [deler.slice(0, 3), deler.slice(3, 6), deler.slice(6, 9)].map((r) => r.sort((a, b) => a.x0 - b.x0));
  fs.mkdirSync(utMappe, { recursive: true });
  const data = { deler: {} };
  rader.flat().forEach((b, i) => {
    // bare delens egne piksler (smaa loese biter i naerheten hoerer med hvis de er innenfor)
    const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, del = { w, h, px: Buffer.alloc(w * h * 4) };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (b.y0 + y) * im.w + b.x0 + x, l = alle.lab[k];
      if (l >= 0 && l !== b.id && alle[l].n > storst * 0.15) continue;
      im.px.copy(del.px, (y * w + x) * 4, k * 4, k * 4 + 4);
    }
    const navn = NAVN[i];
    fs.writeFileSync(path.join(utMappe, navn + '.png'), F.encode(del));
    data.deler[navn] = { w, h, stein: steinBoks(del) };
  });
  fs.writeFileSync(path.join(utMappe, 'ramme.json'), JSON.stringify(data, null, 2));
  return data;
}

module.exports = { lagRamme, steinBoks };

if (require.main === module) {
  const ark = process.argv[2];
  if (!ark) { console.log('Bruk: node verktoy/lag-ramme.js <ark med ni rammedeler.png>'); process.exit(1); }
  const d = lagRamme(ark);
  for (const [n, p] of Object.entries(d.deler)) console.log('  ' + n.padEnd(22) + p.w + 'x' + p.h + '   stein ' + p.stein.join(','));
  console.log('Skrev art/grafikk/ramme/ (ni bilder og ramme.json)');
}
