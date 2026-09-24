// lag-bakside.js - lager en "bak"-del ut fra "fram"-delen.
//
//   node verktoy/lag-bakside.js art/monstre/skyggedrage/vinge-fram.png \
//                               art/monstre/skyggedrage/vinge-bak.png
//
// Den bakre armen, beinet eller vingen er som regel den samme formen, bare
// moerkere fordi den ligger paa den andre siden av kroppen. Blir en bak-del
// daarlig fra bilde-AI-en, kan du lage den av fram-delen i stedet.
//
// Tredje argumentet er hvor moerk den skal bli, 0-1 (standard 0.55).
// Fjerde argument "speil" speilvender den.

const fs = require('fs');
const path = require('path');
const F = require('./fiks-figurer.js');

const inn = process.argv[2];
const ut = process.argv[3];
const styrke = process.argv[4] ? Number(process.argv[4]) : 0.55;
const speil = process.argv.includes('speil');

if (!inn || !ut) {
  console.log('Bruk:  node verktoy/lag-bakside.js <fram.png> <bak.png> [moerkhet 0-1] [speil]');
  console.log('F.eks: node verktoy/lag-bakside.js art/monstre/skyggedrage/vinge-fram.png \\');
  console.log('                                   art/monstre/skyggedrage/vinge-bak.png 0.55');
  process.exit(1);
}

const im = F.decode(inn);
const { w, h, px } = im;
const out = Buffer.alloc(w * h * 4);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const sx = speil ? w - 1 - x : x;
    const s = (y * w + sx) * 4, d = (y * w + x) * 4;
    // Moerkere OG litt mindre mettet - det er slik ting bak en kropp leser.
    const r = px[s], g = px[s + 1], b = px[s + 2];
    const graa = (r + g + b) / 3;
    const met = 0.82;                       // trekk litt mot graatt
    out[d] = Math.round((r * met + graa * (1 - met)) * styrke);
    out[d + 1] = Math.round((g * met + graa * (1 - met)) * styrke);
    out[d + 2] = Math.round((b * met + graa * (1 - met)) * styrke);
    out[d + 3] = px[s + 3];
  }
}

fs.mkdirSync(path.dirname(ut), { recursive: true });
fs.writeFileSync(ut, F.encode({ w, h, px: out }));
console.log('Laget ' + ut + '  ' + w + 'x' + h +
  '  (' + Math.round(styrke * 100) + '% lysstyrke' + (speil ? ', speilvendt' : '') + ')');
