// art.js - all tegning. Ingen bildefiler: alt tegnes med former,
// slik at spillet laster paa et blunk og alltid er skarpt.

import { TAU, clamp } from './core.js';

export const OUT = '#141a2e';

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

function shadow(ctx, x, y, rx, a) {
  ctx.save();
  ctx.globalAlpha = a == null ? 0.25 : a;
  ell(ctx, x, y, rx, rx * 0.26, '#000');
  ctx.restore();
}

const h1 = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
const h2 = (i) => { const x = Math.sin(i * 311.7 + 7.3) * 24634.6345; return x - Math.floor(x); };

// ==================================================================
//  ROBOTEN
// ==================================================================
const M_LIGHT = '#cfdcf2';
const M_MAIN = '#93a7c7';
const M_DARK = '#5d6f91';
const GOLD = '#f7c33a';
const GOLD_D = '#b98708';
const VISOR = '#5ee6ff';

/**
 * Tegner roboten. Den ser stoerre og gjevere ut jo mer du har kjoept -
 * det er hele poenget med "hvor mye er roboten verdt".
 * cx = midten, by = under foettene, h = hoeyde.
 */
export function drawRobot(ctx, cx, by, h, o = {}) {
  const up = o.up || {};
  const f = o.facing >= 0 ? 1 : -1;
  const lw = Math.max(2, h * 0.026);
  const tier = (up.dmg || 0) + (up.rate || 0) + (up.speed || 0) + (up.hp || 0) + (up.shield || 0) + (up.magnet || 0);
  const gold = tier >= 6;
  const gold2 = tier >= 14;
  const main = o.flash ? '#ffffff' : M_MAIN;
  const dark = o.flash ? '#e6ecff' : M_DARK;

  const legH = h * 0.26, bodyH = h * 0.40, headH = h * 0.28;
  const bodyW = h * 0.62, headW = h * 0.50;
  const walk = o.walk || 0;
  const moving = !!o.moving;
  const air = !o.onGround;
  const swing = air ? 0 : moving ? Math.sin(walk) : 0;
  const bob = air ? 0 : moving ? Math.abs(Math.sin(walk)) * h * 0.018 : Math.sin((o.t || 0) * 2) * h * 0.008;

  ctx.save();
  ctx.translate(cx, by);
  if (o.shadow !== false) shadow(ctx, 0, 0, h * 0.34, air ? 0.14 : 0.26);
  ctx.scale(f, 1);
  ctx.lineJoin = 'round';

  const bodyTop = -(legH + bodyH) - bob;
  const headTop = bodyTop - headH;

  // --- bein ---
  const legW = h * 0.15;
  for (const s of [-1, 1]) {
    const dx = s * h * 0.15;
    const off = air ? (s > 0 ? -h * 0.05 : h * 0.03) : swing * h * 0.07 * s;
    rr(ctx, dx - legW / 2 + off, -legH - bob, legW, legH + bob + h * 0.02, legW * 0.42, s > 0 ? main : dark, OUT, lw);
    // fot
    rr(ctx, dx - legW * 0.72 + off, -h * 0.045, legW * 1.45, h * 0.055, h * 0.02, dark, OUT, lw);
  }

  // --- jetflamme naar du har fartsoppgradering og er i lufta ---
  if (air && (up.speed || 0) >= 2) {
    const fl = h * (0.08 + 0.03 * Math.sin((o.t || 0) * 40));
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * h * 0.15 - h * 0.05, -h * 0.02);
      ctx.lineTo(s * h * 0.15 + h * 0.05, -h * 0.02);
      ctx.lineTo(s * h * 0.15, -h * 0.02 + fl);
      ctx.closePath();
      ctx.fillStyle = '#ffb347';
      ctx.fill();
    }
  }

  // --- bakre arm ---
  rr(ctx, -bodyW * 0.62, bodyTop + bodyH * 0.18, h * 0.12, bodyH * 0.55, h * 0.05, dark, OUT, lw);

  // --- kropp ---
  rr(ctx, -bodyW / 2, bodyTop, bodyW, bodyH, h * 0.09, main, OUT, lw);
  rr(ctx, -bodyW / 2 + h * 0.035, bodyTop + h * 0.03, bodyW - h * 0.07, bodyH * 0.24, h * 0.04, M_LIGHT);
  // brystplate - blir gull naar roboten er verdt mye
  rr(ctx, -bodyW * 0.26, bodyTop + bodyH * 0.34, bodyW * 0.52, bodyH * 0.42, h * 0.035,
    gold ? GOLD : dark, gold ? GOLD_D : OUT, lw * 0.8);
  // panserplater = skadeoppgradering
  for (let i = 0; i < (up.dmg || 0); i++) {
    rr(ctx, -bodyW * 0.2 + i * (bodyW * 0.085), bodyTop + bodyH * 0.40, bodyW * 0.06, bodyH * 0.28, h * 0.012, gold2 ? '#fff0b0' : VISOR);
  }

  // --- kanonarm ---
  const barrel = h * (0.30 + 0.035 * (up.dmg || 0));
  const bRad = h * (0.075 + 0.008 * (up.dmg || 0));
  const armY = bodyTop + bodyH * 0.42;
  rr(ctx, bodyW * 0.26, armY - h * 0.02, h * 0.16, h * 0.13, h * 0.05, main, OUT, lw);
  rr(ctx, bodyW * 0.34, armY - bRad / 2, barrel, bRad, bRad * 0.42, gold ? GOLD : dark, OUT, lw);
  rr(ctx, bodyW * 0.34 + barrel - h * 0.04, armY - bRad * 0.62, h * 0.05, bRad * 1.24, h * 0.02, M_LIGHT, OUT, lw * 0.8);
  if (o.flashShot > 0) {
    const r = h * 0.1 * o.flashShot;
    circ(ctx, bodyW * 0.34 + barrel + r * 0.4, armY, r, '#fff6c0');
    circ(ctx, bodyW * 0.34 + barrel + r * 0.4, armY, r * 0.55, '#ffffff');
  }

  // --- hode ---
  rr(ctx, -headW / 2, headTop, headW, headH, h * 0.07, main, OUT, lw);
  rr(ctx, -headW / 2 + h * 0.03, headTop + h * 0.025, headW - h * 0.06, headH * 0.22, h * 0.03, M_LIGHT);
  // visir
  const eyeGlow = o.flash ? '#ff6b6b' : VISOR;
  rr(ctx, -headW * 0.34, headTop + headH * 0.36, headW * 0.78, headH * 0.34, h * 0.02, '#16233c', OUT, lw * 0.7);
  rr(ctx, -headW * 0.22, headTop + headH * 0.42, headW * 0.30, headH * 0.22, h * 0.012, eyeGlow);
  rr(ctx, headW * 0.16, headTop + headH * 0.42, headW * 0.18, headH * 0.22, h * 0.012, eyeGlow);
  // oere
  rr(ctx, headW * 0.44, headTop + headH * 0.42, h * 0.05, headH * 0.3, h * 0.02, dark, OUT, lw * 0.8);

  // --- antenne ---
  ctx.strokeStyle = OUT; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(-headW * 0.12, headTop); ctx.lineTo(-headW * 0.2, headTop - h * 0.1); ctx.stroke();
  circ(ctx, -headW * 0.2, headTop - h * 0.12, h * 0.035, ((o.t || 0) % 1) < 0.5 ? '#ff6b6b' : '#ffd7d7', OUT, lw * 0.7);

  // --- hjerteteller over hodet er i HUD, men vi viser magnetringen her ---
  if ((up.magnet || 0) >= 3) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    circ(ctx, 0, bodyTop + bodyH * 0.5, h * 0.52, null, VISOR, lw * 0.8);
    ctx.restore();
  }

  ctx.restore();

  // --- skjoldboble (utenfor speiling saa den alltid er rund) ---
  if (o.shieldOn) {
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.1 * Math.sin((o.t || 0) * 8);
    circ(ctx, cx, by - h * 0.5, h * 0.62, '#7fe8ff');
    ctx.globalAlpha = 0.85;
    circ(ctx, cx, by - h * 0.5, h * 0.62, null, '#bff4ff', Math.max(2, h * 0.03));
    ctx.restore();
  }
}

/** Tegner roboten pent sentrert i et lite lerret (brukes i menyen og butikken). */
export function renderBotPreview(canvas, up, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const h = H * 0.82;
  drawRobot(ctx, W / 2, H - H * 0.07, h, {
    up, facing: 1, t, onGround: true, moving: false, shadow: true,
  });
}

// ==================================================================
//  MONSTRE
// ==================================================================
const SHAPE = {
  slim: 'blob', edder: 'spider', flagg: 'bat', oye: 'eye', stein: 'rock', trollm: 'wizard',
  slimking: 'blob', edderdron: 'spider', flaggkon: 'bat', steinkje: 'rock', trollmes: 'wizard', megamon: 'brute',
};

function eyes(ctx, x, y, r, look, angry, color) {
  circ(ctx, x, y, r, '#ffffff', OUT, r * 0.35);
  circ(ctx, x + look * r * 0.35, y + r * 0.1, r * 0.45, color || '#1b2340');
  if (angry) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = r * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.1, y - r * 1.25);
    ctx.lineTo(x + r * 0.9, y - r * 0.55);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

/**
 * Tegner et monster. e = { x,y,w,h,key,facing,seed,hurtT,def }
 */
export function drawCreature(ctx, e, t) {
  const d = e.def;
  const shape = SHAPE[e.key] || 'blob';
  const flash = e.hurtT > 0 && Math.floor(e.hurtT * 30) % 2 === 0;
  const body = flash ? '#ffffff' : d.body;
  const dark = flash ? '#d8dcea' : d.dark;
  const x = e.x, y = e.y, w = e.w, h = e.h;
  const cx = x + w / 2, cy = y + h / 2, by = y + h;
  const lw = Math.max(2, h * 0.055);
  const look = e.facing >= 0 ? 1 : -1;
  const wob = Math.sin(t * 5 + (e.seed || 0));
  const big = !!e.boss;

  ctx.save();
  ctx.lineJoin = 'round';
  if (shape !== 'bat' && shape !== 'eye') shadow(ctx, cx, by + 2, w * 0.45, 0.22);

  if (shape === 'blob') {
    const sq = 1 + wob * 0.06, sy = 1 / sq;
    const bw = w * sq, bh = h * sy;
    rr(ctx, cx - bw / 2, by - bh, bw, bh, bh * 0.45, body, OUT, lw);
    // lys topp
    ctx.save(); ctx.globalAlpha = 0.35;
    ell(ctx, cx - bw * 0.14, by - bh * 0.72, bw * 0.22, bh * 0.16, '#ffffff');
    ctx.restore();
    eyes(ctx, cx - bw * 0.17, by - bh * 0.58, h * 0.1, look, big);
    eyes(ctx, cx + bw * 0.17, by - bh * 0.58, h * 0.1, look, big);
    // munn
    ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, by - bh * 0.3, w * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (d.crown) {
      const cw = w * 0.5, chh = h * 0.2, ty = by - bh - chh * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - cw / 2, ty + chh);
      ctx.lineTo(cx - cw / 2, ty);
      ctx.lineTo(cx - cw * 0.25, ty + chh * 0.45);
      ctx.lineTo(cx, ty - chh * 0.2);
      ctx.lineTo(cx + cw * 0.25, ty + chh * 0.45);
      ctx.lineTo(cx + cw / 2, ty);
      ctx.lineTo(cx + cw / 2, ty + chh);
      ctx.closePath();
      ctx.fillStyle = GOLD; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8; ctx.stroke();
    }
  } else if (shape === 'spider') {
    const n = d.legs || 6;
    ctx.strokeStyle = dark; ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const s = i < n / 2 ? -1 : 1;
      const k = i % (n / 2);
      const ph = Math.sin(t * 9 + i * 1.7 + (e.seed || 0)) * h * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + s * w * (0.32 + k * 0.1), cy - h * 0.1 + ph * 0.4);
      ctx.lineTo(cx + s * w * (0.48 + k * 0.12), by);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ell(ctx, cx - look * w * 0.1, cy, w * 0.34, h * 0.36, body, OUT, lw);
    ell(ctx, cx + look * w * 0.22, cy + h * 0.04, w * 0.2, h * 0.24, dark, OUT, lw * 0.9);
    const er = h * 0.085;
    eyes(ctx, cx + look * w * 0.18, cy - h * 0.06, er, look, big, '#ff3b3b');
    eyes(ctx, cx + look * w * 0.3, cy - h * 0.02, er * 0.8, look, false, '#ff3b3b');
  } else if (shape === 'bat') {
    const flap = Math.sin(t * 11 + (e.seed || 0));
    const wy = cy - h * 0.1 + flap * h * 0.3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + s * w * 0.5, wy - h * 0.3, cx + s * w * 0.72, wy);
      ctx.quadraticCurveTo(cx + s * w * 0.42, cy + h * 0.2, cx, cy + h * 0.22);
      ctx.closePath();
      ctx.fillStyle = dark; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.9; ctx.stroke();
    }
    ell(ctx, cx, cy, w * 0.24, h * 0.34, body, OUT, lw);
    // oerer
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * w * 0.1, cy - h * 0.28);
      ctx.lineTo(cx + s * w * 0.2, cy - h * 0.6);
      ctx.lineTo(cx + s * w * 0.02, cy - h * 0.34);
      ctx.closePath();
      ctx.fillStyle = body; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8; ctx.stroke();
    }
    eyes(ctx, cx - w * 0.08, cy - h * 0.06, h * 0.1, look, big, '#ffd93d');
    eyes(ctx, cx + w * 0.08, cy - h * 0.06, h * 0.1, look, big, '#ffd93d');
    // hoggtenner
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.07, cy + h * 0.14); ctx.lineTo(cx - w * 0.02, cy + h * 0.14); ctx.lineTo(cx - w * 0.045, cy + h * 0.26); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.02, cy + h * 0.14); ctx.lineTo(cx + w * 0.07, cy + h * 0.14); ctx.lineTo(cx + w * 0.045, cy + h * 0.26); ctx.closePath(); ctx.fill();
  } else if (shape === 'eye') {
    const fl = Math.sin(t * 2.4 + (e.seed || 0)) * h * 0.06;
    ctx.save(); ctx.translate(0, fl);
    ctx.strokeStyle = dark; ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.14, cy + h * 0.2);
      ctx.quadraticCurveTo(cx + i * w * 0.2, cy + h * 0.45, cx + i * w * 0.12 + Math.sin(t * 4 + i) * 5, cy + h * 0.6);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    circ(ctx, cx, cy, w * 0.42, body, OUT, lw);
    circ(ctx, cx, cy, w * 0.3, '#ffffff', OUT, lw * 0.6);
    circ(ctx, cx + look * w * 0.11, cy, w * 0.14, '#1b2340');
    circ(ctx, cx + look * w * 0.14, cy - w * 0.05, w * 0.05, '#ffffff');
    ctx.restore();
  } else if (shape === 'rock') {
    const stomp = e.anim ? Math.abs(Math.sin(t * 4 + (e.seed || 0))) * h * 0.04 : 0;
    ctx.save(); ctx.translate(0, stomp);
    // bein
    rr(ctx, cx - w * 0.3, by - h * 0.26, w * 0.24, h * 0.26, h * 0.05, dark, OUT, lw);
    rr(ctx, cx + w * 0.06, by - h * 0.26, w * 0.24, h * 0.26, h * 0.05, dark, OUT, lw);
    // kropp av steinblokker
    rr(ctx, cx - w * 0.4, by - h * 0.88, w * 0.8, h * 0.64, h * 0.1, body, OUT, lw);
    rr(ctx, cx - w * 0.3, by - h * 0.82, w * 0.26, h * 0.2, h * 0.04, dark);
    rr(ctx, cx + w * 0.06, by - h * 0.56, w * 0.22, h * 0.18, h * 0.04, dark);
    // armer
    rr(ctx, cx - w * 0.56, by - h * 0.8, w * 0.2, h * 0.42, h * 0.07, body, OUT, lw);
    rr(ctx, cx + w * 0.36, by - h * 0.8, w * 0.2, h * 0.42, h * 0.07, body, OUT, lw);
    // hode
    rr(ctx, cx - w * 0.26, by - h * 1.08, w * 0.52, h * 0.26, h * 0.07, body, OUT, lw);
    circ(ctx, cx - w * 0.1, by - h * 0.95, h * 0.045, '#ff7a3d');
    circ(ctx, cx + w * 0.1, by - h * 0.95, h * 0.045, '#ff7a3d');
    ctx.restore();
  } else if (shape === 'wizard') {
    // kappe
    ctx.beginPath();
    ctx.moveTo(cx, by - h * 0.92);
    ctx.quadraticCurveTo(cx - w * 0.6, by - h * 0.2, cx - w * 0.42, by);
    ctx.lineTo(cx + w * 0.42, by);
    ctx.quadraticCurveTo(cx + w * 0.6, by - h * 0.2, cx, by - h * 0.92);
    ctx.closePath();
    ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
    // hette
    ctx.beginPath();
    ctx.moveTo(cx, by - h * 1.02);
    ctx.quadraticCurveTo(cx - w * 0.34, by - h * 0.78, cx - w * 0.28, by - h * 0.52);
    ctx.quadraticCurveTo(cx, by - h * 0.44, cx + w * 0.28, by - h * 0.52);
    ctx.quadraticCurveTo(cx + w * 0.34, by - h * 0.78, cx, by - h * 1.02);
    ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke();
    // glodende oeyne i moerket
    circ(ctx, cx - w * 0.1, by - h * 0.62, h * 0.04, '#ffe66d');
    circ(ctx, cx + w * 0.1, by - h * 0.62, h * 0.04, '#ffe66d');
    // stav
    const sx = cx + look * w * 0.42;
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = lw * 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by - h * 0.9); ctx.stroke();
    ctx.lineCap = 'butt';
    const pulse = 1 + Math.sin(t * 6 + (e.seed || 0)) * 0.15;
    circ(ctx, sx, by - h * 0.95, h * 0.09 * pulse, '#ffe66d', '#ff9a3d', lw * 0.7);
  } else if (shape === 'brute') {
    // stor sjef: kropp + horn + klor
    rr(ctx, cx - w * 0.34, by - h * 0.34, w * 0.26, h * 0.34, h * 0.06, dark, OUT, lw);
    rr(ctx, cx + w * 0.08, by - h * 0.34, w * 0.26, h * 0.34, h * 0.06, dark, OUT, lw);
    rr(ctx, cx - w * 0.44, by - h * 0.92, w * 0.88, h * 0.62, h * 0.16, body, OUT, lw);
    rr(ctx, cx - w * 0.62, by - h * 0.86, w * 0.22, h * 0.5, h * 0.1, body, OUT, lw);
    rr(ctx, cx + w * 0.4, by - h * 0.86, w * 0.22, h * 0.5, h * 0.1, body, OUT, lw);
    ell(ctx, cx, by - h * 0.56, w * 0.24, h * 0.16, dark);
    rr(ctx, cx - w * 0.3, by - h * 1.18, w * 0.6, h * 0.3, h * 0.1, body, OUT, lw);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * w * 0.24, by - h * 1.12);
      ctx.quadraticCurveTo(cx + s * w * 0.52, by - h * 1.38, cx + s * w * 0.34, by - h * 1.5);
      ctx.quadraticCurveTo(cx + s * w * 0.32, by - h * 1.22, cx + s * w * 0.16, by - h * 1.14);
      ctx.closePath();
      ctx.fillStyle = '#f2e6c8'; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = lw * 0.8; ctx.stroke();
    }
    eyes(ctx, cx - w * 0.12, by - h * 1.03, h * 0.055, look, true, '#ffe66d');
    eyes(ctx, cx + w * 0.12, by - h * 1.03, h * 0.055, look, true, '#ffe66d');
    // tenner
    ctx.fillStyle = '#ffffff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.07 - w * 0.025, by - h * 0.94);
      ctx.lineTo(cx + i * w * 0.07 + w * 0.025, by - h * 0.94);
      ctx.lineTo(cx + i * w * 0.07, by - h * 0.86);
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// ==================================================================
//  BAKGRUNN OG BANE
// ==================================================================
export function drawBackground(ctx, th, camX, W, H, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (th.stars) {
    ctx.save();
    const ox = camX * 0.06;
    for (let i = 0; i < 90; i++) {
      const sx = ((h1(i) * 3000 - ox) % 3000 + 3000) % 3000;
      if (sx > W + 10) continue;
      const sy = h2(i) * H * 0.7;
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + i));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 2.5, 2.5);
    }
    ctx.restore();
  } else {
    // sol / maane
    ctx.save();
    ctx.globalAlpha = 0.5;
    circ(ctx, W * 0.78 - camX * 0.02, H * 0.2, H * 0.09, '#fff3c4');
    ctx.restore();
  }

  // fjerne aaser
  const fo = camX * 0.18, fs = 300;
  ctx.fillStyle = th.far;
  let i0 = Math.floor(fo / fs) - 1;
  for (let i = i0; i < i0 + Math.ceil(W / fs) + 3; i++) {
    const px = i * fs - fo;
    const r = fs * (0.55 + h1(i) * 0.45);
    ell(ctx, px, H * 0.82, r, H * (0.22 + h2(i) * 0.16));
  }

  // naermere silhuetter
  const mo = camX * 0.42, ms = 200;
  ctx.fillStyle = th.mid;
  i0 = Math.floor(mo / ms) - 1;
  for (let i = i0; i < i0 + Math.ceil(W / ms) + 3; i++) {
    const px = i * ms - mo + h1(i * 7) * 70;
    const hh = H * (0.16 + h2(i * 5) * 0.2);
    midShape(ctx, px, H * 0.84, hh, th, i);
  }
}

function midShape(ctx, x, baseY, hh, th, i) {
  const w = hh * (0.5 + h1(i * 3) * 0.4);
  if (th === undefined) return;
  const kind = th.stars ? 'rock' : th.accent === '#ffe27a' ? 'tree' : th.particle === '#ffffff' ? 'spike' : 'spike';
  if (kind === 'tree') {
    ctx.fillRect(x - w * 0.12, baseY - hh * 0.5, w * 0.24, hh * 0.5);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.6, baseY - hh * 0.42);
    ctx.lineTo(x, baseY - hh * 1.25);
    ctx.lineTo(x + w * 0.6, baseY - hh * 0.42);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'rock') {
    ctx.beginPath();
    ctx.moveTo(x - w, baseY);
    ctx.lineTo(x - w * 0.5, baseY - hh * 0.8);
    ctx.lineTo(x + w * 0.2, baseY - hh);
    ctx.lineTo(x + w, baseY - hh * 0.4);
    ctx.lineTo(x + w * 1.1, baseY);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.55, baseY);
    ctx.lineTo(x, baseY - hh * 1.1);
    ctx.lineTo(x + w * 0.55, baseY);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawGround(ctx, th, camX, W, H, groundY) {
  ctx.fillStyle = th.ground2;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = th.ground;
  ctx.fillRect(0, groundY, W, Math.min(26, (H - groundY) * 0.34));
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 2);
  ctx.lineTo(W, groundY + 2);
  ctx.stroke();
  // litt tekstur
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = OUT;
  const sp = 64;
  const ox = camX % sp;
  for (let x = -ox; x < W; x += sp) {
    ctx.fillRect(x, groundY + 34, 22, 6);
    ctx.fillRect(x + 32, groundY + 58, 16, 6);
  }
  ctx.restore();
}

export function drawPlatform(ctx, p, th, camX) {
  const x = p.x - camX;
  rr(ctx, x, p.y, p.w, p.h, 8, th.ground2, OUT, 4);
  rr(ctx, x + 4, p.y + 3, p.w - 8, Math.min(12, p.h * 0.5), 6, th.ground);
}

export function drawGate(ctx, x, groundY, th, t, open) {
  const w = 54, h = 250;
  const y = groundY - h;
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

export function drawBullet(ctx, b) {
  if (b.friendly) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    circ(ctx, b.x, b.y, b.r * 2.1, '#5ee6ff');
    ctx.restore();
    circ(ctx, b.x, b.y, b.r, '#ffffff', '#5ee6ff', 3);
  } else {
    ctx.save();
    ctx.globalAlpha = 0.4;
    circ(ctx, b.x, b.y, b.r * 2, b.color || '#ff7ad9');
    ctx.restore();
    circ(ctx, b.x, b.y, b.r, b.color || '#ff7ad9', OUT, 3);
    circ(ctx, b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.32, '#ffffff');
  }
}

export function drawParticle(ctx, p) {
  ctx.save();
  ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
  if (p.kind === 'ring') {
    circ(ctx, p.x, p.y, p.r * (1.6 - p.life / p.max), null, p.color, 4);
  } else {
    circ(ctx, p.x, p.y, p.r * (p.life / p.max), p.color);
  }
  ctx.restore();
}

/** Flytende "+5"-tall naar du plukker mynter. */
export function drawFloatText(ctx, ft) {
  ctx.save();
  ctx.globalAlpha = clamp(ft.life / ft.max, 0, 1);
  ctx.font = 'bold ' + ft.size + 'px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.strokeText(ft.text, ft.x, ft.y);
  ctx.fillStyle = ft.color;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}
