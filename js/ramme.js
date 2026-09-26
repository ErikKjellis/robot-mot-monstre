// ramme.js - bygger rammer av delene i art/grafikk/ramme/ (lages av verktoy/lag-ramme.js).
//
// Ingenting strekkes eller kopieres: hjoernene settes i hjoernene som de er
// tegnet, kantene legges som hele planker (saa mange som faar plass - hver
// planke justeres bare litt, saa den siste slutter akkurat ved hjoernet), og
// midten legges som fliser.
//
//   tegnRamme(ctx, x, y, w, h, skala)   i et lerret (skala = hvor stor delene tegnes)
//   rammeRundt(element)                 rundt et vindu i menyene; bygges paa nytt naar stoerrelsen endres

import { basis } from './sprites.js';

const MAPPE = 'art/grafikk/ramme/';
let data = null;
const bilder = {};
const vinduer = new Set();

function last() {
  if (typeof fetch !== 'function') return;
  fetch(basis() + MAPPE + 'ramme.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.deler) return;
      const navn = Object.keys(j.deler);
      let igjen = navn.length;
      for (const n of navn) {
        const img = new Image();
        img.onload = () => {
          bilder[n] = img;
          if (--igjen === 0) { data = j; for (const el of vinduer) tegnVindu(el); }
        };
        img.src = basis() + MAPPE + n + '.png';
      }
    })
    .catch(() => {});
}
setTimeout(last, 0);

export function klar() { return !!data; }

/**
 * Tegner delen slik at hjoernet 'hjorne' av steinen (ikke gresset) havner paa
 * (ax, ay). hjorne: 'vo' oppe venstre, 'ho' oppe hoeyre, 'vn' nede venstre, 'hn' nede hoeyre.
 */
function del(ctx, navn, ax, ay, hjorne, sx, sy) {
  const d = data.deler[navn], img = bilder[navn];
  const [x0, y0, x1, y1] = d.stein;
  const px = hjorne[0] === 'v' ? x0 : x1, py = hjorne[1] === 'o' ? y0 : y1;
  ctx.drawImage(img, ax - px * sx, ay - py * sy, d.w * sx, d.h * sy);
}

const steinB = (n) => data.deler[n].stein[2] - data.deler[n].stein[0];
const steinH = (n) => data.deler[n].stein[3] - data.deler[n].stein[1];

/** Legger hele planker fra a til b. Returnerer antall og lengden paa hver. */
function planker(lengde, plankeLengde) {
  const n = Math.max(1, Math.round(lengde / plankeLengde));
  return { n, hver: lengde / n };
}

/**
 * Tegner en ramme rundt rektangelet (x, y, w, h). Steinkanten ligger inni
 * rektangelet; gress og smaastein kan stikke litt utenfor. Returnerer false hvis
 * delene ikke er lastet ennaa. morkMidt (0-1) legger et moerkt slør over flisene,
 * saa tekst og knapper inni synes bedre.
 */
export function tegnRamme(ctx, x, y, w, h, s, morkMidt = 0) {
  if (!data) return false;
  const tO = steinH('kant-oppe') * s, tN = steinH('kant-nede') * s;
  const tV = steinB('kant-venstre') * s, tH = steinB('kant-hoyre') * s;
  const inn = 6 * s;     // plankeendene gjemmes litt under hjoernene

  // 1. midten: fliser under kantene
  const mx0 = x + tV * 0.5, my0 = y + tO * 0.5, mw = w - (tV + tH) * 0.5, mh = h - (tO + tN) * 0.5;
  if (mw > 0 && mh > 0) {
    const fx = planker(mw, steinB('midt') * s), fy = planker(mh, steinH('midt') * s);
    ctx.save();
    ctx.beginPath(); ctx.rect(mx0, my0, mw, mh); ctx.clip();
    for (let j = 0; j < fy.n; j++) {
      for (let i = 0; i < fx.n; i++) {
        del(ctx, 'midt', mx0 + i * fx.hver, my0 + j * fy.hver, 'vo', fx.hver / steinB('midt'), fy.hver / steinH('midt'));
      }
    }
    if (morkMidt > 0) { ctx.fillStyle = 'rgba(8, 14, 32, ' + morkMidt + ')'; ctx.fillRect(mx0, my0, mw, mh); }
    ctx.restore();
  }

  // 2. kantene: hele planker mellom hjoernene
  const oppeA = x + steinB('hjorne-oppe-venstre') * s - inn, oppeB = x + w - steinB('hjorne-oppe-hoyre') * s + inn;
  const nedeA = x + steinB('hjorne-nede-venstre') * s - inn, nedeB = x + w - steinB('hjorne-nede-hoyre') * s + inn;
  const venA = y + steinH('hjorne-oppe-venstre') * s - inn, venB = y + h - steinH('hjorne-nede-venstre') * s + inn;
  const hoyA = y + steinH('hjorne-oppe-hoyre') * s - inn, hoyB = y + h - steinH('hjorne-nede-hoyre') * s + inn;
  if (oppeB > oppeA) {
    const p = planker(oppeB - oppeA, steinB('kant-oppe') * s);
    for (let i = 0; i < p.n; i++) del(ctx, 'kant-oppe', oppeA + i * p.hver, y, 'vo', p.hver / steinB('kant-oppe'), s);
  }
  if (nedeB > nedeA) {
    const p = planker(nedeB - nedeA, steinB('kant-nede') * s);
    for (let i = 0; i < p.n; i++) del(ctx, 'kant-nede', nedeA + i * p.hver, y + h, 'vn', p.hver / steinB('kant-nede'), s);
  }
  if (venB > venA) {
    const p = planker(venB - venA, steinH('kant-venstre') * s);
    for (let i = 0; i < p.n; i++) del(ctx, 'kant-venstre', x, venA + i * p.hver, 'vo', s, p.hver / steinH('kant-venstre'));
  }
  if (hoyB > hoyA) {
    const p = planker(hoyB - hoyA, steinH('kant-hoyre') * s);
    for (let i = 0; i < p.n; i++) del(ctx, 'kant-hoyre', x + w, hoyA + i * p.hver, 'ho', s, p.hver / steinH('kant-hoyre'));
  }

  // 3. hjoernene oppaa, akkurat som de er tegnet
  del(ctx, 'hjorne-oppe-venstre', x, y, 'vo', s, s);
  del(ctx, 'hjorne-oppe-hoyre', x + w, y, 'ho', s, s);
  del(ctx, 'hjorne-nede-venstre', x, y + h, 'vn', s, s);
  del(ctx, 'hjorne-nede-hoyre', x + w, y + h, 'hn', s, s);
  return true;
}

/** Hvor tykk steinkanten blir (i piksler) med en gitt skala - nyttig for padding. */
export function kantTykkelse(s) {
  return data ? steinH('kant-oppe') * s : 0;
}

// ------------------------------------------------------------------
//  Rundt vinduer i menyene
// ------------------------------------------------------------------
// Rammen tegnes i et lerret bak innholdet. Hvor tykk kanten skal vaere styres av
// CSS-variabelen --ramme (f.eks. --ramme: 22px) paa elementet.
const MARG = 24;     // plass rundt til gress og stein som stikker ut

function tegnVindu(el) {
  const c = el._ramme;
  if (!c || !data) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return;                        // skjult - tegnes naar den vises
  const kant = parseFloat(getComputedStyle(el).getPropertyValue('--ramme')) || 22;
  const s = kant / steinH('kant-oppe');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round((w + MARG * 2) * dpr);
  c.height = Math.round((h + MARG * 2) * dpr);
  c.style.width = (w + MARG * 2) + 'px';
  c.style.height = (h + MARG * 2) + 'px';
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w + MARG * 2, h + MARG * 2);
  tegnRamme(ctx, MARG, MARG, w, h, s, 0.45);
  el.classList.add('med-ramme');
}

/** Gir et element (et vindu i menyene) en ramme bygd av delene. */
export function rammeRundt(el) {
  if (!el || el._ramme) return;
  const c = document.createElement('canvas');
  c.className = 'ramme-lerret';
  c.setAttribute('aria-hidden', 'true');
  c.style.left = c.style.top = -MARG + 'px';
  el.prepend(c);
  el._ramme = c;
  vinduer.add(el);
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => tegnVindu(el)).observe(el);
  tegnVindu(el);
}
