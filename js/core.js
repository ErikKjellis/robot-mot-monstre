// core.js - smaating: matte, lagring, lyd og kontroller.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (a) => a[(Math.random() * a.length) | 0];
export const chance = (p) => Math.random() < p;

/** Liten deterministisk tilfeldighetsgenerator, slik at et nivaa ser likt ut hver gang. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* privat modus - bare hopp over */
    }
  },
};

// ============================================================
//  LYD - alt lages med WebAudio, ingen lydfiler aa laste ned.
// ============================================================

const MUSIC_ARP = [0, 7, 12, 7, 3, 10, 15, 10];
const MUSIC_BASS = [0, 0, -5, -5, -2, -2, 3, 3];

class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.on = store.get('rvm.sound', true);
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.root = 110;
    this.intense = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.on ? 0.55 : 0;
    this.master.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.16;
    this.musicBus.connect(this.master);
  }

  /** Maa kalles fra en ekte trykk-hendelse foerste gang (nettleserkrav). */
  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setOn(v) {
    this.on = v;
    store.set('rvm.sound', v);
    if (this.master) this.master.gain.value = v ? 0.55 : 0;
  }

  toggle() {
    this.setOn(!this.on);
    return this.on;
  }

  tone(f, d, opt = {}) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime + (opt.t0 || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = opt.type || 'square';
    osc.frequency.setValueAtTime(f, now);
    if (opt.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), now + d);
    const v = opt.v == null ? 0.25 : opt.v;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(v, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + d);
    osc.connect(g);
    g.connect(opt.bus || this.master);
    osc.start(now);
    osc.stop(now + d + 0.03);
  }

  noise(d, opt = {}) {
    if (!this.ctx || !this.on) return;
    const now = this.ctx.currentTime + (opt.t0 || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * d));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = opt.type || 'bandpass';
    flt.frequency.value = opt.f || 900;
    const g = this.ctx.createGain();
    g.gain.value = opt.v == null ? 0.25 : opt.v;
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(now);
  }

  jump() { this.tone(300, 0.16, { to: 720, v: 0.2 }); }
  shoot() { this.tone(880, 0.07, { to: 260, v: 0.14, type: 'square' }); }
  hit() { this.noise(0.1, { f: 1400, v: 0.16 }); }
  kill() { this.tone(420, 0.2, { to: 90, v: 0.2, type: 'sawtooth' }); this.noise(0.18, { f: 700, v: 0.18 }); }
  hurt() { this.tone(240, 0.32, { to: 70, v: 0.3, type: 'sawtooth' }); }
  coin() { this.tone(1046, 0.07, { v: 0.16, type: 'triangle' }); this.tone(1568, 0.11, { v: 0.16, type: 'triangle', t0: 0.06 }); }
  heart() { this.tone(660, 0.09, { v: 0.2, type: 'triangle' }); this.tone(880, 0.09, { v: 0.2, type: 'triangle', t0: 0.08 }); this.tone(1320, 0.16, { v: 0.2, type: 'triangle', t0: 0.16 }); }
  buy() { this.tone(523, 0.08, { v: 0.2 }); this.tone(784, 0.08, { v: 0.2, t0: 0.07 }); this.tone(1046, 0.14, { v: 0.2, t0: 0.14 }); }
  nope() { this.tone(180, 0.14, { to: 120, v: 0.18, type: 'sawtooth' }); }
  laser() { this.tone(1600, 0.18, { to: 380, v: 0.16, type: 'sawtooth' }); this.noise(0.12, { f: 2600, v: 0.1 }); }
  smash() { this.tone(160, 0.22, { to: 55, v: 0.26, type: 'square' }); this.noise(0.2, { f: 420, v: 0.22 }); }
  swing() { this.noise(0.14, { f: 1100, v: 0.13 }); }
  jet() { this.noise(0.13, { f: 480, v: 0.11, type: 'lowpass' }); }
  empty() { this.tone(210, 0.12, { to: 130, v: 0.12, type: 'triangle' }); }
  boss() { this.tone(120, 0.7, { to: 60, v: 0.3, type: 'sawtooth' }); this.noise(0.6, { f: 240, v: 0.2 }); }
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, { v: 0.22, type: 'triangle', t0: i * 0.11 })); }
  lose() { [440, 349, 262, 196].forEach((f, i) => this.tone(f, 0.34, { v: 0.24, type: 'sawtooth', t0: i * 0.16 })); }

  // --- enkel bakgrunnsmusikk ---
  startMusic(rootHz) {
    this.ensure();
    if (rootHz) this.root = rootHz;
    if (this.timer || !this.ctx) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setIntense(v) { this.intense = v; }

  schedule() {
    if (!this.ctx || !this.on) return;
    const beat = this.intense ? 0.16 : 0.2;
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      this.playStep(this.step, this.nextTime, beat);
      this.step++;
      this.nextTime += beat;
    }
  }

  playStep(i, t, beat) {
    const bus = this.musicBus;
    const bar = (i >> 3) & 3;
    const semi = MUSIC_ARP[i % 8] + (bar === 2 ? 5 : bar === 3 ? 3 : 0);
    const f = this.root * 2 * Math.pow(2, semi / 12);
    this.tone(f, beat * 0.9, { v: 0.1, type: 'square', t0: t - this.ctx.currentTime, bus });
    if (i % 2 === 0) {
      const bf = this.root * Math.pow(2, (MUSIC_BASS[i % 8] + (bar === 2 ? 5 : 0)) / 12) * 0.5;
      this.tone(bf, beat * 1.6, { v: 0.16, type: 'triangle', t0: t - this.ctx.currentTime, bus });
    }
  }
}

export const sound = new Sound();

// ============================================================
//  KONTROLLER - berøring (nettbrett) + tastatur (til testing)
// ============================================================

export const input = {
  stickX: 0,     // -1..1 fra styrespaken, styrer gangen
  keyX: 0,       // -1..1 fra tastaturet
  aimX: 1,       // retningen spaken peker (enhetsvektor) - styrer siktet
  aimY: 0,
  aimMag: 0,     // hvor langt ut spaken er dyttet, 0..1
  shoot: false,
  jumpHeld: false,
  jumpBuffer: 0, // liten "husk trykket"-tid, gjoer hoppingen snill
  jet: false,    // jetknappen holdes inne
  hammerBuffer: 0, // hammerknappen - huskes et lite oeyeblikk, som hoppet
};

/** Hvor mye roboten skal gaa: styrespaken vinner over tastaturet. */
export function moveAxis() {
  return input.stickX !== 0 ? input.stickX : input.keyX;
}

let keyL = false, keyR = false;

function press(act, down) {
  if (act === 'left') { keyL = down; input.keyX = (keyR ? 1 : 0) - (keyL ? 1 : 0); }
  else if (act === 'right') { keyR = down; input.keyX = (keyR ? 1 : 0) - (keyL ? 1 : 0); }
  else if (act === 'shoot') input.shoot = down;
  else if (act === 'jump') {
    input.jumpHeld = down;
    if (down) input.jumpBuffer = 0.16;
  }
  else if (act === 'jet') input.jet = down;
  else if (act === 'hammer') { if (down) input.hammerBuffer = 0.2; }
}

export function clearInput() {
  keyL = keyR = false;
  input.stickX = input.keyX = 0;
  input.aimMag = 0;
  input.shoot = input.jumpHeld = input.jet = false;
  input.jumpBuffer = input.hammerBuffer = 0;
  if (releaseStick) releaseStick();
}

let releaseStick = null;

/**
 * Flytende styrespak: legg tommelen hvor som helst i venstre halvdel, saa
 * dukker spaken opp akkurat der. Dra sidelengs for aa gaa.
 */
export function setupStick(zone, stick, knob) {
  let id = null, cx = 0, cy = 0;
  const DEAD = 0.18;

  const radius = () => Math.max(46, stick.offsetWidth / 2);

  function apply(e) {
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const R = radius();
    const d = Math.hypot(dx, dy);
    const k = d > 0 ? Math.min(1, d / R) : 0;
    const nx = d > 0 ? (dx / d) * k : 0;
    // Litt "snill" kurve: full fart allerede naar tommelen er halvveis ute.
    let v = 0;
    if (Math.abs(nx) > DEAD) {
      v = Math.sign(nx) * Math.min(1, ((Math.abs(nx) - DEAD) / (1 - DEAD)) * 1.7);
    }
    input.stickX = v;
    // Retningen spaken peker brukes til aa sikte. Dytt opp for aa skyte opp.
    input.aimMag = k;
    if (d > 0) { input.aimX = dx / d; input.aimY = dy / d; }
    const kx = d > 0 ? (dx / d) * k * R : 0;
    const ky = d > 0 ? (dy / d) * k * R : 0;
    knob.style.transform = 'translate(calc(-50% + ' + kx.toFixed(1) + 'px), calc(-50% + ' + ky.toFixed(1) + 'px))';
  }

  function release() {
    id = null;
    input.stickX = 0;
    input.aimMag = 0;
    stick.classList.remove('on');
    stick.style.left = stick.style.top = stick.style.bottom = stick.style.transform = '';
    knob.style.transform = 'translate(-50%, -50%)';
  }
  releaseStick = release;

  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    sound.unlock();
    if (id !== null) return;
    id = e.pointerId;
    try { zone.setPointerCapture(id); } catch (err) { /* ignorer */ }
    cx = e.clientX; cy = e.clientY;
    stick.classList.add('on');
    stick.style.left = cx + 'px';
    stick.style.top = cy + 'px';
    stick.style.bottom = 'auto';
    stick.style.transform = 'translate(-50%, -50%)';
    apply(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.preventDefault(); apply(e); } });
  const up = (e) => { if (e.pointerId === id) { e.preventDefault(); release(); } };
  zone.addEventListener('pointerup', up);
  zone.addEventListener('pointercancel', up);
  zone.addEventListener('lostpointercapture', up);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function setupInput(root) {
  root.querySelectorAll('[data-act]').forEach((el) => {
    const act = el.dataset.act;
    const down = (e) => {
      e.preventDefault();
      sound.unlock();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignorer */ }
      el.classList.add('down');
      press(act, true);
    };
    const up = (e) => {
      e.preventDefault();
      el.classList.remove('down');
      press(act, false);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    KeyJ: 'shoot', KeyK: 'shoot', KeyZ: 'shoot', ShiftLeft: 'shoot',
    KeyE: 'jet', KeyQ: 'hammer',
  };
  // Skriver du navnet ditt paa rekordlista, er tastene bokstaver - ikke kontroller.
  const skriver = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
  window.addEventListener('keydown', (e) => {
    const a = KEYS[e.code];
    if (!a || skriver(e)) return;
    e.preventDefault();
    if (!e.repeat) press(a, true);
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYS[e.code];
    if (!a || skriver(e)) return;
    e.preventDefault();
    press(a, false);
  });
  // Mister vi fokus (bytter app), slipp alle knapper.
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
}
