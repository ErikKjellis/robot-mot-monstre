// main.js - limet: starter spillet og bytter mellom skjermbildene.

import { sound, setupInput, setupStick, clearInput, store, pick } from './core.js';
import { LEVELS } from './content.js';
import { settTekst, skrivOm } from './skrift.js';
import { rammeRundt } from './ramme.js';
import { Game, preloadFigures } from './game.js';
import {
  el, showScreen, showLayer, updateHud, resetHudCache,
  buildShop, refreshShop, drawPreviews, renderScores, saveScore,
  setSoundIcons, showIntro,
} from './ui.js';

const canvas = el('game');
const game = new Game(canvas);

// Praktisk naar man vil fikle i nettleserkonsollen, f.eks.
//   game.run.coins = 999        (masse mynter)
//   game.player.x = game.world.bossAt + 10   (hopp rett til sjefen)
window.game = game;

let state = 'title';
let introT = 0;
let scoreSaved = true;
let lastScoreIdx = -1;

// ---------------------------------------------------------------
function setState(s) {
  state = s;
  clearInput();
  if (s !== 'play') game.stopp();
  showScreen(s === 'play' ? null : 'scr' + s[0].toUpperCase() + s.slice(1));
  const playing = s === 'play';
  showLayer('hud', playing || s === 'pause');
  showLayer('touch', playing);
  if (s === 'shop') { buildShop(game, () => refreshShop(game)); refreshShop(game); }
  if (s === 'scores') renderScores(lastScoreIdx);
}

// ---------------------------------------------------------------
function startRun() {
  game.newRun();
  scoreSaved = false;
  lastScoreIdx = -1;
  beginLevel(0);
}

function beginLevel(i) {
  game.startLevel(i);
  resetHudCache();
  showIntro(i);
  introT = 1.7;
  setState('intro');
}

function goPlay() {
  setState('play');
  sound.startMusic(LEVELS[game.run.level].root);
}

game.onEvent = (kind) => {
  if (kind === 'cleared') {
    const earned = game.run.coins - game.world.coinsAtStart;
    settTekst(el('winCoins'), earned);
    settTekst(el('winTitle'), pick(['BRA!', 'SUPER!', 'WOW!', 'TOPP!']));
    sound.stopMusic();
    if (game.run.level >= LEVELS.length - 1) {
      showEnd(true);
    } else {
      setState('win');
    }
  } else if (kind === 'dead') {
    showEnd(false);
  }
};

function showEnd(won) {
  el('overEmoji').textContent = won ? '\u{1F3C6}' : '\u{1F480}';
  // vant: pokal-emojien (ingen bilde ennaa), tapte: hodeskallen fra art/grafikk
  el('overEmoji').classList.toggle('hodeskalle', !won);
  el('overEmoji').classList.toggle('bildeikon', !won);
  settTekst(el('overTitle'), won ? 'DU VANT!' : 'AU!');
  settTekst(el('overWorth'), game.worth);
  el('nameInput').value = store.get('rvm.name', 'ROBO');
  scoreSaved = false;
  sound.stopMusic();
  if (won) sound.win();
  setState('over');
}

function commitScore() {
  if (scoreSaved) return;
  scoreSaved = true;
  const name = (el('nameInput').value || 'ROBO').trim().toUpperCase().slice(0, 7) || 'ROBO';
  store.set('rvm.name', name);
  lastScoreIdx = saveScore({
    name,
    value: game.worth,
    level: game.run.level + 1,
    date: Date.now(),
  });
}

// ---------------------------------------------------------------
//  KNAPPER
// ---------------------------------------------------------------
// Egne knappebilder og ikoner (art/grafikk/) brukes bare hvis ALLE finnes -
// ellers ville en knapp uten bilde blitt usynlig. Listen er de samme bildene
// som css/style.css bruker under .knappebilder.
const KNAPPEBILDER = ['spill', 'spill-trykk', 'highscore', 'highscore-trykk', 'lyd', 'lyd-trykk',
  'lyd-av', 'fullskjerm', 'fullskjerm-trykk', 'fortsett', 'fortsett-trykk', 'hjem', 'hjem-trykk',
  'igjen', 'pause'].map((n) => 'art/grafikk/knapp-' + n + '.png')
  .concat(['art/grafikk/ikon-stjerne.png', 'art/grafikk/ikon-hodeskalle.png']);
Promise.all(KNAPPEBILDER.map((src) => new Promise((ok, feil) => {
  const i = new Image();
  i.onload = ok; i.onerror = feil;
  i.src = src;
}))).then(() => document.documentElement.classList.add('knappebilder'), () => {});

el('btnPlay').addEventListener('click', () => { sound.unlock(); startRun(); });
el('btnScores').addEventListener('click', () => { lastScoreIdx = -1; setState('scores'); });
el('btnScoresBack').addEventListener('click', () => setState('title'));
el('btnSound').addEventListener('click', () => { sound.unlock(); sound.toggle(); setSoundIcons(); });
el('btnSound2').addEventListener('click', () => { sound.toggle(); setSoundIcons(); });
el('btnFull').addEventListener('click', toggleFullscreen);

el('scrIntro').addEventListener('click', () => { if (state === 'intro') goPlay(); });

el('btnPause').addEventListener('click', () => {
  if (state !== 'play') return;
  setState('pause');
  sound.stopMusic();
});
el('btnResume').addEventListener('click', () => goPlay());
el('btnQuit').addEventListener('click', () => {
  sound.stopMusic();
  setState('title');
});

el('btnWinGo').addEventListener('click', () => setState('shop'));
el('btnShopGo').addEventListener('click', () => beginLevel(game.run.level + 1));

el('btnAgain').addEventListener('click', () => { commitScore(); startRun(); });
el('btnHome').addEventListener('click', () => { commitScore(); setState('scores'); });

function toggleFullscreen() {
  const d = document;
  try {
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const r = d.documentElement;
      const req = r.requestFullscreen || r.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(r)).catch(() => {});
    } else {
      const ex = d.exitFullscreen || d.webkitExitFullscreen;
      if (ex) Promise.resolve(ex.call(d)).catch(() => {});
    }
  } catch (e) { /* ikke alle nettlesere tillater det */ }
}

// Foerste trykk hvor som helst slaar paa lyden (nettleserkrav).
window.addEventListener('pointerdown', () => sound.unlock(), { once: true });

// ---------------------------------------------------------------
//  OPPSETT
// ---------------------------------------------------------------
setupInput(document);
setupStick(el('stickZone'), el('stick'), el('stickKnob'));
setSoundIcons();
// overskrifter og knappetekst med data-tekst faar bildefonten
skrivOm();
// vinduene (pause, vunnet, tapt, poeng) faar rammen bygd av delene i art/grafikk/ramme/
document.querySelectorAll('.panel').forEach(rammeRundt);
preloadFigures();   // ser etter egne PNG-figurer i art/-mappa

function fit() {
  game.resize();
  const portrait = window.innerHeight > window.innerWidth;
  el('rotate').classList.toggle('hide', !portrait);
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
fit();

// En bane i bakgrunnen slik at menyen ikke er tom
game.newRun();
game.buildLevel(0);
setState('title');

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') {
    setState('pause');
    sound.stopMusic();
  }
});

// ---------------------------------------------------------------
//  SPILLOEKKEN
// ---------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (state === 'play') {
    game.update(dt);
    updateHud(game.hudState());
  } else {
    game.t += dt * 0.4;          // bakgrunnen lever litt selv i menyene
    if (state === 'intro') {
      introT -= dt;
      if (introT <= 0) goPlay();
    }
  }
  game.draw();
  drawPreviews(game, game.t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* gaar fint uten */ });
  });
}
