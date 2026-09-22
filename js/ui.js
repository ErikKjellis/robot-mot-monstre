// ui.js - menyer, HUD, butikk og poengliste (vanlig HTML oppaa lerretet).

import { store, sound } from './core.js';
import { UPGRADES, MAX_LEVEL, LEVELS } from './content.js';
import { renderBotPreview } from './art.js';
import { ROBOT_RIG } from './rigs.js';
import { drawRig } from './sprites.js';

export const el = (id) => document.getElementById(id);

const SCREENS = ['scrTitle', 'scrIntro', 'scrShop', 'scrWin', 'scrOver', 'scrScores', 'scrPause'];

export function showScreen(name) {
  SCREENS.forEach((s) => el(s).classList.toggle('hide', s !== name));
}

export function showLayer(id, on) {
  el(id).classList.toggle('hide', !on);
}

// ---------------------------------------------------------------
//  HUD
// ---------------------------------------------------------------
let lastHp = -1;
let lastCoins = -1;
let lastBoosts = '';

export function updateHud(h) {
  const hp = Math.max(0, Math.round(h.hp));
  if (hp !== lastHp) {
    lastHp = hp;
    const frac = h.maxHp > 0 ? hp / h.maxHp : 0;
    const fill = el('hpFill');
    fill.style.width = (frac * 100).toFixed(1) + '%';
    fill.classList.toggle('mid', frac <= 0.55 && frac > 0.28);
    fill.classList.toggle('low', frac <= 0.28);
    el('hpNum').textContent = hp;
  }
  el('shieldIco').classList.toggle('hide', !h.shield);
  if (h.coins !== lastCoins) { el('coinCount').textContent = h.coins; lastCoins = h.coins; }

  // aktive kraftpakker
  const sig = h.boosts.map((b) => b.key + Math.ceil(b.left * 4)).join(',');
  if (sig !== lastBoosts) {
    lastBoosts = sig;
    const box = el('boosts');
    box.innerHTML = '';
    h.boosts.forEach((b) => {
      const d = document.createElement('div');
      d.className = 'boost';
      d.innerHTML = '<span>' + b.ico + '</span><i style="width:' +
        (b.frac * 100).toFixed(0) + '%"></i>';
      box.appendChild(d);
    });
  }
  el('progressFill').style.width = (h.progress * 100).toFixed(1) + '%';
  const bw = el('bossWrap');
  if (h.boss == null) {
    bw.classList.add('hide');
  } else {
    bw.classList.remove('hide');
    el('bossFill').style.width = (Math.max(0, h.boss) * 100).toFixed(1) + '%';
    el('bossFace').textContent = h.bossFace;
  }
}

export function resetHudCache() { lastHp = -1; lastCoins = -1; lastBoosts = ''; }

// ---------------------------------------------------------------
//  BUTIKKEN
// ---------------------------------------------------------------
let shopCards = null;
// Kort sperre rett etter at butikken aapner, slik at et ekstra "mashe-trykk"
// fra forrige skjerm ikke kjoeper noe ved et uhell.
let shopReadyAt = 0;

export function buildShop(game, onBuy) {
  shopReadyAt = performance.now() + 350;
  const grid = el('shopGrid');
  if (!shopCards) {
    grid.innerHTML = '';
    shopCards = UPGRADES.map((u) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML =
        '<span class="c-ico">' + u.ico + '</span>' +
        '<span class="c-name">' + u.name + '</span>' +
        '<span class="pips">' + '<span class="pip"></span>'.repeat(MAX_LEVEL) + '</span>' +
        '<span class="price"><span>\u{1F529}</span><span class="pv">0</span></span>';
      card.addEventListener('click', () => {
        if (performance.now() < shopReadyAt) return;
        const lvl = game.run.up[u.key];
        if (lvl >= MAX_LEVEL) { sound.nope(); return; }
        const price = u.prices[lvl];
        if (game.buy(u.key, price)) {
          sound.buy();
          onBuy();
        } else {
          sound.nope();
          card.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
             { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }],
            { duration: 220 }
          );
        }
      });
      grid.appendChild(card);
      return card;
    });
  }
  refreshShop(game);
}

export function refreshShop(game) {
  if (!shopCards) return;
  el('shopCoins').textContent = game.run.coins;
  el('shopWorth').textContent = game.worth;
  UPGRADES.forEach((u, i) => {
    const card = shopCards[i];
    const lvl = game.run.up[u.key];
    const maxed = lvl >= MAX_LEVEL;
    const price = maxed ? 0 : u.prices[lvl];
    card.classList.toggle('max', maxed);
    card.classList.toggle('poor', !maxed && game.run.coins < price);
    card.querySelectorAll('.pip').forEach((p, k) => p.classList.toggle('on', k < lvl));
    const pv = card.querySelector('.pv');
    const coinIco = card.querySelector('.price span');
    if (maxed) { pv.textContent = 'MAX'; coinIco.textContent = '⭐'; }
    else { pv.textContent = price; coinIco.textContent = '\u{1FA99}'; }
  });
}

// ---------------------------------------------------------------
//  ROBOT-FORHÅNDSVISNING
// ---------------------------------------------------------------
/** Tegner roboten i menyen. Bruker egne PNG-deler hvis du har laget noen. */
function previewInto(canvas, up, t) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ok = drawRig(ctx, ROBOT_RIG, {
    x: canvas.width / 2, y: canvas.height * 0.97, h: canvas.height * 0.84,
    facing: 1, walk: t * 2, move: 0, t, aim: 0, recoil: 0, smash: 0, variants: up,
  });
  if (!ok) renderBotPreview(canvas, up, t);
}

export function drawPreviews(game, t) {
  const up = game.run ? game.run.up : {};
  const a = el('shopBot');
  if (a && !el('scrShop').classList.contains('hide')) previewInto(a, up, t);
  const b = el('titleBot');
  if (b && !el('scrTitle').classList.contains('hide')) previewInto(b, {}, t);
}

// ---------------------------------------------------------------
//  POENGLISTE
// ---------------------------------------------------------------
const KEY = 'rvm.scores';

export function loadScores() {
  const s = store.get(KEY, []);
  return Array.isArray(s) ? s : [];
}

export function saveScore(entry) {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.value - a.value);
  const top = list.slice(0, 10);
  store.set(KEY, top);
  return top.indexOf(entry);
}

export function renderScores(highlight) {
  const list = loadScores();
  const ol = el('scoreList');
  ol.innerHTML = '';
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'score-empty';
    li.textContent = '—';
    ol.appendChild(li);
    return;
  }
  list.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === highlight) li.className = 'me';
    li.innerHTML =
      '<span class="nm">' + escapeHtml(s.name) + '</span>' +
      '<span class="lv">' + '\u{1F3F3}️' + (s.level || 1) + '</span>' +
      '<span>⭐ ' + s.value + '</span>';
    ol.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------
//  SMÅTT OG GODT
// ---------------------------------------------------------------
export function setSoundIcons() {
  const ico = sound.on ? '\u{1F50A}' : '\u{1F507}';
  el('btnSound').textContent = ico;
  el('btnSound2').textContent = ico;
}

export function showIntro(levelIndex) {
  el('introNum').textContent = levelIndex + 1;
  el('introMon').textContent = (LEVELS[levelIndex].preview || []).join(' ');
}
