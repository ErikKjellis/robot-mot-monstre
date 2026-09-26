// art.js - spillets innebygde strektegning.
//
// Dette er RESERVELOESNINGEN: har du lagt inn egne PNG-figurer i art/-mappa
// brukes de i stedet (se js/sprites.js og art/LES-MEG.md). Ingen bildefiler
// trengs for at spillet skal se ferdig ut.

import { TAU, clamp } from './core.js';
import { tex } from './sprites.js';
import { tegnTekst } from './skrift.js';

export const OUT = '#141a2e';

// ------------------------------------------------------------------
//  EGNE BILDER FOR BANEN OG TINGENE I DEN
//  art/bane/<tema>/  himmel, sol, langt, midt, naer, bakke, plattform, port
//  art/ting/         mynt, hjerte, lyn, stjerne, skudd-1 ... skudd-5, fiendeskudd
//  art/effekter/     fiendeskuddene, sjokkboelgen, poff, treff, slag, jetflamme, stoev
//  Finnes ikke fila, tegnes det som foer. Se art/LES-MEG.md.
// ------------------------------------------------------------------
export const BANE_BILDER = ['himmel', 'sol', 'langt', 'midt', 'naer', 'bakke', 'plattform', 'port'];
export const TING_BILDER = ['mynt', 'hjerte', 'lyn', 'stjerne', 'skudd-1', 'skudd-2', 'skudd-3',
  'skudd-4', 'skudd-5', 'fiendeskudd'];
export const EFFEKT_BILDER = ['ildkule', 'iskule', 'magikule', 'giftkule', 'kongekule', 'sjokkbolge',
  'poff', 'treff', 'slag', 'slag-1', 'slag-2', 'slag-3', 'slag-4', 'slag-5', 'jetflamme', 'stov'];
export const banePath = (th, navn) => 'art/bane/' + th.key + '/' + navn + '.png';
export const tingPath = (navn) => 'art/ting/' + navn + '.png';
export const effektPath = (navn) => 'art/effekter/' + navn + '.png';
const baneBilde = (th, navn) => (th.key ? tex(banePath(th, navn)) : null);
const tingBilde = (navn) => tex(tingPath(navn));
export const effektBilde = (navn) => tex(effektPath(navn));

// Hvilket bilde et fiendeskudd faar, ut fra fargen det skytes med (se content.js
// og bossAI i game.js). Mangler bildet, brukes fiendeskudd.png, og ellers en kule.
const SKUDD_BILDE = {
  '#ff9a3d': 'ildkule', '#bdf0ff': 'iskule', '#c9a3ff': 'magikule',
  '#8ef0c0': 'giftkule', '#ff6b6b': 'kongekule',
};

/** Begynner aa hente bildene for et tema (og tingene og effektene) med en gang. */
export function lastTema(th) {
  if (th.key) BANE_BILDER.forEach((n) => tex(banePath(th, n)));
  TING_BILDER.forEach((n) => tex(tingPath(n)));
  EFFEKT_BILDER.forEach((n) => tex(effektPath(n)));
}

// --- smaa hjelpere ------------------------------------------------
export function rr(ctx, x, y, w, h, r, fill, stroke, lw) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function circ(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath();
  ctx.arc(x, y, Math.abs(r), 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function ell(ctx, x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function poly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

function shadow(ctx, x, y, rx, a) {
  ctx.save();
  ctx.globalAlpha = a == null ? 0.25 : a;
  ell(ctx, x, y, rx, rx * 0.24, '#000');
  ctx.restore();
}

const h1 = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
const h2 = (i) => { const x = Math.sin(i * 311.7 + 7.3) * 24634.6345; return x - Math.floor(x); };

// ==================================================================
//  ROBOTEN
//  Starter som en liten enkel boks og bygges ut for hver oppgradering.
// ==================================================================
const M_LIGHT = '#cfdcf2';
const M_MAIN = '#93a7c7';
const M_DARK = '#5d6f91';
const GOLD = '#f7c33a';
const GOLD_D = '#b98708';
const VISOR = '#5ee6ff';
const LASER_RED = '#ff4d6d';

export function drawRobot(ctx, cx, by, h, o = {}) {
  const up = o.up || {};
  const kanon = up.kanon | 0, laser = up.laser | 0, hammer = up.hammer | 0;
  const bein = up.bein | 0, panser = up.panser | 0, jet = up.jet | 0;
  const total = kanon + laser + hammer + bein + panser + jet;

  const f = o.facing >= 0 ? 1 : -1;
  const lw = Math.max(2, h * 0.026);
  const main = o.flash ? '#ffffff' : M_MAIN;
  const dark = o.flash ? '#e6ecff' : M_DARK;
  const gold = total >= 10;

  const legH = h * (0.26 + bein * 0.008);
  const bodyH = h * 0.40;
  const headH = h * 0.26;
  const bodyW = h * (0.54 + panser * 0.022);
  const headW = h * (0.42 + laser * 0.012);

  const walk = o.walk || 0;
  const moving = !!o.moving;
  const air = !o.onGround;
  const swing = air ? 0 : moving ? Math.sin(walk) : 0;
  const bob = air ? 0 : moving ? Math.abs(Math.sin(walk)) * h * 0.018 : Math.sin((o.t || 0) * 2) * h * 0.008;

  ctx.save();
  ctx.translate(cx, by);
  if (o.shadow !== false) shadow(ctx, 0, 0, h * 0.32, air ? 0.13 : 0.26);
  ctx.scale(f, 1);
  ctx.lineJoin = 'round';

  const bodyTop = -(legH + bodyH) - bob;
  const headTop = bodyTop - headH;

  // ---------- JETPACK (rygg) ----------
  if (jet > 0) {
    const jw = h * (0.16 + jet * 0.012), jh = bodyH * (0.62 + jet * 0.03);
    rr(ctx, -bodyW * 0.52 - jw * 0.55, bodyTop + bodyH * 0.12, jw, jh, h * 0.04, dark, OUT, lw);
    rr(ctx, -bodyW * 0.52 - jw * 0.35, bodyTop + bodyH * 0.18, jw * 0.42, jh * 0.3, h * 0.02, GOLD);
    if (air) {
      const fl = h * (0.10 + 0.05 * Math.sin((o.t || 0) * 40)) * (0.7 + jet * 0.1);
      poly(ctx, [
        [-bodyW * 0.52 - jw * 0.55, bodyTop + bodyH * 0.12 + jh],
        [-bodyW * 0.52 + jw * 0.45, bodyTop + bodyH * 0.12 + jh],
        [-bodyW * 0.52 - jw * 0.05, bodyTop + bodyH * 0.12 + jh + fl],
      ], '#ffb347');
      poly(ctx, [
        [-bodyW * 0.52 - jw * 0.3, bodyTop + bodyH * 0.12 + jh],
        [-bodyW * 0.52 + jw * 0.2, bodyTop + bodyH * 0.12 + jh],
        [-bodyW * 0.52 - jw * 0.05, bodyTop + bodyH * 0.12 + jh + fl * 0.55],
      ], '#fff0b0');
    }
  }

  // ---------- BEIN ----------
  const legW = h * (0.12 + bein * 0.011);
  for (const s of [-1, 1]) {
    const dx = s * h * 0.14;
    const off = air ? (s > 0 ? -h * 0.05 : h * 0.03) : swing * h * 0.07 * s;
    rr(ctx, dx - legW / 2 + off, -legH - bob, legW, legH + bob + h * 0.02, legW * 0.4, s > 0 ? main : dark, OUT, lw);
    if (bein >= 2) { // knebeskytter
      rr(ctx, dx - legW * 0.62 + off, -legH * 0.55 - bob, legW * 1.24, legH * 0.3, legW * 0.3, gold ? GOLD : M_LIGHT, OUT, lw * 0.7);
    }
    rr(ctx, dx - legW * 0.78 + off, -h * 0.045, legW * 1.56, h * 0.055, h * 0.02, dark, OUT, lw);
  }

  // ---------- BAKARM / HAMMER ----------
  const armY = bodyTop + bodyH * 0.34;
  const smash = o.smash || 0;
  ctx.save();
  ctx.translate(-bodyW * 0.46, armY);
  ctx.rotate(-smash * 2.2);
  rr(ctx, -h * 0.055, 0, h * 0.11, bodyH * 0.52, h * 0.05, dark, OUT, lw);
  if (hammer > 0) {
    const hw = h * (0.13 + hammer * 0.028), hh = h * (0.09 + hammer * 0.018);
    const hy = bodyH * 0.52;
    rr(ctx, -h * 0.03, hy - h * 0.02, h * 0.06, h * 0.10, h * 0.02, '#8a5a2b', OUT, lw * 0.8);
    rr(ctx, -hw / 2, hy + h * 0.06, hw, hh, h * 0.02, hammer >= 3 ? GOLD : '#b8c2d4', OUT, lw);
    rr(ctx, -hw / 2 + hw * 0.08, hy + h * 0.075, hw * 0.24, hh * 0.5, h * 0.01, M_LIGHT);
  }
  ctx.restore();

  // ---------- KROPP ----------
  rr(ctx, -bodyW / 2, bodyTop, bodyW, bodyH, h * 0.08, main, OUT, lw);
  rr(ctx, -bodyW / 2 + h * 0.03, bodyTop + h * 0.025, bodyW - h * 0.06, bodyH * 0.22, h * 0.035, M_LIGHT);
  if (panser > 0) {
    // brystplate
    rr(ctx, -bodyW * 0.28, bodyTop + bodyH * 0.32, bodyW * 0.56, bodyH * 0.44, h * 0.03,
      gold ? GOLD : dark, gold ? GOLD_D : OUT, lw * 0.8);
    // skulderplater
    for (const s of [-1, 1]) {
      const pw = h * (0.10 + panser * 0.022);
      rr(ctx, s * bodyW * 0.5 - pw / 2, bodyTop - h * 0.015, pw, h * (0.08 + panser * 0.014), h * 0.03,
        gold ? GOLD : M_LIGHT, OUT, lw * 0.8);
    }
    for (let i = 0; i < panser; i++) {
      rr(ctx, -bodyW * 0.2 + i * (bodyW * 0.09), bodyTop + bodyH * 0.40, bodyW * 0.055, bodyH * 0.26, h * 0.01, VISOR);
    }
  }

  // ---------- KANONARM ----------
  // Hvert kanonnivaa er et HELT nytt vaapen, ikke bare et lengre roer.
  ctx.save();
  ctx.translate(bodyW * 0.3, armY + bodyH * 0.1);
  ctx.rotate((o.aim || 0) - (o.flashShot || 0) * 0.25);
  rr(ctx, -h * 0.05, -h * 0.06, h * 0.14, h * 0.13, h * 0.05, main, OUT, lw);
  const tip = drawCannon(ctx, h, kanon, lw, main, dark, gold);
  if (kanon > 0 && o.flashShot > 0) {
    const r = h * (0.09 + kanon * 0.012) * o.flashShot;
    circ(ctx, tip + r * 0.4, 0, r, kanon >= 4 ? '#ffd0f0' : '#fff6c0');
    circ(ctx, tip + r * 0.4, 0, r * 0.55, '#ffffff');
  }
  ctx.restore();

  // ---------- HODE ----------
  rr(ctx, -headW / 2, headTop, headW, headH, h * 0.06, main, OUT, lw);
  rr(ctx, -headW / 2 + h * 0.025, headTop + h * 0.02, headW - h * 0.05, headH * 0.2, h * 0.025, M_LIGHT);
  rr(ctx, -headW * 0.36, headTop + headH * 0.34, headW * 0.8, headH * 0.36, h * 0.018, '#16233c', OUT, lw * 0.7);

  if (laser > 0) {
    // laseroeyne - lyser roedt og lader opp
    const glow = 0.55 + 0.45 * Math.sin((o.t || 0) * 5);
    ctx.save();
    ctx.globalAlpha = 0.35 * glow;
    circ(ctx, headW * 0.06, headTop + headH * 0.52, h * (0.05 + laser * 0.008), LASER_RED);
    ctx.restore();
    rr(ctx, -headW * 0.2, headTop + headH * 0.4, headW * 0.26, headH * 0.2, h * 0.01, LASER_RED);
    rr(ctx, headW * 0.12, headTop + headH * 0.4, headW * (0.16 + laser * 0.02), headH * 0.2, h * 0.01, LASER_RED);
    if (laser >= 3) { // sikteantenne
      ctx.strokeStyle = OUT; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(headW * 0.2, headTop); ctx.lineTo(headW * 0.34, headTop - h * 0.09); ctx.stroke();
      circ(ctx, headW * 0.34, headTop - h * 0.1, h * 0.028, LASER_RED, OUT, lw * 0.6);
    }
  } else {
    rr(ctx, -headW * 0.2, headTop + headH * 0.4, headW * 0.26, headH * 0.2, h * 0.01, VISOR);
    rr(ctx, headW * 0.14, headTop + headH * 0.4, headW * 0.16, headH * 0.2, h * 0.01, VISOR);
  }
  rr(ctx, headW * 0.46, headTop + headH * 0.38, h * 0.045, headH * 0.3, h * 0.018, dark, OUT, lw * 0.8);

  // antenne med blinkende lys
  ctx.strokeStyle = OUT; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(-headW * 0.14, headTop); ctx.lineTo(-headW * 0.22, headTop - h * 0.09); ctx.stroke();
  circ(ctx, -headW * 0.22, headTop - h * 0.11, h * 0.032, ((o.t || 0) % 1) < 0.5 ? '#ff6b6b' : '#ffd7d7', OUT, lw * 0.7);

  ctx.restore();

  // skjoldboble utenfor speilingen, saa den alltid er rund
  if (o.shieldOn) {
    ctx.save();
    ctx.globalAlpha = 0.13 + 0.05 * Math.sin((o.t || 0) * 8);
    circ(ctx, cx, by - h * 0.5, h * 0.62, '#7fe8ff');
    ctx.globalAlpha = 0.6;
    circ(ctx, cx, by - h * 0.5, h * 0.62, null, '#bff4ff', Math.max(2, h * 0.028));
    ctx.restore();
  }
}

/**
 * Tegner vaapenet for et gitt kanonnivaa. Returnerer hvor munningen er,
 * slik at muzzle-blaffet havner paa rett sted.
 *   0 klo  1 pistol  2 rifle  3 dobbeltloep  4 gatling  5 energikanon
 */
function drawCannon(ctx, h, lvl, lw, main, dark, gold) {
  const metal = gold ? GOLD : dark;
  const x0 = h * 0.05;

  if (lvl <= 0) {
    rr(ctx, x0, -h * 0.035, h * 0.10, h * 0.07, h * 0.03, dark, OUT, lw);
    return x0 + h * 0.10;
  }

  if (lvl === 1) {
    // liten pistol
    const len = h * 0.26, r = h * 0.075;
    rr(ctx, x0, -r / 2, len, r, r * 0.4, metal, OUT, lw);
    rr(ctx, x0 + len - h * 0.03, -r * 0.8, h * 0.04, r * 1.6, h * 0.015, M_LIGHT, OUT, lw * 0.7);
    return x0 + len;
  }

  if (lvl === 2) {
    // rifle med sikte paa toppen
    const len = h * 0.36, r = h * 0.085;
    rr(ctx, x0, -r / 2, len, r, r * 0.35, metal, OUT, lw);
    rr(ctx, x0 + h * 0.05, -r * 1.35, h * 0.12, r * 0.7, h * 0.015, dark, OUT, lw * 0.7);
    circ(ctx, x0 + h * 0.11, -r * 1.0, h * 0.022, VISOR, OUT, lw * 0.6);
    rr(ctx, x0 + len - h * 0.04, -r * 0.85, h * 0.05, r * 1.7, h * 0.018, M_LIGHT, OUT, lw * 0.7);
    return x0 + len;
  }

  if (lvl === 3) {
    // to loep ved siden av hverandre
    const len = h * 0.40, r = h * 0.062;
    for (const s of [-1, 1]) {
      rr(ctx, x0, s * r * 0.85 - r / 2, len, r, r * 0.4, metal, OUT, lw * 0.9);
      rr(ctx, x0 + len - h * 0.035, s * r * 0.85 - r * 0.78, h * 0.045, r * 1.56, h * 0.015, M_LIGHT, OUT, lw * 0.6);
    }
    rr(ctx, x0, -r * 1.5, h * 0.12, r * 3, h * 0.02, dark, OUT, lw * 0.8);
    rr(ctx, x0 + h * 0.03, -r * 0.5, h * 0.06, r, h * 0.01, VISOR);
    return x0 + len;
  }

  if (lvl === 4) {
    // gatling med roterende tromme
    const len = h * 0.46, r = h * 0.11;
    circ(ctx, x0 + h * 0.09, 0, r * 0.95, dark, OUT, lw);
    for (let i = -1; i <= 1; i++) {
      rr(ctx, x0 + h * 0.08, i * r * 0.62 - h * 0.022, len - h * 0.06, h * 0.044, h * 0.018,
        i === 0 ? M_LIGHT : metal, OUT, lw * 0.8);
    }
    circ(ctx, x0 + h * 0.09, 0, r * 0.34, gold ? '#fff0b0' : VISOR, OUT, lw * 0.6);
    return x0 + len;
  }

  // lvl 5: energikanon med traktmunning og glodende kjerne
  const len = h * 0.44, r = h * 0.1;
  rr(ctx, x0, -r * 0.62, len * 0.7, r * 1.24, r * 0.4, metal, OUT, lw);
  circ(ctx, x0 + len * 0.3, 0, r * 0.52, '#ff6bd6', OUT, lw * 0.7);
  circ(ctx, x0 + len * 0.3, 0, r * 0.26, '#ffffff');
  // trakt
  poly(ctx, [
    [x0 + len * 0.66, -r * 0.7], [x0 + len, -r * 1.35],
    [x0 + len, r * 1.35], [x0 + len * 0.66, r * 0.7],
  ], M_LIGHT, OUT, lw);
  for (const s of [-1, 1]) {
    poly(ctx, [
      [x0 + len * 0.86, s * r * 1.1], [x0 + len * 1.16, s * r * 1.5],
      [x0 + len * 0.98, s * r * 0.62],
    ], '#ff6bd6', OUT, lw * 0.6);
  }
  return x0 + len;
}

/** Robotens hodehoeyde over bakken - der laserstraalen starter. */
export function robotEyeY(h) { return -(h * 0.26 + h * 0.40 + h * 0.13); }

export function renderBotPreview(canvas, up, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  drawRobot(ctx, W / 2, H - H * 0.06, H * 0.84, {
    up, facing: 1, t, onGround: true, moving: false,
  });
}

// ==================================================================
//  MONSTRE
// ==================================================================
const SHAPE = {
  smaadrage: 'drage', ildoegle: 'oegle', flygedrage: 'flyger',
  isoegle: 'oegle', steintroll: 'troll', skyggedrage: 'flyger',
  godzaur: 'drage', roddrage: 'flyger', hydra: 'hydra',
  frostdragen: 'flyger', kolossen: 'koloss', kongedragen: 'drage',
};

function eye(ctx, x, y, r, look, angry, color) {
  circ(ctx, x, y, r, '#ffffff', OUT, r * 0.34);
  circ(ctx, x + look * r * 0.32, y + r * 0.08, r * 0.46, color || '#1b2340');
  if (angry) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = r * 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.15, y - r * 1.3);
    ctx.lineTo(x + r * 0.95, y - r * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

/** Ryggpigger langs en linje - gir dragene silhuetten sin. */
function spikes(ctx, x0, y0, x1, y1, n, size, color) {
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 0.7) / n;
    const ax = x0 + (x1 - x0) * t0, ay = y0 + (y1 - y0) * t0;
    const bx = x0 + (x1 - x0) * t1, by2 = y0 + (y1 - y0) * t1;
    const mx = (ax + bx) / 2, my = (ay + by2) / 2;
    const s = size * (0.6 + Math.sin(t0 * Math.PI) * 0.7);
    poly(ctx, [[ax, ay], [bx, by2], [mx, my - s]], color, OUT, size * 0.22);
  }
}

function tail(ctx, x, y, len, thick, dir, wag, color, lwv) {
  ctx.beginPath();
  ctx.moveTo(x, y - thick);
  ctx.quadraticCurveTo(x + dir * len * 0.6, y - thick * 0.4 + wag, x + dir * len, y - thick * 0.1 + wag * 1.6);
  ctx.quadraticCurveTo(x + dir * len * 0.6, y + thick * 0.5 + wag, x, y + thick);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = lwv; ctx.stroke();
}

/** e = { x,y,w,h,key,facing,seed,hurtT,def,boss } */
export function drawCreature(ctx, e, t) {
  const d = e.def;
  const shape = SHAPE[e.key] || 'drage';
  const flash = e.hurtT > 0 && Math.floor(e.hurtT * 30) % 2 === 0;
  const body = flash ? '#ffffff' : d.body;
  const dark = flash ? '#d8dcea' : d.dark;
  const x = e.x, y = e.y, w = e.w, h = e.h;
  const cx = x + w / 2, cy = y + h / 2, by = y + h;
  const lw = Math.max(2, h * 0.045);
  const look = e.facing >= 0 ? 1 : -1;
  const wob = Math.sin(t * 4 + (e.seed || 0));
  const step = Math.sin(t * 7 + (e.seed || 0));
  const big = !!e.boss;

  ctx.save();
  ctx.lineJoin = 'round';
  // speil alt om monsteret ser mot venstre
  ctx.translate(cx, by);
  ctx.scale(look, 1);
  ctx.translate(-cx, -by);
  const bx = cx; // alt under tegnes som om monsteret ser mot hoeyre

  if (shape !== 'flyger') shadow(ctx, bx, by + 2, w * 0.44, 0.22);

  if (shape === 'drage') {
    // ---- tobeint kjempeoegle (godzilla-typen) ----
    tail(ctx, bx - w * 0.22, by - h * 0.42, w * 0.62, h * 0.11, -1, wob * h * 0.05, dark, lw);
    // bakbein
    rr(ctx, bx - w * 0.2 + step * w * 0.05, by - h * 0.34, w * 0.19, h * 0.34, h * 0.06, dark, OUT, lw);
    // kropp
    ell(ctx, bx, by - h * 0.5, w * 0.3, h * 0.29, body, OUT, lw);
    rr(ctx, bx - w * 0.22, by - h * 0.62, w * 0.44, h * 0.34, h * 0.12, body, OUT, lw);
    ctx.save(); ctx.globalAlpha = 0.45;
    ell(ctx, bx + w * 0.04, by - h * 0.44, w * 0.15, h * 0.13, dark); // mage
    ctx.restore();
    // ryggpigger
    spikes(ctx, bx - w * 0.26, by - h * 0.66, bx + w * 0.12, by - h * 0.84, big ? 6 : 4, h * 0.1, dark);
    // framlabber (smaa)
    rr(ctx, bx + w * 0.12, by - h * 0.56, w * 0.1, h * 0.2, h * 0.05, body, OUT, lw * 0.9);
    // forbein
    rr(ctx, bx + w * 0.02 - step * w * 0.05, by - h * 0.32, w * 0.19, h * 0.32, h * 0.06, body, OUT, lw);
    rr(ctx, bx + w * 0.0 - step * w * 0.05, by - h * 0.06, w * 0.26, h * 0.07, h * 0.03, dark, OUT, lw * 0.9);
    // hode med snute
    const hx = bx + w * 0.22, hy = by - h * 0.86;
    rr(ctx, hx - w * 0.16, hy - h * 0.02, w * 0.3, h * 0.19, h * 0.06, body, OUT, lw);
    rr(ctx, hx + w * 0.06, hy + h * 0.06, w * 0.22, h * 0.1, h * 0.035, body, OUT, lw);
    // tenner
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      poly(ctx, [
        [hx + w * (0.1 + i * 0.05), hy + h * 0.14],
        [hx + w * (0.13 + i * 0.05), hy + h * 0.14],
        [hx + w * (0.115 + i * 0.05), hy + h * 0.2],
      ], '#ffffff');
    }
    eye(ctx, hx + w * 0.03, hy + h * 0.06, h * 0.045, 1, big, '#ffe066');
    // horn
    poly(ctx, [[hx - w * 0.1, hy], [hx - w * 0.04, hy - h * 0.12], [hx + w * 0.0, hy + h * 0.01]], dark, OUT, lw * 0.8);
  } else if (shape === 'oegle') {
    // ---- firbeint oegle ----
    tail(ctx, bx - w * 0.26, by - h * 0.4, w * 0.6, h * 0.09, -1, wob * h * 0.07, dark, lw);
    for (let i = 0; i < 2; i++) {
      const lx = bx - w * 0.22 + i * w * 0.38;
      const ph = i ? -step : step;
      rr(ctx, lx + ph * w * 0.04, by - h * 0.3, w * 0.12, h * 0.3, h * 0.05, dark, OUT, lw * 0.9);
      rr(ctx, lx + w * 0.1 - ph * w * 0.04, by - h * 0.28, w * 0.12, h * 0.28, h * 0.05, body, OUT, lw * 0.9);
    }
    ell(ctx, bx, by - h * 0.54, w * 0.34, h * 0.22, body, OUT, lw);
    spikes(ctx, bx - w * 0.28, by - h * 0.7, bx + w * 0.18, by - h * 0.72, 5, h * 0.09, dark);
    const hx = bx + w * 0.32, hy = by - h * 0.6;
    rr(ctx, hx - w * 0.1, hy - h * 0.02, w * 0.26, h * 0.2, h * 0.07, body, OUT, lw);
    ctx.fillStyle = '#ffffff';
    poly(ctx, [[hx + w * 0.06, hy + h * 0.16], [hx + w * 0.12, hy + h * 0.16], [hx + w * 0.09, hy + h * 0.23]], '#ffffff');
    eye(ctx, hx + w * 0.06, hy + h * 0.06, h * 0.05, 1, big, '#ffd93d');
  } else if (shape === 'flyger') {
    // ---- flygende drage ----
    const flap = Math.sin(t * (big ? 4.5 : 8) + (e.seed || 0));
    for (const s of [-1, 1]) {
      const up2 = flap * h * (s < 0 ? 0.3 : 0.42);
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.04, by - h * 0.56);
      ctx.quadraticCurveTo(bx - w * 0.1, by - h * 0.95 - up2, bx - w * 0.46 * (s < 0 ? 1.1 : 0.85), by - h * 0.8 - up2);
      ctx.quadraticCurveTo(bx - w * 0.3, by - h * 0.5 - up2 * 0.4, bx - w * 0.06, by - h * 0.44);
      ctx.closePath();
      ctx.fillStyle = s < 0 ? dark : body; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.9; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + w * 0.04, by - h * 0.56);
      ctx.quadraticCurveTo(bx + w * 0.2, by - h * 0.98 - up2, bx + w * 0.44 * (s < 0 ? 1.1 : 0.85), by - h * 0.78 - up2);
      ctx.quadraticCurveTo(bx + w * 0.26, by - h * 0.48 - up2 * 0.4, bx + w * 0.06, by - h * 0.44);
      ctx.closePath();
      ctx.fillStyle = s < 0 ? dark : body; ctx.fill();
      ctx.stroke();
      if (s < 0) continue;
    }
    tail(ctx, bx - w * 0.14, by - h * 0.46, w * 0.5, h * 0.07, -1, wob * h * 0.08, dark, lw * 0.9);
    ell(ctx, bx, by - h * 0.48, w * 0.17, h * 0.22, body, OUT, lw);
    // bein som henger
    rr(ctx, bx - w * 0.06, by - h * 0.32, w * 0.07, h * 0.18, h * 0.04, dark, OUT, lw * 0.8);
    rr(ctx, bx + w * 0.04, by - h * 0.3, w * 0.07, h * 0.18, h * 0.04, dark, OUT, lw * 0.8);
    // hals og hode
    const hx = bx + w * 0.2, hy = by - h * 0.72;
    ctx.beginPath();
    ctx.moveTo(bx + w * 0.02, by - h * 0.56);
    ctx.quadraticCurveTo(bx + w * 0.14, by - h * 0.74, hx, hy + h * 0.06);
    ctx.lineWidth = h * 0.11; ctx.strokeStyle = body; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineCap = 'butt';
    rr(ctx, hx - w * 0.08, hy - h * 0.02, w * 0.2, h * 0.16, h * 0.05, body, OUT, lw);
    rr(ctx, hx + w * 0.06, hy + h * 0.04, w * 0.14, h * 0.08, h * 0.03, body, OUT, lw * 0.9);
    poly(ctx, [[hx - w * 0.05, hy], [hx - w * 0.01, hy - h * 0.13], [hx + w * 0.03, hy + h * 0.01]], dark, OUT, lw * 0.8);
    eye(ctx, hx + w * 0.03, hy + h * 0.05, h * 0.04, 1, big, '#ffe066');
  } else if (shape === 'troll' || shape === 'koloss') {
    // ---- steintroll / koloss ----
    const k = shape === 'koloss' ? 1.1 : 1;
    const bobY = Math.abs(step) * h * 0.03;
    ctx.save(); ctx.translate(0, bobY);
    rr(ctx, bx - w * 0.3, by - h * 0.26, w * 0.24, h * 0.26, h * 0.05, dark, OUT, lw);
    rr(ctx, bx + w * 0.06, by - h * 0.26, w * 0.24, h * 0.26, h * 0.05, dark, OUT, lw);
    rr(ctx, bx - w * 0.38 * k, by - h * 0.86, w * 0.76 * k, h * 0.62, h * 0.14, body, OUT, lw);
    // steinbiter
    rr(ctx, bx - w * 0.28, by - h * 0.8, w * 0.22, h * 0.18, h * 0.04, dark);
    rr(ctx, bx + w * 0.06, by - h * 0.56, w * 0.2, h * 0.16, h * 0.04, dark);
    // armer
    rr(ctx, bx - w * 0.56 * k, by - h * 0.8 + step * h * 0.03, w * 0.2, h * 0.44, h * 0.07, body, OUT, lw);
    rr(ctx, bx + w * 0.36 * k, by - h * 0.8 - step * h * 0.03, w * 0.2, h * 0.44, h * 0.07, body, OUT, lw);
    // hode
    rr(ctx, bx - w * 0.22, by - h * 1.06, w * 0.44, h * 0.24, h * 0.06, body, OUT, lw);
    if (big) {
      poly(ctx, [[bx - w * 0.2, by - h * 1.04], [bx - w * 0.3, by - h * 1.26], [bx - w * 0.08, by - h * 1.08]], dark, OUT, lw * 0.8);
      poly(ctx, [[bx + w * 0.2, by - h * 1.04], [bx + w * 0.3, by - h * 1.26], [bx + w * 0.08, by - h * 1.08]], dark, OUT, lw * 0.8);
    }
    circ(ctx, bx - w * 0.08, by - h * 0.94, h * 0.04, '#ff7a3d');
    circ(ctx, bx + w * 0.09, by - h * 0.94, h * 0.04, '#ff7a3d');
    ctx.restore();
  } else if (shape === 'hydra') {
    // ---- hydra med tre hoder ----
    tail(ctx, bx - w * 0.24, by - h * 0.34, w * 0.5, h * 0.1, -1, wob * h * 0.05, dark, lw);
    rr(ctx, bx - w * 0.22 + step * w * 0.04, by - h * 0.32, w * 0.2, h * 0.32, h * 0.06, dark, OUT, lw);
    rr(ctx, bx + w * 0.04 - step * w * 0.04, by - h * 0.32, w * 0.2, h * 0.32, h * 0.06, body, OUT, lw);
    ell(ctx, bx, by - h * 0.5, w * 0.3, h * 0.24, body, OUT, lw);
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(t * 2.4 + i * 1.5 + (e.seed || 0)) * h * 0.05;
      const nx = bx + w * 0.06 + i * w * 0.13;
      const ny = by - h * 0.78 - Math.abs(i) * h * 0.06 + sway;
      ctx.beginPath();
      ctx.moveTo(bx + i * w * 0.08, by - h * 0.6);
      ctx.quadraticCurveTo(nx - w * 0.04, ny + h * 0.14, nx, ny + h * 0.06);
      ctx.lineWidth = h * 0.09; ctx.strokeStyle = i === 0 ? body : dark; ctx.lineCap = 'round'; ctx.stroke();
      ctx.lineCap = 'butt';
      rr(ctx, nx - w * 0.07, ny - h * 0.02, w * 0.17, h * 0.14, h * 0.045, i === 0 ? body : dark, OUT, lw * 0.9);
      rr(ctx, nx + w * 0.05, ny + h * 0.03, w * 0.12, h * 0.07, h * 0.025, i === 0 ? body : dark, OUT, lw * 0.8);
      eye(ctx, nx + w * 0.03, ny + h * 0.04, h * 0.035, 1, true, '#ffe066');
    }
  }

  ctx.restore();
}

// ==================================================================
//  BAKGRUNN OG BANE
// ==================================================================
/**
 * Et bakgrunnslag som gjentas bortover: saa hoeyt som `hoyde` paa skjermen,
 * med bunnen paa `bunnY`, forskjoevet `skyv` piksler.
 */
function lag(ctx, img, skyv, hoyde, bunnY, W) {
  const w = img.naturalWidth * (hoyde / img.naturalHeight);
  const ox = (skyv % w + w) % w;
  for (let x = -ox; x < W; x += w) ctx.drawImage(img, x, bunnY - hoyde, w + 0.5, hoyde);
}

/**
 * Himmel og bakgrunn, i skjermkoordinater. camY og z er kameraets hoeyde og
 * zoom - lagene langt borte flytter seg mindre enn bakken naar kameraet flytter seg.
 */
export function drawBackground(ctx, th, camX, camY, z, W, H, t, groundY) {
  const hor = (groundY - camY) * z;              // der bakken er paa skjermen
  const dyp = hor - H * 0.837;                   // hvor mye kameraet har loeftet seg
  // Hvor langt et lag er skjoevet: regnet fra midten av utsnittet og ved en fast
  // zoom, ellers ville lagene gli sidelengs hver gang kameraet zoomer inn eller ut.
  const midtX = camX + W / (2 * z);
  const skyv = (fart) => midtX * fart * 1.5;
  const himmel = baneBilde(th, 'himmel');
  if (himmel) {
    // litt hoeyere enn skjermen, saa det aldri blir en glipe naar kameraet loefter seg
    lag(ctx, himmel, skyv(0.05), H * 1.2, H * 1.1 + dyp * 0.08, W);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const sol = baneBilde(th, 'sol');
  if (!himmel && th.stars) {
    ctx.save();
    const ox = skyv(0.04);
    for (let i = 0; i < 90; i++) {
      const sx = ((h1(i) * 3000 - ox) % 3000 + 3000) % 3000;
      if (sx > W + 10) continue;
      const sy = h2(i) * H * 0.7;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    ctx.restore();
  } else if (!himmel && !sol) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    circ(ctx, W * 0.78 - skyv(0.013), H * 0.18, H * 0.075, '#fff3c4');
    ctx.restore();
  }

  // Sola, maanen eller planeten er et eget bilde, saa den bare synes en gang
  // selv om himmelen gjentas bortover. En egen himmel uten sol.png faar ingen sol.
  if (sol) {
    const hh = H * 0.22, ww = hh * (sol.naturalWidth / sol.naturalHeight);
    ctx.drawImage(sol, W * 0.78 - skyv(0.013) - ww / 2, H * 0.18 + dyp * 0.08 - hh / 2, ww, hh);
  }

  // Lagene staar paa horisonten, men aldri slik at det blir en glipe ned til bakken.
  const langtBunn = Math.max(H * 0.85 + dyp * 0.3, hor + 4);
  const midtBunn = Math.max(H * 0.86 + dyp * 0.6, hor + 4);

  const langt = baneBilde(th, 'langt');
  if (langt) {
    lag(ctx, langt, skyv(0.18), H * 0.55, langtBunn, W);
  } else {
    const fo = skyv(0.18), fs = 300;
    ctx.fillStyle = th.far;
    const i0 = Math.floor(fo / fs) - 1;
    for (let i = i0; i < i0 + Math.ceil(W / fs) + 3; i++) {
      const px = i * fs - fo;
      const r = fs * (0.55 + h1(i) * 0.45);
      ell(ctx, px, langtBunn - H * 0.03, r, H * (0.22 + h2(i) * 0.16));
    }
  }

  const midt = baneBilde(th, 'midt');
  if (midt) {
    lag(ctx, midt, skyv(0.42), H * 0.4, midtBunn, W);
  } else {
    const mo = skyv(0.42), ms = 200;
    ctx.fillStyle = th.mid;
    const i0 = Math.floor(mo / ms) - 1;
    for (let i = i0; i < i0 + Math.ceil(W / ms) + 3; i++) {
      const px = i * ms - mo + h1(i * 7) * 70;
      const hh = H * (0.16 + h2(i * 5) * 0.22);
      midShape(ctx, px, midtBunn - H * 0.02, hh, th.form, i);
    }
  }

  // naermeste lag (bare hvis du har laget det) - glir nesten like fort som bakken
  const naer = baneBilde(th, 'naer');
  if (naer) lag(ctx, naer, skyv(0.75), H * 0.25, hor + 6, W);
}

function midShape(ctx, x, baseY, hh, form, i) {
  const w = hh * (0.5 + h1(i * 3) * 0.4);
  if (form === 'tre') {
    ctx.fillRect(x - w * 0.12, baseY - hh * 0.5, w * 0.24, hh * 0.5);
    poly(ctx, [[x - w * 0.6, baseY - hh * 0.42], [x, baseY - hh * 1.25], [x + w * 0.6, baseY - hh * 0.42]]);
    ctx.fill();
  } else if (form === 'hus') {
    // by-silhuett: hoeyhus med vinduer
    const bw = w * 1.1, bh = hh * (0.9 + h2(i * 11) * 0.7);
    ctx.fillRect(x - bw / 2, baseY - bh, bw, bh);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ffe9a8';
    for (let r = 0; r < Math.floor(bh / 26); r++) {
      for (let c = 0; c < 3; c++) {
        if (h1(i * 31 + r * 7 + c) < 0.45) continue;
        ctx.fillRect(x - bw / 2 + 6 + c * (bw - 14) / 3, baseY - bh + 10 + r * 26, (bw - 20) / 4, 10);
      }
    }
    ctx.restore();
  } else if (form === 'fjell') {
    poly(ctx, [[x - w, baseY], [x - w * 0.5, baseY - hh * 0.8], [x + w * 0.2, baseY - hh],
      [x + w, baseY - hh * 0.4], [x + w * 1.1, baseY]]);
    ctx.fill();
  } else {
    poly(ctx, [[x - w * 0.55, baseY], [x, baseY - hh * 1.1], [x + w * 0.55, baseY]]);
    ctx.fill();
  }
}

// Hvor hoeyt bakkebildet tegnes, i verdensenheter. Den oeverste tolvdelen
// stikker opp over bakkekanten (gress, steiner), resten ligger under.
const BAKKE_H = 120;

/** Bakken, i verdensenheter - fra venstre til hoeyre kant av det kameraet ser. */
export function drawGround(ctx, th, camX, camY, viewW, viewH, groundY) {
  // god margin rundt, saa bakken ogsaa dekker kantene naar skjermen rister
  const x0 = camX - 80, x1 = camX + viewW + 80, bunn = camY + viewH + 80;
  const bakke = baneBilde(th, 'bakke');
  if (bakke) {
    const topp = groundY - BAKKE_H / 12;
    const iw = bakke.naturalWidth, ih = bakke.naturalHeight;
    const w = iw * (BAKKE_H / ih);
    const under = Math.max(0, bunn - topp - BAKKE_H + 1);
    for (let x = Math.floor(x0 / w) * w; x < x1; x += w) {
      ctx.drawImage(bakke, x, topp, w + 0.5, BAKKE_H);
      // under bildet fortsetter den nederste raden, saa fargen blir den samme
      if (under > 0) ctx.drawImage(bakke, 0, ih - 1, iw, 1, x, topp + BAKKE_H - 1, w + 0.5, under);
    }
    return;
  }
  ctx.fillStyle = th.ground2;
  ctx.fillRect(x0, groundY, x1 - x0, bunn - groundY);
  ctx.fillStyle = th.ground;
  ctx.fillRect(x0, groundY, x1 - x0, 26);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, groundY + 2);
  ctx.lineTo(x1, groundY + 2);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = OUT;
  const sp = 64;
  for (let x = Math.floor(x0 / sp) * sp; x < x1; x += sp) {
    ctx.fillRect(x, groundY + 34, 22, 6);
    ctx.fillRect(x + 32, groundY + 58, 16, 6);
  }
  ctx.restore();
}

/**
 * Plattform. Med eget bilde er oeverste kant der figurene staar. Venstre og
 * hoeyre ende (et kvadrat hver, like hoeyt som bildet) blir staaende som de
 * er, og midten strekkes til bredden.
 */
export function drawPlatform(ctx, p, th) {
  const img = baneBilde(th, 'plattform');
  if (img) {
    const hoyde = p.h + 14, y = p.y - 2;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const kant = Math.min(ih, iw / 3);
    const kw = Math.min(kant * (hoyde / ih), p.w / 2);
    ctx.drawImage(img, 0, 0, kant, ih, p.x, y, kw, hoyde);
    ctx.drawImage(img, kant, 0, iw - kant * 2, ih, p.x + kw - 0.5, y, p.w - kw * 2 + 1, hoyde);
    ctx.drawImage(img, iw - kant, 0, kant, ih, p.x + p.w - kw, y, kw, hoyde);
    return;
  }
  rr(ctx, p.x, p.y, p.w, p.h, 8, th.ground2, OUT, 4);
  rr(ctx, p.x + 4, p.y + 3, p.w - 8, Math.min(12, p.h * 0.5), 6, th.ground);
}

export function drawGate(ctx, x, groundY, th, t, open) {
  const w = 54, h = 250;
  const y = groundY - h;
  const img = baneBilde(th, 'port');
  if (img) {
    const bw = h * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.globalAlpha = open ? 0.25 : 1;
    // venstre kant der den innebygde porten har sin: kameraet stopper ved veggen,
    // saa en bred port vokser inn i arenaen i stedet for ut av skjermen
    ctx.drawImage(img, x - w / 2, y, bw, h);
    ctx.restore();
    return;
  }
  ctx.save();
  if (open) ctx.globalAlpha = 0.25;
  rr(ctx, x - w / 2, y, w, h, 10, th.mid, OUT, 5);
  for (let i = 0; i < 5; i++) {
    rr(ctx, x - w / 2 + 7, y + 14 + i * 46, w - 14, 30, 6, th.ground2, OUT, 3);
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.globalAlpha = (open ? 0.2 : 0.55) + pulse * 0.35;
  circ(ctx, x, y + h * 0.42, 16, '#ff7a3d');
  ctx.restore();
}

// ==================================================================
//  SMAATING I BANEN
// ==================================================================
export function drawCoin(ctx, c, t) {
  const s = Math.abs(Math.cos(t * 5 + c.seed));
  const r = c.r;
  const img = tingBilde('mynt');
  if (img) {
    // eget myntbilde - klemmes sammen og ut igjen, saa den ser ut til aa snurre
    const hh = r * 2.4, ww = hh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(Math.max(0.18, s), 1);
    ctx.drawImage(img, -ww / 2, -hh / 2, ww, hh);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ell(ctx, 0, 0, Math.max(r * 0.18, r * s), r, GOLD, GOLD_D, 3);
  if (s > 0.55) {
    ctx.save(); ctx.globalAlpha = 0.85;
    ell(ctx, -r * 0.15 * s, -r * 0.15, r * 0.28 * s, r * 0.38, '#fff3b0');
    ctx.restore();
  }
  ctx.restore();
}

export function drawHeart(ctx, x, y, r, t) {
  const p = 1 + Math.sin(t * 6) * 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.75);
  ctx.bezierCurveTo(-r * 1.5, -r * 0.3, -r * 0.55, -r * 1.25, 0, -r * 0.42);
  ctx.bezierCurveTo(r * 0.55, -r * 1.25, r * 1.5, -r * 0.3, 0, r * 0.75);
  ctx.closePath();
  ctx.fillStyle = '#ef4d5a'; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

/** Kraftpakke paa en plattform: ⚡ dobbel skuddfart, ⭐ usaarbar, ❤️ helse. */
export function drawPowerup(ctx, h, t) {
  const bob = Math.sin(t * 3 + h.seed) * 5;
  const y = h.y + bob;
  const r = h.r;
  ctx.save();
  // glorie
  const glow = 0.45 + 0.25 * Math.sin(t * 4 + h.seed);
  const col = h.kind === 'rate' ? '#ffd93d' : h.kind === 'star' ? '#7fe8ff' : '#ef4d5a';
  ctx.globalAlpha = glow * 0.5;
  circ(ctx, h.x, y, r * 1.85, col);
  ctx.globalAlpha = 1;

  const img = tingBilde(h.kind === 'heal' ? 'hjerte' : h.kind === 'rate' ? 'lyn' : 'stjerne');
  if (img) {
    const hh = r * 2.3, ww = hh * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, h.x - ww / 2, y - hh / 2, ww, hh);
  } else if (h.kind === 'heal') {
    drawHeart(ctx, h.x, y, r * 0.95, t);
  } else {
    rr(ctx, h.x - r, y - r, r * 2, r * 2, r * 0.55,
      h.kind === 'rate' ? '#fff3b0' : '#dff8ff', OUT, 3.5);
    if (h.kind === 'rate') {
      poly(ctx, [
        [h.x + r * 0.22, y - r * 0.62], [h.x - r * 0.34, y + r * 0.1],
        [h.x - r * 0.02, y + r * 0.1], [h.x - r * 0.2, y + r * 0.66],
        [h.x + r * 0.36, y - r * 0.08], [h.x + r * 0.03, y - r * 0.08],
      ], '#f0a60c', OUT, 2.5);
    } else {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? r * 0.72 : r * 0.3;
        pts.push([h.x + Math.cos(a) * rad, y + Math.sin(a) * rad]);
      }
      poly(ctx, pts, '#3aa0ee', OUT, 2.5);
    }
  }
  ctx.restore();
}

/** Robotens eget skudd. Ser forskjellig ut for hvert kanonnivaa. */
function drawShot(ctx, b) {
  const lvl = b.tier | 0;
  const r = b.r;
  const ang = Math.atan2(b.vy, b.vx);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(ang);

  // eget bilde for dette kanonnivaaet - eller for det naermeste nivaaet under
  let img = null;
  for (let k = Math.max(1, lvl); k >= 1 && !img; k--) img = tingBilde('skudd-' + k);
  if (img) {
    const ww = r * 4.2, hh = ww * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, -ww / 2, -hh / 2, ww, hh);
  } else if (lvl <= 1) {
    ctx.globalAlpha = 0.4;
    circ(ctx, 0, 0, r * 2, '#5ee6ff');
    ctx.globalAlpha = 1;
    circ(ctx, 0, 0, r, '#ffffff', '#5ee6ff', 3);
  } else if (lvl === 2) {
    ctx.globalAlpha = 0.35;
    ell(ctx, -r * 1.1, 0, r * 2.2, r * 0.8, '#5ee6ff');
    ctx.globalAlpha = 1;
    ell(ctx, 0, 0, r * 1.5, r * 0.88, '#d8fbff', '#3ac6ee', 3);
    circ(ctx, r * 0.35, 0, r * 0.45, '#ffffff');
  } else if (lvl === 3) {
    // to smaa bolter, som de to loepene
    ctx.globalAlpha = 0.35;
    ell(ctx, -r * 0.8, 0, r * 2, r * 1.2, '#7dff9c');
    ctx.globalAlpha = 1;
    for (const s of [-1, 1]) {
      ell(ctx, 0, s * r * 0.55, r * 1.25, r * 0.5, '#eaffe9', '#2fae52', 2.5);
    }
  } else if (lvl === 4) {
    // tung plasmakule med ring
    ctx.globalAlpha = 0.4;
    circ(ctx, 0, 0, r * 2.3, '#ffb057');
    ctx.globalAlpha = 1;
    circ(ctx, 0, 0, r * 1.15, '#ffd93d', '#d97706', 3);
    circ(ctx, -r * 0.3, -r * 0.3, r * 0.4, '#fff6c0');
    ctx.globalAlpha = 0.85;
    ell(ctx, 0, 0, r * 1.75, r * 0.5, null, '#fff0b0', 3);
  } else {
    // energistjerne
    ctx.globalAlpha = 0.45;
    circ(ctx, 0, 0, r * 2.6, '#ff6bd6');
    ctx.globalAlpha = 1;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r * 1.7 : r * 0.72;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
    poly(ctx, pts, '#ffd6f4', '#c026a3', 3);
    circ(ctx, 0, 0, r * 0.55, '#ffffff');
  }
  ctx.restore();
}

export function drawBullet(ctx, b) {
  // Sjokkboelge som blinker paa bakken foer den begynner aa rulle.
  if (b.warn > 0) {
    const pulse = 0.45 + 0.55 * Math.abs(Math.sin(b.warn * 22));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + b.r * 0.6, b.r * 1.9, b.r * 0.7, 0, 0, TAU);
    ctx.fillStyle = '#ff9a3d';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff3b0';
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 30px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText('!', b.x, b.y - b.r * 0.8);
    ctx.fillStyle = '#ffe066';
    ctx.fillText('!', b.x, b.y - b.r * 0.8);
    ctx.restore();
    return;
  }
  if (b.shock) {
    const bolge = effektBilde('sjokkbolge');
    if (bolge) {
      // eget bilde: staar paa bakken og ruller i fartsretningen (tegnet mot hoeyre)
      const hh = b.r * 2.6 * (1 + 0.06 * Math.sin(b.x * 0.08));
      const ww = hh * (bolge.naturalWidth / bolge.naturalHeight);
      ctx.save();
      ctx.translate(b.x, b.y + b.r * 0.9);
      if (b.vx < 0) ctx.scale(-1, 1);
      ctx.drawImage(bolge, -ww / 2, -hh, ww, hh);
      ctx.restore();
      return;
    }
    // rullende boelge - bred og tydelig, saa den leses som "hopp over meg"
    ctx.save();
    ctx.globalAlpha = 0.35;
    ell(ctx, b.x, b.y + b.r * 0.5, b.r * 1.7, b.r * 0.8, '#ff9a3d');
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(b.x - b.r * 1.3, b.y + b.r * 0.9);
    ctx.quadraticCurveTo(b.x, b.y - b.r * 1.5, b.x + b.r * 1.3, b.y + b.r * 0.9);
    ctx.closePath();
    ctx.fillStyle = '#ffb057';
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    circ(ctx, b.x, b.y + b.r * 0.1, b.r * 0.42, '#fff3b0');
    return;
  }
  const fiende = b.friendly ? null
    : (SKUDD_BILDE[b.color] && effektBilde(SKUDD_BILDE[b.color])) || tingBilde('fiendeskudd');
  if (b.friendly) {
    drawShot(ctx, b);
  } else if (fiende) {
    const ww = b.r * 3.2, hh = ww * (fiende.naturalHeight / fiende.naturalWidth);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.drawImage(fiende, -ww / 2, -hh / 2, ww, hh);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.4;
    circ(ctx, b.x, b.y, b.r * 2, b.color || '#ff7ad9');
    ctx.restore();
    circ(ctx, b.x, b.y, b.r, b.color || '#ff7ad9', OUT, 3);
    circ(ctx, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.32, '#ffffff');
  }
}

/** Mykt lysglimt rundt et monster som nettopp ble truffet. */
export function drawHitHalo(ctx, cx, cy, r, a) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
  g.addColorStop(0, 'rgba(255,246,192,' + (0.55 * a).toFixed(3) + ')');
  g.addColorStop(0.6, 'rgba(255,214,120,' + (0.22 * a).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Laserstraalen fra robotens oeyne. */
export function drawLaser(ctx, l) {
  const a = clamp(l.life / l.max, 0, 1);
  ctx.save();
  ctx.globalAlpha = a * 0.35;
  ctx.strokeStyle = LASER_RED;
  ctx.lineWidth = 18 * a;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.lineTo(l.x1, l.y1); ctx.stroke();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#fff0f3';
  ctx.lineWidth = 6 * a;
  ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.lineTo(l.x1, l.y1); ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.restore();
}

/** Hammerslaget - en halvsirkel der det smeller. */
export function drawSmash(ctx, s) {
  const a = clamp(s.life / s.max, 0, 1);
  // eget bilde for hammernivaaet (slag-3.png), ellers slag.png - men bare ved treff
  let img = null;
  for (let k = s.niva | 0; k >= 1 && !img && !s.bom; k--) img = effektBilde('slag-' + k);
  if (!s.bom) img = img || effektBilde('slag');
  if (img) {
    // vokser og blekner der hammeren treffer, med bunnen litt under midten av roboten
    const hh = s.r * 1.3 * (0.75 + (1 - a) * 0.45), ww = hh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.translate(s.x, s.y + s.r * 0.45);
    if (s.retning < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -ww / 2, -hh, ww, hh);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = a * 0.8;
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 9 * a;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.r * (1.5 - a * 0.5), -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Flamme ut av jetpakken, rett nedover fra dysen. */
export function drawJetFlame(ctx, x, y, size, t) {
  const f = 0.85 + 0.2 * Math.sin(t * 43) + 0.1 * Math.sin(t * 71);
  const img = effektBilde('jetflamme');
  if (img) {
    // eget bilde, tegnet med spissen nedover: bredden staar stille, lengden flakker
    const hh = size * 1.9, ww = hh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(img, x - ww / 2, y - size * 0.1, ww, hh * f);
    ctx.restore();
    return;
  }
  const len = size * 1.7 * f;
  const tunge = (k, color) => {
    ctx.beginPath();
    ctx.moveTo(-size * 0.42 * k, 0);
    ctx.quadraticCurveTo(-size * 0.3 * k, len * 0.6 * k, 0, len * k);
    ctx.quadraticCurveTo(size * 0.3 * k, len * 0.6 * k, size * 0.42 * k, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.9;
  tunge(1, '#ff8a1e');
  tunge(0.65, '#ffd93d');
  tunge(0.32, '#fff6d0');
  ctx.restore();
}

export function drawParticle(ctx, p) {
  if (p.kind === 'bilde') {
    // poff, treff og stoev: vokser fra 'fra' til 'til' og blekner mot slutten
    const img = effektBilde(p.navn);
    if (!img) return;
    const a = clamp(p.life / p.max, 0, 1);
    const hh = p.r * 2 * (p.fra + (p.til - p.fra) * (1 - a));
    const ww = hh * (img.naturalWidth / img.naturalHeight);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.speil) ctx.scale(-1, 1);
    ctx.drawImage(img, -ww / 2, p.bunn ? -hh : -hh / 2, ww, hh);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
  if (p.kind === 'ring') {
    circ(ctx, p.x, p.y, p.r * (1.6 - p.life / p.max), null, p.color, 4);
  } else {
    circ(ctx, p.x, p.y, p.r * (p.life / p.max), p.color);
  }
  ctx.restore();
}

export function drawFloatText(ctx, ft) {
  ctx.save();
  ctx.globalAlpha = clamp(ft.life / ft.max, 0, 1);
  // bildefonten (art/font/spillfont.png) hvis den er lastet
  if (tegnTekst(ctx, ft.text, ft.x, ft.y, ft.size * 0.78, { farge: ft.color })) { ctx.restore(); return; }
  ctx.font = 'bold ' + ft.size + 'px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.strokeText(ft.text, ft.x, ft.y);
  ctx.fillStyle = ft.color;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}
