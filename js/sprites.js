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

  // vaapenarm: peker dit du sikter, og rykker bakover naar den skyter
  sikte: (p, s) => ({
    rot: (s.aim || 0) - (s.recoil || 0) * 0.3,
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
// ---------------------------------------------------------------
//  EGEN RIGG FRA FIL
//  Lagrer du art/<figur>/rigg.json fra rigg-redigereren, brukes den
//  i stedet for oppsettet i js/rigs.js. Da slipper du aa roere koden.
// ---------------------------------------------------------------
const rigFile = new Map();
function customRig(rig) {
  const key = rig.mappe;
  if (!rigFile.has(key)) {
    rigFile.set(key, null);
    fetch(BASE + key + '/rigg.json' + BUST)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && Array.isArray(j.deler)) rigFile.set(key, j); })
      .catch(() => { /* finnes ikke - helt greit */ });
  }
  return rigFile.get(key);
}

export function drawRig(ctx, rig, s) {
  const egen = customRig(rig);
  if (egen) rig = Object.assign({}, rig, egen);
  const base = rig.mappe;

  // --- Plassert rigg: hver del er sitt eget bilde, og riggen sier hvor
  //     paa figuren den hoerer hjemme. Brukes naar delene er tegnet hver
  //     for seg i stedet for som lag oppaa hverandre. ---
  if (rig.plassert) return drawPlaced(ctx, rig, s);

  // --- Nivaa 1: separate deler paa felles lerret ---
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

/**
 * Plassert rigg - for deler som er tegnet hver for seg i hvert sitt bilde.
 * Hver del festes med et LEDD: du sier hvor leddet er i bildet, og hvor det
 * leddet sitter paa figuren. Da faller alt paa plass av seg selv.
 *
 *   fest:    [x, y]  hvor leddet er i delens eget bilde (0-1)
 *   paa:     [x, y]  hvor det leddet sitter paa figuren. Andel av
 *                    figurhoeyden, (0,0) er midt mellom foettene, y opp = minus
 *   h:       hoeyde paa delen, andel av figurhoeyden
 *   omkring: [x, y]  roter om et annet punkt enn leddet (f.eks. vaapen som
 *                    skal svinge om skulderen, ikke om haanda)
 *   speil:   true    speilvend delen
 *   vinkel:  fast helning i radianer
 *   krever:  'kanon' vis delen foerst naar den oppgraderingen er kjoept
 */
/**
 * Regner ut hvor hver del havner. Brukes baade av spillet og av
 * rigg-redigereren (verktoy/rigger.html), saa de aldri kommer i utakt.
 */
export function placedLayout(rig, s) {
  const H = s.h;
  const base = rig.mappe;
  const out = [];
  let waiting = false;
  for (const p of rig.deler) {
    if (p.av) continue;
    if (p.krever && !(s.variants && (s.variants[p.krever] | 0) > 0)) continue;
    const path = partPath(rig, base, p.navn, s.variants);
    const img = p.bilde || tex(path);
    if (!img) { if (pending(path)) waiting = true; continue; }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const ph = H * (p.h || 0.4);
    const pw = ph * (iw / ih);
    const paa = p.paa || [0, -0.5];
    const om = p.omkring;
    const move = MOVES[p.beveg || 'ingen'] || MOVES.ingen;
    const m = move(p, s) || {};
    out.push({
      p, img, pw, ph,
      jx: p.fest ? p.fest[0] : 0.5,
      jy: p.fest ? p.fest[1] : 0.5,
      ax: paa[0] * H, ay: paa[1] * H,
      rx: (om ? om[0] : paa[0]) * H, ry: (om ? om[1] : paa[1]) * H,
      rot: (p.vinkel || 0) + (m.rot || 0),
      dx: (m.dx || 0) * H, dy: (m.dy || 0) * H,
    });
  }
  out.sort((a, b) => (a.p.z || 0) - (b.p.z || 0));
  out.waiting = waiting;
  return out;
}

/** Tegner en ferdig utregnet del. */
export function paintPart(c, L) {
  c.save();
  c.translate(L.dx, L.dy);
  if (L.rot) { c.translate(L.rx, L.ry); c.rotate(L.rot); c.translate(-L.rx, -L.ry); }
  c.translate(L.ax, L.ay);
  if (L.p.speil) c.scale(-1, 1);
  c.drawImage(L.img, -L.jx * L.pw, -L.jy * L.ph, L.pw, L.ph);
  c.restore();
}

function drawPlaced(ctx, rig, s) {
  const H = s.h;
  const layout = placedLayout(rig, s);
  if (!layout.length) return false;
  const paint = (c) => { for (const L of layout) paintPart(c, L); };

  if (s.flash) {
    const bw = H * 1.9, bh = H * 1.7;
    const ox = bw * 0.5, oy = bh * 0.85;       // der foettene staar i lerretet
    const sc = scratch(bw, bh);
    sc.clearRect(0, 0, bw, bh);
    sc.save();
    sc.translate(ox, oy);
    sc.scale(s.facing >= 0 ? 1 : -1, 1);
    paint(sc);
    sc.globalCompositeOperation = 'source-atop';
    sc.fillStyle = 'rgba(255,255,255,0.8)';
    sc.fillRect(-bw, -bh, bw * 2, bh * 2);
    sc.restore();
    sc.globalCompositeOperation = 'source-over';
    ctx.drawImage(scratchCanvas, 0, 0, bw, bh, s.x - ox, s.y - oy, bw, bh);
  } else {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing >= 0 ? 1 : -1, 1);
    paint(ctx);
    ctx.restore();
  }
  return true;
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
/**
 * Vanlige alternative filnavn. Har du doept fila arm_foran.png i stedet for
 * arm-fram.png finner spillet den likevel.
 */
const ALIAS = {
  'arm-fram': ['arm_foran', 'arm-foran', 'arm_fram', 'arm_front'],
  'arm-bak': ['arm_bak', 'arm-bakre'],
  'bein-fram': ['fot_foran', 'fot-foran', 'bein_fram', 'fot_fram', 'ben-fram', 'ben_foran'],
  'bein-bak': ['fot_bak', 'fot-bak', 'bein_bak', 'ben-bak', 'ben_bak'],
  'vapen': ['canon', 'kanon', 'vaapen', 'gun'],
  'rygg': ['jetpack', 'jet', 'ryggsekk'],
  'hode': ['hodet', 'head'],
  'kropp': ['body', 'torso'],
  'hale': ['tail'],
  'vinge-fram': ['vinge_foran', 'vinge-foran'],
  'vinge-bak': ['vinge_bak'],
};

function partPath(rig, base, navn, variants) {
  const v = rig.variant && rig.variant[navn];
  const names = [navn].concat(ALIAS[navn] || []);
  if (v && variants) {
    const lvl = variants[v] | 0;
    for (let i = lvl; i >= 1; i--) {
      for (const n of names) {
        const p = base + '/' + n + '-' + v + i + '.png';
        if (tex(p)) return p;
        if (pending(p)) return p;   // vent til vi vet om den finnes
      }
    }
  }
  for (const n of names) {
    const p = base + '/' + n + '.png';
    if (tex(p)) return p;
    if (pending(p)) return p;
  }
  return base + '/' + navn + '.png';
}

/** Alle filnavn en figur kan tenkes aa bruke - brukt til forhaandslasting. */
export function rigPaths(rig, maxVariant = 5) {
  const out = [rig.mappe + '.png'];
  for (const p of rig.deler) {
    for (const n of [p.navn].concat(ALIAS[p.navn] || [])) {
      out.push(rig.mappe + '/' + n + '.png');
      const v = rig.variant && rig.variant[p.navn];
      if (v) for (let i = 1; i <= maxVariant; i++) out.push(rig.mappe + '/' + n + '-' + v + i + '.png');
    }
  }
  return out;
}
