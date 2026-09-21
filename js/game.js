// game.js - selve spillet: roboten, monstrene, sjefene og banen.

import { clamp, rand, randInt, pick, chance, mulberry32, overlap, sound, input, TAU } from './core.js';
import { LEVELS, THEMES, ENEMIES, BOSSES, stats, emptyUpgrades, levelScale } from './content.js';
import * as art from './art.js';

export const VIEW_H = 540;
const GROUND_Y = 452;
const GRAV = 2300;
const ARENA_MIN = 1000;   // hvor stor sjefsarenaen er
const MAX_ACTIVE = 8;     // aldri mer enn saa mange monstre paa skjermen samtidig

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 960;
    this.H = VIEW_H;
    this.dpr = 1;
    this.t = 0;
    this.run = null;
    this.world = null;
    this.player = null;
    this.shakeT = 0;
    this.shakeAmt = 0;
    this.onEvent = () => {};
    this.resize();
  }

  // ---------------------------------------------------------------
  resize() {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const aspect = vw / vh;
    this.H = VIEW_H;
    this.W = Math.round(clamp(VIEW_H * aspect, 700, 1500));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    if (this.world && this.world.locked) {
      this.world.wallX = this.arenaWall(this.world);
    }
  }

  // ---------------------------------------------------------------
  newRun() {
    this.run = {
      level: 0,
      coins: 0,
      spent: 0,
      cleared: 0,
      up: emptyUpgrades(),
      hp: 3,
    };
    this.refreshStats();
    this.run.hp = this.st.maxHp;
  }

  refreshStats() {
    this.st = stats(this.run.up);
  }

  get worth() {
    return this.run.spent + this.run.coins + this.run.cleared * 100;
  }

  buy(key, price) {
    if (this.run.coins < price) return false;
    this.run.coins -= price;
    this.run.spent += price;
    this.run.up[key]++;
    const before = this.st.maxHp;
    this.refreshStats();
    if (this.st.maxHp > before) this.run.hp += this.st.maxHp - before;
    return true;
  }

  // ---------------------------------------------------------------
  startLevel(i) {
    this.run.level = i;
    this.refreshStats();
    this.run.hp = this.st.maxHp;        // fullt liv ved starten av hvert nivaa
    this.buildLevel(i);
    sound.setIntense(false);
  }

  buildLevel(i) {
    const L = LEVELS[i];
    const th = THEMES[L.theme];
    const rng = mulberry32(9137 + i * 971);
    const len = L.len;
    const bossAt = len - ARENA_MIN;
    const sc = levelScale(i);

    const platforms = [];
    const n = Math.floor((bossAt - 900) / 520);
    for (let k = 0; k < n; k++) {
      const x = 800 + k * 520 + rng() * 180;
      const y = GROUND_Y - (110 + rng() * 130);
      platforms.push({ x, y, w: 130 + rng() * 110, h: 26 });
    }

    // Monstre fordeles utover banen
    const pending = [];
    L.mobs.forEach(([key, count]) => {
      for (let k = 0; k < count; k++) {
        const x = 760 + rng() * (bossAt - 900);
        pending.push({ key, x });
      }
    });
    pending.sort((a, b) => a.x - b.x);

    // Loese mynter - noen paa bakken, noen paa plattformene
    const coins = [];
    for (let k = 0; k < L.coins; k++) {
      const onPlat = platforms.length && rng() < 0.45;
      if (onPlat) {
        const p = platforms[Math.floor(rng() * platforms.length)];
        coins.push(this.mkCoin(p.x + 20 + rng() * (p.w - 40), p.y - 26, 1));
      } else {
        coins.push(this.mkCoin(600 + rng() * (bossAt - 700), GROUND_Y - 30 - rng() * 60, 1));
      }
    }

    this.world = {
      i, L, th, len, bossAt, sc,
      platforms, pending, coins,
      enemies: [], bullets: [], parts: [], texts: [], pickups: [],
      camX: 0, wallX: 0, locked: false, boss: null,
      cleared: false, clearT: 0, gateOpen: false,
      coinsAtStart: this.run.coins,
    };

    this.player = {
      x: 140, y: GROUND_Y - 62, w: 46, h: 62,
      vx: 0, vy: 0, onGround: false, facing: 1,
      coyote: 0, cool: 0, inv: 0, walk: 0, flashShot: 0,
      shieldUp: this.st.hasShield, shieldT: 0, dying: 0,
    };
    this.shakeT = 0;
  }

  /**
   * Venstre vegg i sjefsarenaen. Ligger aldri til hoeyre for der spilleren
   * utloeste kampen, uansett hvor bredt eller smalt nettbrettet er.
   */
  arenaWall(w) {
    return Math.max(0, Math.min(w.bossAt, w.len - this.W));
  }

  mkCoin(x, y, val) {
    return { x, y, vx: 0, vy: 0, r: 11, seed: Math.random() * 10, val: val || 1, rest: false };
  }

  // ---------------------------------------------------------------
  //  OPPDATERING
  // ---------------------------------------------------------------
  update(dt) {
    dt = Math.min(dt, 1 / 30);
    this.t += dt;
    const w = this.world;
    if (!w) return;

    if (input.jumpBuffer > 0) input.jumpBuffer -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;

    this.updatePlayer(dt);
    this.spawnPending();
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateCoins(dt);
    this.updatePickups(dt);
    this.updateParts(dt);
    this.updateCamera(dt);

    // Sjefen dukker opp
    if (!w.locked && this.player.x > w.bossAt) {
      w.locked = true;
      w.wallX = this.arenaWall(w);
      // dytt spilleren litt inn i arenaen saa han ikke staar klistret til porten
      this.player.x = Math.max(this.player.x, w.wallX + 150);
      this.spawnBoss();
    }

    if (w.cleared) {
      w.clearT += dt;
      if (w.clearT > 1.5) {
        w.cleared = false;
        this.onEvent('cleared');
      }
    }

    if (this.player.dying > 0) {
      this.player.dying -= dt;
      if (this.player.dying <= 0) this.onEvent('dead');
    }
  }

  // --- roboten ---
  updatePlayer(dt) {
    const p = this.player;
    const w = this.world;
    const st = this.st;
    if (p.dying > 0) {
      p.vy += GRAV * dt;
      p.y += p.vy * dt;
      return;
    }

    let move = 0;
    if (input.left) move -= 1;
    if (input.right) move += 1;
    if (move !== 0) p.facing = move;

    const target = move * st.speed;
    const accel = p.onGround ? 2600 : 1500;
    if (target > p.vx) p.vx = Math.min(target, p.vx + accel * dt);
    else if (target < p.vx) p.vx = Math.max(target, p.vx - accel * dt);
    if (move === 0 && p.onGround) p.vx *= Math.pow(0.0008, dt);

    // hopp - med litt slingringsmonn slik at det foeles snilt
    if (p.onGround) p.coyote = 0.13; else p.coyote -= dt;
    if (input.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -st.jump;
      p.onGround = false;
      p.coyote = 0;
      input.jumpBuffer = 0;
      sound.jump();
      this.puff(p.x + p.w / 2, p.y + p.h, 6, '#ffffff');
    }
    // slipper du hoppknappen tidlig, hopper du kortere
    if (!input.jumpHeld && p.vy < -220) p.vy += GRAV * 1.6 * dt;

    p.vy += GRAV * dt;
    p.vy = Math.min(p.vy, 1400);

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.collide(p);

    const minX = w.locked ? w.wallX + 4 : 0;
    p.x = clamp(p.x, minX, w.len - p.w - 4);
    if (p.x <= minX && p.vx < 0) p.vx = 0;

    if (p.onGround && Math.abs(p.vx) > 30) p.walk += dt * Math.abs(p.vx) * 0.045;

    // skyting
    p.cool -= dt;
    p.flashShot = Math.max(0, p.flashShot - dt * 7);
    if (input.shoot && p.cool <= 0) {
      p.cool = st.cool;
      p.flashShot = 1;
      const bx = p.x + p.w / 2 + p.facing * (p.h * 0.34 + 16);
      const by = p.y + p.h * 0.36;
      w.bullets.push({ x: bx, y: by, vx: p.facing * 760, vy: 0, r: 8, dmg: st.dmg, friendly: true, life: 1.5 });
      sound.shoot();
    }

    // skjold lader seg opp igjen
    if (st.hasShield && !p.shieldUp) {
      p.shieldT -= dt;
      if (p.shieldT <= 0) { p.shieldUp = true; this.ring(p.x + p.w / 2, p.y + p.h / 2, 40, '#7fe8ff'); }
    }
    if (p.inv > 0) p.inv -= dt;
  }

  collide(e) {
    const w = this.world;
    e.onGround = false;
    // bakken
    if (e.y + e.h >= GROUND_Y) {
      e.y = GROUND_Y - e.h;
      if (e.vy > 0) e.vy = 0;
      e.onGround = true;
    }
    // plattformer - du kan hoppe opp gjennom dem og lande paa toppen
    for (const p of w.platforms) {
      if (e.vy < 0) continue;
      if (e.x + e.w < p.x + 4 || e.x > p.x + p.w - 4) continue;
      const prev = e.y + e.h - e.vy * (1 / 60);
      if (e.y + e.h >= p.y && prev <= p.y + 14) {
        e.y = p.y - e.h;
        e.vy = 0;
        e.onGround = true;
      }
    }
  }

  damagePlayer(n, fromX) {
    const p = this.player;
    if (p.inv > 0 || p.dying > 0) return;
    if (p.shieldUp) {
      p.shieldUp = false;
      p.shieldT = this.st.shieldCool;
      p.inv = 0.8;
      sound.hit();
      this.ring(p.x + p.w / 2, p.y + p.h / 2, 46, '#7fe8ff');
      return;
    }
    this.run.hp -= n;
    p.inv = 1.4;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 280;
    p.vy = -330;
    this.shake(0.25, 9);
    sound.hurt();
    this.puff(p.x + p.w / 2, p.y + p.h / 2, 10, '#ff8a8a');
    if (this.run.hp <= 0) {
      this.run.hp = 0;
      p.dying = 1.3;
      p.vy = -520;
      sound.lose();
      sound.stopMusic();
    }
  }

  // --- monstre ---
  spawnPending() {
    const w = this.world;
    const edge = w.camX + this.W + 90;
    while (w.pending.length && w.pending[0].x < edge) {
      const s = w.pending.shift();
      if (w.enemies.length >= MAX_ACTIVE) { w.pending.unshift(s); break; }
      this.spawnEnemy(s.key, s.x);
    }
  }

  spawnEnemy(key, x, opt = {}) {
    const d = ENEMIES[key];
    const w = this.world;
    const flying = d.ai === 'fly' || d.float;
    const e = {
      key, def: d, boss: false,
      w: d.w, h: d.h,
      x: x - d.w / 2,
      y: flying ? GROUND_Y - 150 - rand(0, 110) : GROUND_Y - d.h,
      vx: 0, vy: 0, onGround: false, facing: -1,
      hp: Math.round(d.hp * w.sc.hp), maxHp: Math.round(d.hp * w.sc.hp),
      seed: rand(0, 10), hurtT: 0, timer: rand(0, 1.4), state: 0, anim: true,
      baseY: 0,
    };
    e.baseY = e.y;
    if (opt.vx != null) e.vx = opt.vx;
    if (opt.vy != null) e.vy = opt.vy;
    w.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const w = this.world;
    const key = w.L.boss;
    const d = BOSSES[key];
    const b = {
      key, def: d, boss: true, pattern: d.pattern,
      w: d.w, h: d.h,
      x: w.len - 300 - d.w / 2,
      y: d.fly ? GROUND_Y - 300 : GROUND_Y - d.h,
      vx: 0, vy: 0, onGround: false, facing: -1,
      hp: d.hp, maxHp: d.hp,
      seed: rand(0, 10), hurtT: 0, timer: 1.4, state: 0, anim: true,
      baseY: 0, phase: 0,
    };
    b.baseY = b.y;
    w.enemies.push(b);
    w.boss = b;
    sound.boss();
    sound.setIntense(true);
    this.shake(0.6, 14);
  }

  updateEnemies(dt) {
    const w = this.world;
    const p = this.player;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;

    for (let i = w.enemies.length - 1; i >= 0; i--) {
      const e = w.enemies[i];
      const d = e.def;
      if (e.hurtT > 0) e.hurtT -= dt;
      e.timer -= dt;
      const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
      const dir = pcx < ecx ? -1 : 1;
      e.facing = dir;

      if (e.boss) this.bossAI(e, dt, dir, pcx, pcy);
      else this.mobAI(e, dt, dir, pcx, pcy);

      // enkel fysikk for de som gaar paa bakken
      if (!(d.ai === 'fly' || d.float || (e.boss && d.fly))) {
        e.vy += GRAV * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        this.collide(e);
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      e.x = clamp(e.x, (w.locked ? w.wallX : 0) + 2, w.len - e.w - 2);

      // kontaktskade + trampe paa hodet
      if (p.dying <= 0 && overlap(p, e)) {
        const stomping = p.vy > 140 && p.y + p.h - p.vy * dt <= e.y + e.h * 0.45;
        if (stomping && !e.boss) {
          this.hurtEnemy(e, this.st.dmg * 1.5, ecx, ecy);
          p.vy = -560;
          sound.hit();
        } else {
          this.damagePlayer(d.touch || 1, ecx);
        }
      }

      if (e.hp <= 0) {
        this.killEnemy(e, i);
      }
    }
  }

  mobAI(e, dt, dir, pcx, pcy) {
    const d = e.def;
    const w = this.world;
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dist = Math.abs(pcx - ecx);

    if (d.ai === 'walk') {
      e.vx = dir * d.sp;
    } else if (d.ai === 'hop') {
      if (e.onGround) {
        e.vx *= 0.86;
        if (e.timer <= 0) {
          e.timer = rand(0.9, 1.5);
          e.vy = -520;
          e.vx = dir * d.sp * 2.2;
        }
      }
    } else if (d.ai === 'fly') {
      const ty = pcy - 40 + Math.sin(this.t * 2.2 + e.seed) * 60;
      e.vx = dir * d.sp;
      e.vy = clamp((ty - ecy) * 2.4, -170, 170);
    } else if (d.ai === 'shoot') {
      // holder avstand og skyter
      const want = 320;
      e.vx = dist > want + 60 ? dir * d.sp : dist < want - 60 ? -dir * d.sp : e.vx * 0.9;
      e.vy = Math.sin(this.t * 2 + e.seed) * 26;
      if (e.timer <= 0 && dist < 620) {
        e.timer = d.shotEvery;
        this.enemyShot(ecx, ecy, pcx, pcy, d.shotSpeed, '#ff7ad9');
      }
    } else if (d.ai === 'cast') {
      e.vx = dist > 420 ? dir * d.sp : dist < 260 ? -dir * d.sp * 0.7 : 0;
      if (e.timer <= 0 && dist < 700) {
        e.timer = d.shotEvery;
        const b = this.enemyShot(ecx, ecy - e.h * 0.4, pcx, pcy, d.shotSpeed, '#ffe66d');
        b.homing = 2.2;
        b.r = 13;
      }
    }
  }

  bossAI(e, dt, dir, pcx, pcy) {
    const d = e.def;
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dist = Math.abs(pcx - ecx);
    const hpFrac = e.hp / e.maxHp;
    const rage = hpFrac < 0.4 ? 0.65 : 1; // blir raskere naar den er skadet

    switch (e.pattern) {
      case 'jump-spawn': {
        if (e.onGround) {
          e.vx *= 0.85;
          if (e.timer <= 0) {
            e.timer = 1.7 * rage;
            e.vy = -700;
            e.vx = dir * d.sp * 2.6;
            e.state++;
            if (e.state % 3 === 0) {
              for (let k = 0; k < 2; k++) this.spawnEnemy('slim', ecx + rand(-90, 90));
            }
          }
        }
        break;
      }
      case 'spread': {
        e.vx = dist > 280 ? dir * d.sp : -dir * d.sp * 0.5;
        if (e.timer <= 0) {
          e.timer = 2.3 * rage;
          for (let k = -2; k <= 2; k++) {
            const b = this.enemyShot(ecx, ecy, pcx, pcy, 260, '#c39bff');
            const a = Math.atan2(b.vy, b.vx) + k * 0.2;
            const sp = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
          }
          sound.hit();
        }
        break;
      }
      case 'dive-bomb': {
        if (e.state === 0) {
          const ty = GROUND_Y - 300 + Math.sin(this.t * 1.6) * 50;
          e.vx = clamp((pcx - ecx) * 1.8, -d.sp, d.sp);
          e.vy = clamp((ty - ecy) * 2.2, -200, 200);
          if (e.timer <= 0) {
            e.timer = 2.4 * rage;
            if (chance(0.5)) { e.state = 1; e.vy = 640; }
            else this.enemyShot(ecx, ecy + e.h * 0.4, pcx, GROUND_Y, 300, '#ff9a3d');
          }
        } else {
          e.vx *= 0.96;
          if (e.y + e.h >= GROUND_Y) {
            e.y = GROUND_Y - e.h;
            e.state = 0;
            e.vy = -420;
            this.shake(0.3, 12);
            this.shock(ecx);
          }
        }
        break;
      }
      case 'slam': {
        e.vx = dist > 180 ? dir * d.sp : 0;
        if (e.onGround && e.timer <= 0) {
          e.timer = 3.0 * rage;
          e.vy = -520;
          e.state = 1;
        }
        if (e.state === 1 && e.onGround && e.vy === 0) {
          e.state = 0;
          this.shake(0.35, 14);
          this.shock(ecx);
          sound.boss();
        }
        break;
      }
      case 'teleport-orb': {
        e.vx = 0;
        e.vy = Math.sin(this.t * 2) * 20;
        if (e.timer <= 0) {
          e.timer = 2.6 * rage;
          if (e.state === 0) {
            for (let k = 0; k < 3; k++) {
              const b = this.enemyShot(ecx, ecy - 20 + k * 22, pcx, pcy, 175, '#ffe66d');
              b.homing = 2.6; b.r = 14;
            }
            e.state = 1;
          } else {
            this.puff(ecx, ecy, 16, '#3ec7d6');
            e.x = clamp(pcx + (chance(0.5) ? -360 : 360) - e.w / 2,
              this.world.wallX + 20, this.world.len - e.w - 20);
            e.y = GROUND_Y - e.h;
            this.puff(e.x + e.w / 2, ecy, 16, '#3ec7d6');
            e.state = 0;
            e.timer = 0.7;
          }
        }
        break;
      }
      case 'all-in': {
        e.vx = dist > 240 ? dir * d.sp : -dir * d.sp * 0.4;
        if (e.onGround && e.timer <= 0) {
          e.timer = 2.0 * rage;
          e.phase = (e.phase + 1) % 3;
          if (e.phase === 0) {
            for (let k = -3; k <= 3; k++) {
              const b = this.enemyShot(ecx, ecy, pcx, pcy, 300, '#ff6b6b');
              const a = Math.atan2(b.vy, b.vx) + k * 0.17;
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
            }
          } else if (e.phase === 1) {
            e.vy = -560;
            e.state = 1;
          } else {
            this.spawnEnemy('flagg', ecx - 60);
            this.spawnEnemy('flagg', ecx + 60);
          }
        }
        if (e.state === 1 && e.onGround && e.vy === 0) {
          e.state = 0; this.shake(0.35, 14); this.shock(ecx); sound.boss();
        }
        break;
      }
    }
  }

  /** Sjokkboelge langs bakken i begge retninger. */
  shock(x) {
    const w = this.world;
    for (const s of [-1, 1]) {
      w.bullets.push({
        x: x + s * 40, y: GROUND_Y - 18, vx: s * 320, vy: 0, r: 16,
        friendly: false, life: 3, color: '#ff9a3d', ground: true,
      });
    }
    this.ring(x, GROUND_Y - 10, 60, '#ff9a3d');
  }

  enemyShot(x, y, tx, ty, sp, color) {
    const a = Math.atan2(ty - y, tx - x);
    const b = {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 10, friendly: false, life: 5, color,
    };
    this.world.bullets.push(b);
    return b;
  }

  hurtEnemy(e, dmg, x, y) {
    e.hp -= dmg;
    e.hurtT = 0.16;
    this.puff(x, y, 4, '#ffe6a0');
    if (e.hp > 0) sound.hit();
  }

  killEnemy(e, idx) {
    const w = this.world;
    w.enemies.splice(idx, 1);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    sound.kill();
    this.puff(cx, cy, e.boss ? 40 : 12, e.def.body);
    this.ring(cx, cy, e.boss ? 140 : 46, e.def.body);

    const cr = e.def.coins;
    let n = e.boss ? e.def.coins : randInt(cr[0], cr[1]);
    if (!e.boss) n = Math.max(1, Math.round(n * w.sc.coin));
    for (let k = 0; k < n; k++) {
      const c = this.mkCoin(cx + rand(-14, 14), cy, 1);
      c.vx = rand(-180, 180);
      c.vy = rand(-380, -160);
      w.coins.push(c);
    }
    // av og til faller det et hjerte
    if (!e.boss && chance(0.09) && this.run.hp < this.st.maxHp) {
      w.pickups.push({ x: cx, y: cy, vx: rand(-60, 60), vy: -260, r: 16, life: 16 });
    } else if (e.boss) {
      w.pickups.push({ x: cx, y: cy, vx: -40, vy: -280, r: 16, life: 99 });
      w.pickups.push({ x: cx, y: cy, vx: 40, vy: -280, r: 16, life: 99 });
    }

    if (e.boss) {
      w.boss = null;
      w.cleared = true;
      w.clearT = 0;
      w.gateOpen = true;
      this.shake(0.7, 18);
      sound.win();
      sound.setIntense(false);
      this.run.cleared++;
    }
  }

  // --- skudd ---
  updateBullets(dt) {
    const w = this.world;
    const p = this.player;
    for (let i = w.bullets.length - 1; i >= 0; i--) {
      const b = w.bullets[i];
      b.life -= dt;
      if (b.homing > 0) {
        b.homing -= dt;
        const a = Math.atan2(p.y + p.h / 2 - b.y, p.x + p.w / 2 - b.x);
        const sp = Math.hypot(b.vx, b.vy);
        const ca = Math.atan2(b.vy, b.vx);
        let da = a - ca;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        const na = ca + clamp(da, -1.8 * dt, 1.8 * dt);
        b.vx = Math.cos(na) * sp;
        b.vy = Math.sin(na) * sp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      const box = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
      let gone = b.life <= 0 || b.x < w.camX - 120 || b.x > w.camX + this.W + 120 || b.y > VIEW_H + 60 || b.y < -80;

      if (!gone && b.friendly) {
        for (const e of w.enemies) {
          if (overlap(box, e)) {
            this.hurtEnemy(e, b.dmg, b.x, b.y);
            gone = true;
            break;
          }
        }
      } else if (!gone) {
        if (p.dying <= 0 && overlap(box, p)) {
          this.damagePlayer(1, b.x);
          gone = true;
        }
      }
      if (gone) w.bullets.splice(i, 1);
    }
  }

  // --- mynter ---
  updateCoins(dt) {
    const w = this.world;
    const p = this.player;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    // Naar sjefen er slaatt suges alle mynter inn - ingen skal gaa glipp av gevinsten.
    const mag = w.cleared ? 1e6 : this.st.magnet;
    for (let i = w.coins.length - 1; i >= 0; i--) {
      const c = w.coins[i];
      const dx = pcx - c.x, dy = pcy - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mag) {
        const pull = 900 * (1 - dist / mag) + 260;
        c.vx += (dx / dist) * pull * dt;
        c.vy += (dy / dist) * pull * dt;
        c.rest = false;
      } else if (!c.rest) {
        c.vy += GRAV * 0.55 * dt;
        c.vx *= Math.pow(0.35, dt);
      }
      if (!c.rest) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > GROUND_Y - c.r && dist >= mag) {
          c.y = GROUND_Y - c.r;
          c.vy = 0; c.vx = 0;
          c.rest = true;
        }
      }
      if (dist < 34) {
        this.run.coins += c.val;
        w.coins.splice(i, 1);
        sound.coin();
        w.texts.push({ x: c.x, y: c.y, vy: -60, life: 0.7, max: 0.7, text: '+' + c.val, color: '#ffd84d', size: 22 });
      }
    }
  }

  updatePickups(dt) {
    const w = this.world;
    const p = this.player;
    for (let i = w.pickups.length - 1; i >= 0; i--) {
      const h = w.pickups[i];
      h.life -= dt;
      h.vy += GRAV * 0.5 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      if (h.y > GROUND_Y - h.r) { h.y = GROUND_Y - h.r; h.vy = 0; h.vx *= 0.6; }
      const box = { x: h.x - h.r, y: h.y - h.r, w: h.r * 2, h: h.r * 2 };
      if (overlap(box, p)) {
        if (this.run.hp < this.st.maxHp) this.run.hp++;
        sound.heart();
        this.ring(h.x, h.y, 40, '#ef4d5a');
        w.pickups.splice(i, 1);
      } else if (h.life <= 0) {
        w.pickups.splice(i, 1);
      }
    }
  }

  // --- effekter ---
  puff(x, y, n, color) {
    const w = this.world;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(60, 300);
      w.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        r: rand(3, 8), life: rand(0.25, 0.6), max: 0.6, color,
      });
    }
  }

  ring(x, y, r, color) {
    this.world.parts.push({ x, y, vx: 0, vy: 0, r, life: 0.4, max: 0.4, color, kind: 'ring' });
  }

  shake(time, amt) {
    this.shakeT = Math.max(this.shakeT, time);
    this.shakeAmt = amt;
  }

  updateParts(dt) {
    const w = this.world;
    for (let i = w.parts.length - 1; i >= 0; i--) {
      const p = w.parts[i];
      p.life -= dt;
      if (p.kind !== 'ring') {
        p.vy += GRAV * 0.4 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (p.life <= 0) w.parts.splice(i, 1);
    }
    for (let i = w.texts.length - 1; i >= 0; i--) {
      const ft = w.texts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) w.texts.splice(i, 1);
    }
  }

  updateCamera(dt) {
    const w = this.world;
    const p = this.player;
    const maxX = Math.max(0, w.len - this.W);
    let target;
    if (w.locked) {
      target = w.wallX;
    } else {
      target = p.x + p.w / 2 - this.W * 0.40;
    }
    target = clamp(target, 0, maxX);
    w.camX += (target - w.camX) * Math.min(1, dt * 7);
    if (w.locked) w.camX = target;
  }

  // ---------------------------------------------------------------
  //  TEGNING
  // ---------------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    const w = this.world;
    const W = this.W, H = this.H;
    if (!w) {
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const th = w.th;
    art.drawBackground(ctx, th, w.camX, W, H, this.t);
    art.drawGround(ctx, th, w.camX, W, H, GROUND_Y);

    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      sx = rand(-1, 1) * this.shakeAmt * this.shakeT * 3;
      sy = rand(-1, 1) * this.shakeAmt * this.shakeT * 3;
    }

    ctx.save();
    ctx.translate(-w.camX + sx, sy);

    for (const p of w.platforms) {
      if (p.x + p.w < w.camX - 60 || p.x > w.camX + W + 60) continue;
      art.drawPlatform(ctx, p, th, 0);
    }

    art.drawGate(ctx, (w.locked ? w.wallX : w.bossAt) + 26, GROUND_Y, th, this.t, w.gateOpen);

    for (const c of w.coins) {
      if (c.x < w.camX - 40 || c.x > w.camX + W + 40) continue;
      art.drawCoin(ctx, c, this.t);
    }
    for (const h of w.pickups) art.drawHeart(ctx, h.x, h.y, h.r, this.t);

    for (const e of w.enemies) {
      if (e.x + e.w < w.camX - 80 || e.x > w.camX + W + 80) continue;
      art.drawCreature(ctx, e, this.t);
    }

    for (const b of w.bullets) art.drawBullet(ctx, b);

    const p = this.player;
    const blink = p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0;
    if (!blink) {
      ctx.save();
      if (p.dying > 0) {
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate((1.3 - p.dying) * 3);
        ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
      }
      art.drawRobot(ctx, p.x + p.w / 2, p.y + p.h, p.h, {
        up: this.run.up,
        facing: p.facing,
        walk: p.walk,
        moving: Math.abs(p.vx) > 30,
        onGround: p.onGround,
        t: this.t,
        flashShot: p.flashShot,
        shieldOn: p.shieldUp,
        flash: p.inv > 0.9,
      });
      ctx.restore();
    }

    for (const pt of w.parts) art.drawParticle(ctx, pt);
    for (const ft of w.texts) art.drawFloatText(ctx, ft);

    ctx.restore();
  }

  // Tall som HUD-en trenger
  hudState() {
    const w = this.world;
    return {
      hp: this.run ? this.run.hp : 0,
      maxHp: this.st ? this.st.maxHp : 3,
      coins: this.run ? this.run.coins : 0,
      shield: this.player ? this.player.shieldUp : false,
      progress: w ? clamp((this.player.x - 100) / Math.max(1, w.bossAt - 100), 0, 1) : 0,
      boss: w && w.boss ? w.boss.hp / w.boss.maxHp : null,
      bossFace: w && w.boss ? w.boss.def.face : '',
    };
  }
}

export { GROUND_Y };
