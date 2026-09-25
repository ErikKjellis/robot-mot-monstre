// del-opp.js - deler ETT bilde med flere kroppsdeler opp i hver sin PNG.
//
// Be bilde-AI-en om aa tegne alle delene i ett og samme bilde, godt adskilt
// paa hvit bakgrunn. Da blir stilen lik paa alle delene - og dette verktoeyet
// klipper dem fra hverandre etterpaa.
//
//   node verktoy/del-opp.js ark/skyggedrage.png art/monstre/skyggedrage \
//        kropp hode hale vinge-fram vinge-bak bein-fram bein-bak
//
// Delene navngis i LESEREKKEFOELGE: oeverste rad fra venstre mot hoeyre,
// saa neste rad. Verktoeyet skriver ut hvilken del som fikk hvilket navn,
// og lager ark-oversikt.png saa du kan se at det ble riktig.
//
// Peker en del feil vei, skriv :speil bak navnet, f.eks. hale:speil
//
// Gir du ingen navn, lagres de som del-1.png, del-2.png ...

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');

const MIN_ANDEL = 0.004;   // biter mindre enn dette av alt blekket er stoey

// ------------------------------------------------------------------
//  Finn sammenhengende biter
// ------------------------------------------------------------------
function finnBiter(im) {
  const { w, h, px } = im;
  const lab = new Int32Array(w * h).fill(-1);
  const kø = new Int32Array(w * h);
  const biter = [];
  for (let start = 0; start < w * h; start++) {
    if (lab[start] !== -1 || px[start * 4 + 3] <= 40) continue;
    const id = biter.length;
    let head = 0, tail = 0;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    kø[tail++] = start; lab[start] = id;
    while (head < tail) {
      const k = kø[head++];
      const x = k % w, y = (k / w) | 0;
      n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (lab[nk] !== -1 || px[nk * 4 + 3] <= 40) continue;
        lab[nk] = id; kø[tail++] = nk;
      }
    }
    biter.push({ id, n, x0, y0, x1, y1 });
  }
  return { biter, lab };
}

/** Slaa sammen biter som ligger oppi hverandre (loese detaljer i en del). */
function slaaSammen(biter) {
  const ut = biter.slice().sort((a, b) => b.n - a.n);
  const brukt = new Set();
  const grupper = [];
  for (const b of ut) {
    if (brukt.has(b.id)) continue;
    const g = { ids: [b.id], n: b.n, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    brukt.add(b.id);
    let endret = true;
    while (endret) {
      endret = false;
      for (const c of ut) {
        if (brukt.has(c.id)) continue;
        // ligger c inni (eller godt overlappende med) gruppa?
        const ox = Math.min(g.x1, c.x1) - Math.max(g.x0, c.x0);
        const oy = Math.min(g.y1, c.y1) - Math.max(g.y0, c.y0);
        if (ox <= 0 || oy <= 0) continue;
        const dekning = (ox * oy) / Math.max(1, (c.x1 - c.x0) * (c.y1 - c.y0));
        if (dekning < 0.6) continue;
        g.ids.push(c.id); g.n += c.n;
        g.x0 = Math.min(g.x0, c.x0); g.y0 = Math.min(g.y0, c.y0);
        g.x1 = Math.max(g.x1, c.x1); g.y1 = Math.max(g.y1, c.y1);
        brukt.add(c.id);
        endret = true;
      }
    }
    grupper.push(g);
  }
  return grupper;
}

/** Sorter i lesereksefoelge: radvis ovenfra, venstre mot hoeyre. */
function lesereksefoelge(grupper) {
  const hoyder = grupper.map((g) => g.y1 - g.y0);
  const radHoyde = hoyder.sort((a, b) => a - b)[Math.floor(hoyder.length / 2)] || 100;
  const sortert = grupper.slice().sort((a, b) => {
    const ay = (a.y0 + a.y1) / 2, by = (b.y0 + b.y1) / 2;
    if (Math.abs(ay - by) > radHoyde * 0.55) return ay - by;
    return ((a.x0 + a.x1) / 2) - ((b.x0 + b.x1) / 2);
  });
  return sortert;
}

// ------------------------------------------------------------------
//  Byggeklosser - brukes ogsaa av sjekk-ark.js
// ------------------------------------------------------------------

/** Les et ark, fjern bakgrunnen og finn delene i lesereksefoelge. */
function analyser(inn) {
  const im = F.decode(inn);
  const foer = Buffer.from(im.px);            // slik arket saa ut foer rydding
  const fjernet = F.stripBackground(im);
  const { biter, lab } = finnBiter(im);
  const alt = biter.reduce((s, b) => s + b.n, 0);
  const store = biter.filter((b) => b.n >= alt * MIN_ANDEL);
  const smaa = biter.filter((b) => b.n < alt * MIN_ANDEL);
  const grupper = lesereksefoelge(slaaSammen(store));
  return { im, foer, fjernet, lab, grupper, smaa, alt };
}

function speilvend(im) {
  const { w, h, px } = im;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      px.copy(out, (y * w + (w - 1 - x)) * 4, s, s + 4);
    }
  }
  return { w, h, px: out };
}

/** Klipp ut en del. Bare delens egne piksler blir med, ikke biter av naboen. */
function klippUt(ark, g, speil) {
  const { im, lab } = ark;
  const egne = new Set(g.ids);
  const m = Math.round(Math.max(g.x1 - g.x0, g.y1 - g.y0) * 0.02);
  const x0 = Math.max(0, g.x0 - m), y0 = Math.max(0, g.y0 - m);
  const x1 = Math.min(im.w - 1, g.x1 + m), y1 = Math.min(im.h - 1, g.y1 + m);
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const px = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const k = (y + y0) * im.w + (x + x0);
      if (lab[k] !== -1 && !egne.has(lab[k])) continue;   // hoerer til naboen
      im.px.copy(px, (y * nw + x) * 4, k * 4, k * 4 + 4);
    }
  }
  let del = { w: nw, h: nh, px };
  F.despeckle(del);
  del = F.crop(del);
  del = F.shrink(del, F.MAX_SIZE);
  return speil ? speilvend(del) : del;
}

/** "hale:speil" -> { navn: 'hale', speil: true } */
function lesNavn(arg) {
  const [navn, ...flagg] = String(arg).split(':');
  return { navn, speil: flagg.includes('speil') };
}

/** Oversiktsbilde: arket paa moerk rute, gul ramme og roede nummerprikker. */
function lagOversikt(ark) {
  const { im, grupper } = ark;
  const OV = 900;
  const skala = OV / Math.max(im.w, im.h);
  const ow = Math.round(im.w * skala), oh = Math.round(im.h * skala);
  const ov = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = Math.min(im.w - 1, Math.round(x / skala));
      const sy = Math.min(im.h - 1, Math.round(y / skala));
      const s = (sy * im.w + sx) * 4, d = (y * ow + x) * 4;
      const a = im.px[s + 3] / 255;
      const bg = (((x >> 4) + (y >> 4)) & 1) ? 58 : 44;
      ov[d] = Math.round(im.px[s] * a + bg * (1 - a));
      ov[d + 1] = Math.round(im.px[s + 1] * a + bg * (1 - a));
      ov[d + 2] = Math.round(im.px[s + 2] * a + (bg + 16) * (1 - a));
      ov[d + 3] = 255;
    }
  }
  // nummerering: fyll et lite felt oeverst til venstre i hver del
  grupper.forEach((g, i) => {
    const x0 = Math.round(g.x0 * skala), y0 = Math.round(g.y0 * skala);
    const x1 = Math.round(g.x1 * skala), y1 = Math.round(g.y1 * skala);
    const ramme = (x, y) => {
      if (x < 0 || y < 0 || x >= ow || y >= oh) return;
      const d = (y * ow + x) * 4;
      ov[d] = 255; ov[d + 1] = 210; ov[d + 2] = 60;
    };
    for (let x = x0; x <= x1; x++) { ramme(x, y0); ramme(x, y0 + 1); ramme(x, y1); ramme(x, y1 - 1); }
    for (let y = y0; y <= y1; y++) { ramme(x0, y); ramme(x0 + 1, y); ramme(x1, y); ramme(x1 - 1, y); }
    // teller: i+1 prikker i en rad oeverst til venstre
    for (let k = 0; k <= i; k++) {
      for (let dy = 0; dy < 9; dy++) for (let dx = 0; dx < 9; dx++) {
        const x = x0 + 5 + k * 12 + dx, y = y0 + 5 + dy;
        if (x < 0 || y < 0 || x >= ow || y >= oh) continue;
        const d = (y * ow + x) * 4;
        ov[d] = 255; ov[d + 1] = 60; ov[d + 2] = 60;
      }
    }
  });
  return { w: ow, h: oh, px: ov };
}

module.exports = {
  MIN_ANDEL, finnBiter, slaaSammen, lesereksefoelge,
  analyser, klippUt, speilvend, lesNavn, lagOversikt,
};

// ------------------------------------------------------------------
//  Kjoert som kommando
// ------------------------------------------------------------------
if (require.main === module) {
  const inn = process.argv[2];
  const utMappe = process.argv[3];
  const navn = process.argv.slice(4).map(lesNavn);

  if (!inn || !utMappe) {
    console.log('Bruk:  node verktoy/del-opp.js <ark.png> <ut-mappe> [navn1 navn2 ...]');
    console.log('F.eks: node verktoy/del-opp.js ark/skyggedrage.png art/monstre/skyggedrage \\');
    console.log('         kropp hode hale vinge-fram vinge-bak bein-fram bein-bak');
    console.log('Skriv :speil bak et navn for aa speilvende delen, f.eks. hale:speil');
    process.exit(1);
  }

  console.log('Leser ' + inn);
  const ark = analyser(inn);
  const { im, grupper } = ark;
  console.log('  ' + im.w + 'x' + im.h);
  console.log('  fjernet ' + Math.round(ark.fjernet * 100) + '% bakgrunn');
  console.log('  fant ' + grupper.length + ' deler');

  if (navn.length && navn.length !== grupper.length) {
    console.log('\n  ! Du ga ' + navn.length + ' navn, men jeg fant ' + grupper.length + ' deler.');
    console.log('  ! Delene som mangler navn lagres som del-N.png.');
    console.log('  ! Henger to deler sammen i bildet, blir de til en. Be om mer luft mellom dem.');
  }

  fs.mkdirSync(utMappe, { recursive: true });
  grupper.forEach((g, i) => {
    const n = navn[i] || { navn: 'del-' + (i + 1), speil: false };
    const del = klippUt(ark, g, n.speil);
    const filnavn = n.navn + '.png';
    fs.writeFileSync(path.join(utMappe, filnavn), F.encode(del));
    console.log('  ' + String(i + 1).padStart(2) + '. ' + filnavn.padEnd(18) +
      del.w + 'x' + del.h + (n.speil ? '  (speilvendt)' : ''));
  });

  fs.writeFileSync(path.join(utMappe, 'ark-oversikt.png'), F.encode(lagOversikt(ark)));

  console.log('\nOversikt: ' + path.join(utMappe, 'ark-oversikt.png'));
  console.log('  (roede prikker = nummer, rekkefoelgen navnene ble delt ut i)');
  console.log('Ser noe feil ut, kjoer paa nytt med navnene i riktig rekkefoelge.');
}
