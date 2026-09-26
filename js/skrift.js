// skrift.js - spillets egen bildefont, som BitmapText i Phaser.
//
// Bokstavene ligger tegnet i art/font/spillfont.png, og art/font/spillfont.json
// sier hvor hver bokstav er og hvor bred den er (lages av verktoy/lag-font.js).
// Mangler fila, eller et tegn (som + eller en emoji), brukes vanlig tekst.
//
//   tegnTekst(ctx, '+5', x, y, 20, { farge: '#ffd84d' })   i spillets lerret
//   settTekst(element, 'NIVÅ')                              i menyene (HTML)

import { basis } from './sprites.js';

const FIL = 'art/font/spillfont';
let font = null;
let atlas = null;
const ventende = new Set();

function last() {
  if (typeof fetch !== 'function') return;
  fetch(basis() + FIL + '.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.glyfer) return;
      const img = new Image();
      img.onload = () => {
        font = j; atlas = img;
        // alt som ble skrevet foer fonten var klar, tegnes paa nytt
        for (const el of ventende) if (el.isConnected) tegnDom(el, el.dataset.skrift);
        ventende.clear();
      };
      img.src = basis() + FIL + '.png';
    })
    .catch(() => {});
}
// Vent til siden har satt basisstien (verktoeyene i verktoy/ gjoer det).
setTimeout(last, 0);

export function klar() { return !!(font && atlas); }

/** Tegnet for et tegn, eller null (da brukes vanlig tekst for akkurat det tegnet). */
function glyf(ch) {
  return font.glyfer[ch] || null;
}

// ------------------------------------------------------------------
//  I lerretet
// ------------------------------------------------------------------
// Ferdige tekster (bokstavene, fargen og skalaen) gjemmes, saa "+5" ikke bygges
// paa nytt hver eneste ramme. Gamle fjernes naar det blir mange.
const ferdige = new Map();
const MAKS_FERDIGE = 64;

const reserveFont = (hoyde) => 'bold ' + Math.round(hoyde * 1.3) + 'px Spillfont, Verdana, sans-serif';

/** Bredde i piksler naar store bokstaver er 'hoyde' piksler hoeye. */
export function tekstBredde(ctx, tekst, hoyde) {
  if (!klar()) return 0;
  const k = hoyde / font.storrelse;
  let b = 0;
  for (const ch of String(tekst)) {
    if (ch === ' ') { b += font.mellomrom * k; continue; }
    const g = glyf(ch);
    if (g) b += g[5] * k;
    else { ctx.save(); ctx.font = reserveFont(hoyde); b += ctx.measureText(ch).width; ctx.restore(); }
  }
  return b;
}

/**
 * Bygger teksten ferdig farget paa et eget lerret, i skjermens egen oppløsning
 * (s = hvor mye lerretet den skal tegnes i er forstørret), saa den blir skarp.
 */
function bygg(ctx, tekst, hoyde, farge, s) {
  const k = hoyde / font.storrelse;
  const bredde = tekstBredde(ctx, tekst, hoyde);
  let over = font.grunnlinje * k, under = (font.linjehoyde - font.grunnlinje) * k;
  // tegn som ikke finnes i fonten (emoji, +) kan vaere hoeyere eller lavere enn bokstavene
  const strek = Math.max(2, hoyde * 0.2);
  for (const ch of tekst) {
    if (ch === ' ' || glyf(ch)) continue;
    ctx.save(); ctx.font = reserveFont(hoyde);
    const m = ctx.measureText(ch);
    ctx.restore();
    over = Math.max(over, (m.actualBoundingBoxAscent || hoyde) + strek / 2);
    under = Math.max(under, (m.actualBoundingBoxDescent || 0) + strek / 2);
  }
  const W = Math.ceil(bredde + 4), H = Math.ceil(over + under + 4);
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * s); c.height = Math.ceil(H * s);
  const g2 = c.getContext('2d');
  g2.setTransform(s, 0, 0, s, 0, 0);
  g2.imageSmoothingQuality = 'high';
  let px = 2;
  const base = 2 + over;
  for (const ch of tekst) {
    if (ch === ' ') { px += font.mellomrom * k; continue; }
    const g = glyf(ch);
    if (!g) {
      g2.save();
      g2.font = reserveFont(hoyde);
      g2.textBaseline = 'alphabetic';
      g2.lineWidth = strek;
      g2.lineJoin = 'round';
      g2.strokeStyle = '#141a2e';
      g2.strokeText(ch, px, base);
      g2.fillStyle = '#eef0f4';
      g2.fillText(ch, px, base);
      px += g2.measureText(ch).width;
      g2.restore();
      continue;
    }
    const [gx, gy, gw, gh, topp, adv] = g;
    g2.drawImage(atlas, gx, gy, gw, gh, px, base + topp * k, gw * k, gh * k);
    px += adv * k;
  }
  if (farge) {
    // fargen legges bare paa bokstavene, saa skyggene i steinen blir med
    g2.globalCompositeOperation = 'source-atop';
    g2.globalAlpha = 0.55;
    g2.fillStyle = farge;
    g2.fillRect(0, 0, W, H);
  }
  return { c, W, H, over, bredde };
}

/**
 * Tegner tekst med bildefonten. y er grunnlinja. Returnerer false hvis fonten
 * ikke er lastet, saa den som kaller kan tegne vanlig tekst i stedet.
 * o.juster: 'center' (standard), 'left' eller 'right'. o.farge farger bokstavene.
 */
export function tegnTekst(ctx, tekst, x, y, hoyde, o = {}) {
  if (!klar()) return false;
  tekst = String(tekst);
  const m = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const s = Math.min(4, Math.max(1, Math.round(Math.hypot(m.a, m.b) * 4) / 4));
  const nokkel = tekst + '|' + Math.round(hoyde * 4) + '|' + (o.farge || '') + '|' + s;
  let f = ferdige.get(nokkel);
  if (f) { ferdige.delete(nokkel); ferdige.set(nokkel, f); }
  else {
    f = bygg(ctx, tekst, hoyde, o.farge, s);
    ferdige.set(nokkel, f);
    if (ferdige.size > MAKS_FERDIGE) ferdige.delete(ferdige.keys().next().value);
  }
  const venstre = o.juster === 'left' ? x : o.juster === 'right' ? x - f.bredde : x - f.bredde / 2;
  ctx.drawImage(f.c, venstre - 2, y - f.over - 2, f.W, f.H);
  return true;
}

// ------------------------------------------------------------------
//  I menyene (HTML)
// ------------------------------------------------------------------
// Store bokstaver blir 0.88em hoeye - litt stoerre enn i en vanlig skrift, fordi den tykke
// steinkanten spiser litt av bokstaven. font-size i CSS bestemmer stoerrelsen som foer.
const EM = 0.88;

/** Setter teksten i et element med bildefonten (eller vanlig tekst til fonten er lastet). */
export function settTekst(el, tekst) {
  if (!el) return;
  tekst = String(tekst);
  if (el.dataset.skrift === tekst && (el.firstChild || !tekst)) return;
  el.dataset.skrift = tekst;
  if (!klar()) { el.textContent = tekst; ventende.add(el); return; }
  tegnDom(el, tekst);
}

function tegnDom(el, tekst) {
  el.textContent = '';
  el.classList.add('skrift');
  el.setAttribute('aria-label', tekst);
  const e = EM / font.storrelse;
  const url = 'url("' + basis() + FIL + '.png")';
  const str = 'background-image:' + url + ';background-size:' + (font.bredde * e) + 'em ' + (font.hoyde * e) + 'em;';
  for (const ch of tekst) {
    const s = document.createElement('span');
    s.setAttribute('aria-hidden', 'true');
    const g = ch === ' ' ? null : glyf(ch);
    if (ch === ' ') {
      s.className = 'skrift-rom';
      s.style.width = (font.mellomrom * e) + 'em';
    } else if (!g) {
      s.className = 'skrift-mangler';
      s.textContent = ch;
    } else {
      const [gx, gy, gw, gh, topp, adv] = g;
      s.className = 'skrift-tegn';
      s.style.cssText = str + 'width:' + (gw * e) + 'em;height:' + (gh * e) + 'em;' +
        'margin-right:' + ((adv - gw) * e) + 'em;margin-bottom:' + (-(gh + topp) * e) + 'em;' +
        'background-position:' + (-gx * e) + 'em ' + (-gy * e) + 'em;';
    }
    el.appendChild(s);
  }
}

/** Alle elementer med data-tekst i HTML-en faar bildefonten (overskrifter og knappetekst). */
export function skrivOm(rot = document) {
  for (const el of rot.querySelectorAll('[data-tekst]')) settTekst(el, el.dataset.tekst || el.textContent.trim());
}
