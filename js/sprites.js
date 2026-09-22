// sprites.js - laster PNG-figurer og setter dem sammen til noe som beveger seg.
//
// Tre nivaaer, spillet velger det beste som finnes:
//   1. DELER   - art/<mappe>/kropp.png, hode.png, arm-fram.png ...  -> full animasjon
//   2. EN FIL  - art/<mappe>.png                                    -> pustende/hoppende figur
//   3. INGEN   - spillet tegner figuren selv (innebygd strek)
//
// Alle PNG-ene til EN figur skal ha SAMME stoerrelse, figuren tegnet mot
// hoeyre, foettene helt nede og midt i bildet. Se art/LES-MEG.md.

import { TAU, clamp } from './core.js';

// ---------------------------------------------------------------
//  BILDELASTER
// ---------------------------------------------------------------
const cache = new Map();

// Verktoeyet i verktoy/ ligger en mappe ned, og maa lete etter art/ ett hakk opp.
let BASE = '';
export function setBase(b) { BASE = b; }

// Nettleseren husker gjerne at en fil IKKE fantes. Figurtesteren slaar derfor
// paa "alltid hent paa nytt", saa en PNG du nettopp lagde dukker opp med en gang.
let BUST = '';
export function setBust(on) { BUST = on ? '?t=' + Date.now() : ''; }

/** Henter et bilde. Returnerer null til det er lastet, og for alltid om fila ikke finnes. */
export function tex(path) {
  const full = BASE + path;
  let e = cache.get(full);
  if (!e) {
    e = { state: 'loading', img: new Image() };
    cache.set(full, e);
    e.img.onload = () => { e.state = e.img.naturalWidth > 0 ? 'ok' : 'fail'; };
    e.img.onerror = () => { e.state = 'fail'; };
    e.img.src = full + BUST;
  }
  return e.state === 'ok' ? e.img : null;
}

/** Sant saa lenge vi ikke vet om fila finnes. Da venter vi med aa gi opp. */
export function pending(path) {
  const e = cache.get(BASE + path);
  return !e || e.state === 'loading';
}

/** 'ok' | 'fail' | 'loading' - brukt av figurtesteren. */
export function status(path) {
  const e = cache.get(BASE + path);
  return e ? e.state : 'loading';
}

export function preload(paths) { paths.forEach(tex); }

// ---------------------------------------------------------------
//  STANDARD DREIEPUNKT PER KROPPSDEL
//  (x, y som andel av bildet: 0,0 = oeverst til venstre, 1,1 = nederst til hoeyre)
// ---------------------------------------------------------------
const PIVOT = {
  'kropp':     [0.50, 0.50],
  'hode':      [0.50, 0.42],
  'arm-bak':   [0.50, 0.42],
  'arm-fram':  [0.50, 0.42],
  'bein-bak':  [0.50, 0.58],
  'bein-fram': [0.50, 0.58],
  'vinge-bak': [0.50, 0.42],
  'vinge-fram':[0.50, 0.42],
  'hale':      [0.42, 0.62],
  'vapen':     [0.50, 0.42],
  'rygg':      [0.50, 0.46],
};

// ---------------------------------------------------------------
//  BEVEGELSER
//  Hver returnerer { rot, dx, dy } i radianer / andel av figurhoeyden.
// ---------------------------------------------------------------
const MOVES = {
  ingen: () => ({}),

  // gaa: beinet svinger fram og tilbake
  gaa: (p, s) => ({ rot: Math.sin(s.walk + (p.fase || 0)) * (p.styrke ?? 0.42) * s.move }),

  // arm som svinger motsatt av beina
  sving: (p, s) => ({ rot: Math.sin(s.walk + (p.fase ?? Math.PI)) * (p.styrke ?? 0.30) * s.move }),

  // kroppen duver litt opp og ned
  duv: (p, s) => ({
    dy: -Math.abs(Math.sin(s.walk)) * 0.025 * s.move - Math.sin(s.t * 2) * 0.006,
  }),

  // hodet duver motsatt, saa det ser levende ut
  nikk: (p, s) => ({
    rot: Math.sin(s.walk * 2) * 0.05 * s.move + Math.sin(s.t * 1.7) * 0.03,
    dy: -Math.abs(Math.sin(s.walk)) * 0.02 * s.move,
  }),

  // vinger som flakser
  vinge: (p, s) => ({ rot: Math.sin(s.t * (p.fart ?? 9) + (p.fase || 0)) * (p.styrke ?? 0.55) }),

  // hale som logrer
  hale: (p, s) => ({ rot: Math.sin(s.t * 2.4 + (p.fase || 0)) * (p.styrke ?? 0.18) }),

  // vaapenarm: sikter og rykker bakover naar den skyter
  sikte: (p, s) => ({
    rot: (s.aim || 0) * 0.5 - (s.recoil || 0) * 0.55,
    dx: -(s.recoil || 0) * 0.05,
  }),

  // hammer som slaar
  slag: (p, s) => ({ rot: -(s.smash || 0) * 2.4 + Math.sin(s.walk + Math.PI) * 0.2 * s.move }),
};

// ---------------------------------------------------------------
//  TEGNING
// ---------------------------------------------------------------

/**
 * Tegner en figur satt sammen av PNG-deler.
 * @returns true hvis noe ble tegnet, false hvis spillet maa tegne figuren selv.
 *
 * s = { x, y (under foettene), h (hoeyde), facing, walk, move, t,
 *       aim, recoil, smash, flash, variants }
 */
export function drawRig(ctx, rig, s) {
  const base = rig.mappe;

  // --- Nivaa 1: separate deler ---
  const bodyPath = partPath(rig, base, 'kropp', s.variants);
  const bodyImg = bodyPath && tex(bodyPath);
  if (bodyImg) {
    const ratio = bodyImg.naturalWidth / bodyImg.naturalHeight;
    const boxH = s.h * (rig.fyll ?? 1);
    const boxW = boxH * ratio;
    const parts = rig.deler.slice().sort((a, b) => (a.z || 0) - (b.z || 0));

    const paint = (c) => {
      for (const p of parts) {
        const path = partPath(rig, base, p.navn, s.variants);
        const img = path && tex(path);
        if (!img) continue;
        drawPart(c, img, p, s, boxW, boxH);
      }
    };

    if (s.flash) {
      // Blink: tegn figuren paa et eget lerret og farg BARE pikslene som
      // faktisk ble tegnet. (Foer ble det en stygg hvit firkant rundt.)
      const pad = boxH * 0.4;
      const sw = boxW + pad * 2, sh = boxH + pad * 2;
      const sc = scratch(sw, sh);
      sc.clearRect(0, 0, sw, sh);
      sc.save();
      sc.translate(pad + boxW / 2, pad + boxH);
      sc.scale((s.facing >= 0 ? 1 : -1), 1);
      paint(sc);
      sc.globalCompositeOperation = 'source-atop';
      sc.fillStyle = 'rgba(255,255,255,0.8)';
      sc.fillRect(-sw, -sh, sw * 2, sh * 2);
      sc.restore();
      sc.globalCompositeOperation = 'source-over';
      ctx.drawImage(scratchCanvas, 0, 0, sw, sh,
        s.x - pad - boxW / 2, s.y - pad - boxH, sw, sh);
    } else {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale((s.facing >= 0 ? 1 : -1), 1);
      paint(ctx);
      ctx.restore();
    }
    return true;
  }
  if (bodyPath && pending(bodyPath)) return false; // vent - kanskje den kommer

  // --- Nivaa 2: en enkelt PNG for hele figuren ---
  const onePath = base + '.png';
  const one = tex(onePath);
  if (one) {
    const ratio = one.naturalWidth / one.naturalHeight;
    const boxH = s.h * (rig.fyll ?? 1);
    const boxW = boxH * ratio;
    const sq = 1 + Math.sin(s.t * 5 + (s.seed || 0)) * 0.03 +
      Math.abs(Math.sin(s.walk)) * 0.04 * s.move;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale((s.facing >= 0 ? 1 : -1) * (2 - sq), sq);
    if (s.flash) {
      const sc = scratch(boxW, boxH);
      sc.clearRect(0, 0, boxW, boxH);
      sc.drawImage(one, 0, 0, boxW, boxH);
      sc.globalCompositeOperation = 'source-atop';
      sc.fillStyle = 'rgba(255,255,255,0.8)';
      sc.fillRect(0, 0, boxW, boxH);
      sc.globalCompositeOperation = 'source-over';
      ctx.drawImage(scratchCanvas, 0, 0, boxW, boxH, -boxW / 2, -boxH, boxW, boxH);
    } else {
      ctx.drawImage(one, -boxW / 2, -boxH, boxW, boxH);
    }
    ctx.restore();
    return true;
  }

  return false; // ingen PNG - spillet tegner selv
}

function drawPart(ctx, img, p, s, boxW, boxH) {
  const piv = p.dreiepunkt || PIVOT[p.navn] || [0.5, 0.5];
  // dreiepunktet i lokale koordinater (0,0 = midt under foettene)
  const px = (piv[0] - 0.5) * boxW;
  const py = (piv[1] - 1) * boxH;

  const move = MOVES[p.beveg || 'ingen'] || MOVES.ingen;
  const m = move(p, s) || {};

  ctx.save();
  ctx.translate(px + (m.dx || 0) * boxH, py + (m.dy || 0) * boxH);
  if (m.rot) ctx.rotate(m.rot);
  ctx.translate(-px, -py);
  ctx.drawImage(img, -boxW / 2, -boxH, boxW, boxH);
  ctx.restore();
}

// Ekstra lerret brukt til blinket, slik at bare selve figuren lyser opp.
let scratchCanvas = null, scratchCtx = null;
function scratch(w, h) {
  if (!scratchCanvas) {
    scratchCanvas = document.createElement('canvas');
    scratchCtx = scratchCanvas.getContext('2d');
  }
  if (scratchCanvas.width < w || scratchCanvas.height < h) {
    scratchCanvas.width = Math.ceil(w);
    scratchCanvas.height = Math.ceil(h);
  }
  return scratchCtx;
}

/**
 * Finner riktig fil for en kroppsdel.
 * Har du kjoept kanon niva 3 leter spillet etter, i denne rekkefoelgen:
 *   arm-fram-kanon3.png -> -kanon2 -> -kanon1 -> arm-fram.png
 * Saa du kan lage bare en av dem, eller alle fem.
 */
function partPath(rig, base, navn, variants) {
  const v = rig.variant && rig.variant[navn];
  if (v && variants) {
    const lvl = variants[v] | 0;
    for (let i = lvl; i >= 1; i--) {
      const p = base + '/' + navn + '-' + v + i + '.png';
      if (tex(p)) return p;
      if (pending(p)) return p; // vent til vi vet
    }
  }
  return base + '/' + navn + '.png';
}

/** Alle filnavn en figur kan tenkes aa bruke - brukt til forhaandslasting. */
export function rigPaths(rig, maxVariant = 5) {
  const out = [rig.mappe + '.png'];
  for (const p of rig.deler) {
    out.push(rig.mappe + '/' + p.navn + '.png');
    const v = rig.variant && rig.variant[p.navn];
    if (v) for (let i = 1; i <= maxVariant; i++) out.push(rig.mappe + '/' + p.navn + '-' + v + i + '.png');
  }
  return out;
}
