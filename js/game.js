// game.js - selve spillet: roboten, monstrene, sjefene og banen.

import { clamp, rand, randInt, chance, mulberry32, overlap, sound, input, moveAxis, TAU } from './core.js';
import { LEVELS, THEMES, ENEMIES, BOSSES, POWERUPS, stats, emptyUpgrades, levelScale } from './content.js';
import { ROBOT_RIG, rigFor, MONSTER_RIGS } from './rigs.js';
import * as sprites from './sprites.js';
import * as art from './art.js';

export const VIEW_H = 540;
const GROUND_Y = 452;
const GRAV = 2300;
const ARENA_MIN = 1000;
const MAX_ACTIVE = 8;

// Kameraet zoomer inn, saa roboten og monstrene blir store paa skjermen.
// Banen, hoppene og plattformene er de samme - bare utsnittet er mindre.
const ZOOM = 1.5;
const ZOOM_SJEF = 1.1;   // minste zoom i sjefkampen, saa baade sjefen og roboten faar plass
const BAKKEKANT = 60;    // hvor mye bakke som vises under foettene (i verdensenheter)
const TAK = -40;         // hoeyere enn dette kan ikke roboten fly

/**
 * Ser etter egne PNG-figurer. Bare grunnfilene hentes med en gang -
 * oppgraderings-variantene lastes foerst naar de faktisk kjoepes.
 * Finnes ingen filer tegner spillet figurene selv, og de 404-ene du
 * ser i nettleserkonsollen er helt ufarlige.
 */
export function preloadFigures() {
  sprites.preload(sprites.rigPaths(ROBOT_RIG, 0));
  Object.values(MONSTER_RIGS).forEach((r) => sprites.preload(sprites.rigPaths(r, 0)));
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 960;
    this.H = VIEW_H;
    this.zoom = ZOOM;
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
    this.H = VIEW_H;
    this.W = Math.round(clamp(VIEW_H * (vw / vh), 700, 1500));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.world && this.world.locked) this.world.wallX = this.arenaWall(this.world);
  }

  /** Hvor mye av banen som synes, i verdensenheter (skjermen delt paa zoomen). */
  get viewW() { return this.W / this.zoom; }
  get viewH() { return this.H / this.zoom; }

  /** Kameraets hoeyde naar roboten staar paa bakken: bakken nederst paa skjermen. */
  camYHvile() { return GROUND_Y + BAKKEKANT - this.viewH; }

  // ---------------------------------------------------------------
  newRun() {
    this.run = { level: 0, coins: 0, spent: 0, cleared: 0, up: emptyUpgrades(), hp: 3 };
    this.refreshStats();
    this.run.hp = this.st.maxHp;
  }

  refreshStats() {
    this.st = stats(this.run.up);
    // Roboten vokser for hver oppgradering - behold foettene paa samme sted.
    if (this.player) {
      const feet = this.player.y + this.player.h;
      const mid = this.player.x + this.player.w / 2;
      this.player.h = this.st.size;
      this.player.w = this.st.size * 0.58;
      this.player.y = feet - this.player.h;
      this.player.x = mid - this.player.w / 2;
    }
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
    this.run.hp = this.st.maxHp;
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

    // Plattformene legges innenfor det roboten FAKTISK klarer aa hoppe.
    // Den oeverste naar du ved aa hoppe videre fra den nederste.
    const apex = (this.st.jump * this.st.jump) / (2 * GRAV);
    const rise = Math.min(apex * 0.72, 125);
    const platforms = [];
    const pickups = [];
    const n = Math.floor((bossAt - 900) / 520);
    for (let k = 0; k < n; k++) {
      const x = 800 + k * 520 + rng() * 150;
      const w = 130 + rng() * 110;
      const p1 = { x, y: GROUND_Y - rise * (0.72 + rng() * 0.28), w, h: 26 };
      platforms.push(p1);
      if (rng() < 0.62) {
        const w2 = 110 + rng() * 80;
        const gap = 40 + rng() * 50;                 // lite nok til aa hoppe over
        const right = rng() < 0.5;
        const x2 = right ? x + w + gap : x - gap - w2;
        const p2 = {
          x: clamp(x2, 700, bossAt - 300),
          y: p1.y - rise * (0.72 + rng() * 0.2),
          w: w2, h: 26,
        };
        platforms.push(p2);
        // Kraftpakke oeverst - noe aa klatre etter.
        const r = rng();
        const kind = r < 0.4 ? 'rate' : r < 0.75 ? 'star' : 'heal';
        pickups.push(this.mkPickup(p2.x + p2.w / 2, p2.y - 32, kind, true));
      }
    }

    const pending = [];
    L.mobs.forEach(([key, count]) => {
      for (let k = 0; k < count; k++) pending.push({ key, x: 760 + rng() * (bossAt - 900) });
    });
    pending.sort((a, b) => a.x - b.x);

    const coins = [];
    for (let k = 0; k < L.coins; k++) {
      if (platforms.length && rng() < 0.45) {
        const p = platforms[Math.floor(rng() * platforms.length)];
        coins.push(this.mkCoin(p.x + 20 + rng() * (p.w - 40), p.y - 26, 1));
      } else {
        coins.push(this.mkCoin(600 + rng() * (bossAt - 700), GROUND_Y - 30 - rng() * 60, 1));
      }
    }

    this.zoom = ZOOM;
    this.world = {
      i, L, th, len, bossAt, sc,
      platforms, pending, coins, pickups,
      enemies: [], bullets: [], parts: [], texts: [], lasers: [], smashes: [],
      camX: 0, camY: this.camYHvile(), wallX: 0, locked: false, boss: null,
      cleared: false, clearT: 0, gateOpen: false,
      coinsAtStart: this.run.coins,
    };
    art.lastTema(th);   // egne bakgrunnsbilder for temaet, hvis du har laget noen

    const size = this.st.size;
    this.player = {
      x: 140, y: GROUND_Y - size, w: size * 0.58, h: size,
      vx: 0, vy: 0, onGround: false, facing: 1,
      coyote: 0, cool: 0, inv: 0, walk: 0, flashShot: 0,
      shieldUp: this.st.hasShield, shieldT: 0, dying: 0,
      laserCool: 1.2, smashCool: 0, smashT: 0,
      fuel: 1, jetting: false, jetPause: 0, jetLyd: 0, tom: false,
      boostRate: 0, boostStar: 0, aim: 0,
    };
    this.shakeT = 0;
  }

  // Arenaen er like bred som det kameraet ser naar det er zoomet lengst ut.
  arenaWall(w) { return Math.max(0, Math.min(w.bossAt, w.len - this.W / ZOOM_SJEF)); }

  mkCoin(x, y, val) {
    return { x, y, vx: 0, vy: 0, r: 11, seed: Math.random() * 10, val: val || 1, rest: false };
  }

  /** anchored = staar stille paa en plattform. Ellers faller den til bakken. */
  mkPickup(x, y, kind, anchored) {
    return {
      x, y, vx: 0, vy: 0, r: 17, kind: kind || 'heal',
      seed: Math.random() * 10, life: anchored ? 1e9 : 16, anchored: !!anchored,
    };
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
    if (input.hammerBuffer > 0) input.hammerBuffer -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;

    this.updatePlayer(dt);
    this.spawnPending();
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateCoins(dt);
    this.updatePickups(dt);
    this.updateParts(dt);
    this.updateCamera(dt);

    if (!w.locked && this.player.x > w.bossAt) {
      w.locked = true;
      w.wallX = this.arenaWall(w);
      this.player.x = Math.max(this.player.x, w.wallX + 150);
      this.spawnBoss();
    }

    if (w.cleared) {
      w.clearT += dt;
      if (w.clearT > 1.5) { w.cleared = false; this.onEvent('cleared'); }
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
      p.jetting = false;
      p.vy += GRAV * dt;
      p.y += p.vy * dt;
      return;
    }

    const move = moveAxis();               // -1..1 fra styrespak eller tastatur
    if (Math.abs(move) > 0.2) p.facing = move > 0 ? 1 : -1;

    const target = move * st.speed;
    const accel = p.onGround ? 2600 : 1500;
    if (target > p.vx) p.vx = Math.min(target, p.vx + accel * dt);
    else if (target < p.vx) p.vx = Math.max(target, p.vx - accel * dt);
    if (move === 0 && p.onGround) p.vx *= Math.pow(0.0008, dt);

    // hopp - med litt slingringsmonn rett etter at roboten gikk utfor en kant
    if (p.onGround) p.coyote = 0.13; else p.coyote -= dt;
    if (input.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -st.jump;
      p.onGround = false; p.coyote = 0;
      input.jumpBuffer = 0;
      sound.jump();
      this.puff(p.x + p.w / 2, p.y + p.h, 6, '#ffffff');
      this.effekt('stov', p.x + p.w / 2, p.y + p.h + 2, p.w * 0.45, 0.25, { fra: 0.8, til: 1.2, bunn: true });
    }

    // --- JETPAKKE: hold jetknappen, saa flyr roboten saa lenge tanken rekker ---
    // Er tanken tom, maa den fylles til 30 % foer den virker igjen - ogsaa om
    // knappen holdes inne. Da starter jetpakken av seg selv naar det er nok.
    p.jetting = false;
    if (st.jet > 0) {
      if (input.jet && p.fuel > 0 && !p.tom) {
        p.jetting = true;
        // Bare skyv (og bruk drivstoff) naar roboten ikke allerede stiger fortere
        // enn jetpakken klarer - da bremser den ikke et hopp. Tyngdekraften legges
        // til etterpaa, saa farten blir den samme uansett bildefrekvens.
        if (p.vy > -st.jetFart) {
          p.vy = Math.max(p.vy - (GRAV + st.jetKraft) * dt, -st.jetFart - GRAV * dt);
          p.fuel = Math.max(0, p.fuel - dt / st.jetTid);
        }
        p.onGround = false;
        p.jetPause = 0.35;               // litt pause foer tanken begynner aa fylles igjen
        p.jetLyd -= dt;
        if (p.jetLyd <= 0) { p.jetLyd = 0.11; sound.jet(); }
        this.jetFlamme(p);
        if (p.fuel === 0) { p.tom = true; sound.empty(); }
      } else if (p.jetPause > 0) {
        p.jetPause -= dt;
      } else {
        p.fuel = Math.min(1, p.fuel + st.jetLading * dt);
        if (p.fuel >= 0.3) p.tom = false;
      }
    }

    if (!input.jumpHeld && !p.jetting && p.vy < -220) p.vy += GRAV * 1.6 * dt;

    p.vy += GRAV * dt;
    p.vy = Math.min(p.vy, 1400);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < TAK) { p.y = TAK; if (p.vy < 0) p.vy = 0; }
    const iLufta = !p.onGround, fallFart = p.vy;
    this.collide(p);
    if (iLufta && p.onGround && fallFart > 420 && p.dying <= 0) {
      this.effekt('stov', p.x + p.w / 2, p.y + p.h + 2, p.w * 0.6, 0.3, { fra: 0.7, til: 1.3, bunn: true });
    }

    const minX = w.locked ? w.wallX + 4 : 0;
    p.x = clamp(p.x, minX, w.len - p.w - 4);
    if (p.x <= minX && p.vx < 0) p.vx = 0;

    if (p.onGround && Math.abs(p.vx) > 30) p.walk += dt * Math.abs(p.vx) * 0.045;

    // --- KANON ---
    // Roboten skyter av seg selv paa det som kommer imot, saa man ikke trenger
    // aa holde skyteknappen og hoppeknappen samtidig med samme tommel.
    // Trykker du selv, skyter den litt raskere.
    p.cool -= dt;
    p.flashShot = Math.max(0, p.flashShot - dt * 7);
    p.boostRate = Math.max(0, p.boostRate - dt);
    p.boostStar = Math.max(0, p.boostStar - dt);

    // --- SIKTE ---
    // Dytter du spaken opp eller paa skraa, sikter roboten dit. Ellers sikter
    // den selv paa det naermeste monsteret - ogsaa det som flyr hoeyt oppe.
    const cx = p.x + p.w / 2, cy = p.y + p.h * 0.42;
    const stickAim = input.aimMag > 0.3 && Math.abs(input.aimY) > 0.35;
    const aimAt = this.nearestTarget(640);
    if (stickAim) {
      p.aim = Math.atan2(input.aimY, input.aimX);
      if (Math.abs(input.aimX) > 0.25) p.facing = input.aimX > 0 ? 1 : -1;
    } else if (aimAt) {
      p.aim = Math.atan2(aimAt.y + aimAt.h / 2 - cy, aimAt.x + aimAt.w / 2 - cx);
    } else {
      p.aim = p.facing > 0 ? 0 : Math.PI;
    }

    let firing = input.shoot;
    let coolMul = p.boostRate > 0 ? 0.5 : 1;     // ⚡ dobbel skuddfart
    if (!firing && aimAt) { firing = true; coolMul *= 1.3; }
    if (firing && p.cool <= 0) {
      p.cool = st.cool * coolMul;
      p.flashShot = 1;
      const reach = p.h * 0.46;
      const ca = Math.cos(p.aim), sa = Math.sin(p.aim);
      w.bullets.push({
        x: cx + ca * reach, y: cy + sa * reach,
        vx: ca * 780, vy: sa * 780,
        r: 7 + st.dmg * 0.5, dmg: st.dmg, friendly: true, life: 1.5,
        tier: this.run.up.kanon | 0,
      });
      sound.shoot();
    }

    // --- LASEROEYNE: skyter av seg selv paa naermeste monster ---
    if (st.laser > 0) {
      p.laserCool -= dt;
      if (p.laserCool <= 0 && this.fireLaser()) p.laserCool = st.laserEvery;
    }

    // --- HAMMER: slaar naar du trykker paa hammerknappen ---
    p.smashT = Math.max(0, p.smashT - dt);
    p.smashCool = Math.max(0, p.smashCool - dt);
    if (st.hammer > 0 && input.hammerBuffer > 0 && p.smashCool <= 0) {
      input.hammerBuffer = 0;
      this.smash();
    }

    if (st.hasShield && !p.shieldUp) {
      p.shieldT -= dt;
      if (p.shieldT <= 0) { p.shieldUp = true; this.ring(p.x + p.w / 2, p.y + p.h / 2, 40, '#7fe8ff'); }
    }
    if (p.inv > 0) p.inv -= dt;
  }

  /**
   * Naermeste monster roboten kan skyte paa - i den retningen den ser, eller
   * rett over/under seg. Brukt baade til automatisk sikting og skyting.
   */
  nearestTarget(range) {
    const p = this.player;
    const cx = p.x + p.w / 2, cy = p.y + p.h * 0.42;
    let best = null, bd = Infinity;
    for (const e of this.world.enemies) {
      if (!this.synlig(e)) continue;        // ikke skyt paa noe du ikke ser
      const dx = (e.x + e.w / 2) - cx;
      // ikke snu seg etter noe langt bak, men ta med det som er rett over
      if (Math.abs(dx) > 130 && Math.sign(dx) !== p.facing) continue;
      const d = Math.hypot(dx, (e.y + e.h / 2) - cy);
      if (d < range && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  fireLaser() {
    const p = this.player, w = this.world, st = this.st;
    const ex = p.x + p.w / 2, ey = p.y + p.h * 0.16;
    let best = null, bd = 1e9;
    for (const e of w.enemies) {
      if (!this.synlig(e)) continue;
      const d = Math.hypot(e.x + e.w / 2 - ex, e.y + e.h / 2 - ey);
      if (d < 620 && d < bd) { bd = d; best = e; }
    }
    if (!best) return false;
    const tx = best.x + best.w / 2, ty = best.y + best.h / 2;
    const ang = Math.atan2(ty - ey, tx - ex);
    const reach = bd * 1.35 + 60;
    const x1 = ex + Math.cos(ang) * reach, y1 = ey + Math.sin(ang) * reach;

    // straalen gaar tvers gjennom - alt den treffer faar skade
    for (const e of w.enemies) {
      if (segHitsBox(ex, ey, x1, y1, e)) this.hurtEnemy(e, st.laserDmg, e.x + e.w / 2, e.y + e.h / 2);
    }
    w.lasers.push({ x0: ex, y0: ey, x1, y1, life: 0.22, max: 0.22 });
    sound.laser();
    return true;
  }

  /** Hammerslag. Svinger alltid, men smeller bare hvis noe er naer nok. */
  smash() {
    const p = this.player, w = this.world, st = this.st;
    const cx = p.x + p.w / 2, cy = p.y + p.h * 0.55;
    const R = st.hammerRange + p.w * 0.5;
    let hit = false;
    for (const e of w.enemies) {
      const d = Math.hypot(e.x + e.w / 2 - cx, e.y + e.h / 2 - cy);
      if (d < R + e.w * 0.4) {
        this.hurtEnemy(e, st.hammerDmg, e.x + e.w / 2, e.y + e.h / 2);
        if (!e.boss) { e.vx += (e.x + e.w / 2 < cx ? -1 : 1) * 320; e.vy = -220; }
        hit = true;
      }
    }
    // Bommer du, er hammeren klar igjen nesten med en gang - bare et treff koster ventetid.
    p.smashCool = hit ? st.hammerEvery : 0.25;
    p.smashT = 0.28;
    // Smellet med stein og gnister vises bare naar hammeren treffer; en bom er bare et sveip.
    w.smashes.push({ x: cx + p.facing * R * 0.4, y: cy, r: R, life: 0.25, max: 0.25, niva: st.hammer, retning: p.facing, bom: !hit });
    if (hit) { this.shake(0.14, 6); sound.smash(); } else sound.swing();
  }

  /** Flammer ut av jetpakken. Den sitter der riggen sier ryggdelen er. */
  jetFlamme(p) {
    // blaa gnister naar jetpakken har sine egne (blaa) flammer, ellers oransje
    const blaa = sprites.harTilstand(ROBOT_RIG, 'rygg', this.run.up, 'flamme');
    const dys = sprites.dysePunkt(ROBOT_RIG, p.h);
    const x = p.x + p.w / 2 + dys.x * p.facing;
    const y = p.y + p.h + dys.y;
    for (let i = 0; i < 2; i++) {
      this.world.parts.push({
        x: x + rand(-4, 4), y, vx: rand(-40, 40) - p.vx * 0.2, vy: rand(160, 320),
        r: rand(4, 8), life: rand(0.16, 0.3), max: 0.3,
        color: blaa ? (chance(0.5) ? '#5ee6ff' : '#d8fbff') : (chance(0.5) ? '#ffb347' : '#ffe066'),
      });
    }
  }

  collide(e) {
    const w = this.world;
    e.onGround = false;
    if (e.y + e.h >= GROUND_Y) {
      e.y = GROUND_Y - e.h;
      if (e.vy > 0) e.vy = 0;
      e.onGround = true;
    }
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
    if (p.inv > 0 || p.dying > 0 || p.boostStar > 0) return;   // ⭐ usaarbar
    if (p.shieldUp) {
      p.shieldUp = false;
      p.shieldT = this.st.shieldCool;
      p.inv = 0.8;
      sound.hit();
      this.ring(p.x + p.w / 2, p.y + p.h / 2, 46, '#7fe8ff');
      return;
    }
    this.run.hp -= n;
    p.inv = 0.95;
    p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 280;
    p.vy = -330;
    this.shake(0.25, 9);
    sound.hurt();
    this.puff(p.x + p.w / 2, p.y + p.h / 2, 10, '#ff8a8a');
    this.world.texts.push({
      x: p.x + p.w / 2, y: p.y - 6, vy: -55, life: 0.7, max: 0.7,
      text: '-' + Math.round(n), color: '#ff8a8a', size: 22,
    });
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
    const edge = w.camX + this.viewW + 90;
    while (w.pending.length && w.pending[0].x < edge) {
      if (w.enemies.length >= MAX_ACTIVE) break;
      const s = w.pending.shift();
      this.spawnEnemy(s.key, s.x);
    }
  }

  spawnEnemy(key, x) {
    const d = ENEMIES[key];
    const w = this.world;
    const flying = d.ai === 'fly';
    const e = {
      key, def: d, boss: false,
      w: d.w, h: d.h,
      x: x - d.w / 2,
      y: flying ? GROUND_Y - 170 - rand(0, 110) : GROUND_Y - d.h,
      vx: 0, vy: 0, onGround: false, facing: -1,
      hp: Math.round(d.hp * w.sc.hp), maxHp: Math.round(d.hp * w.sc.hp),
      seed: rand(0, 10), hurtT: 0, timer: rand(0, 1.4), state: 0, walk: rand(0, 6),
    };
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
      x: w.len - 320 - d.w / 2,
      y: d.fly ? GROUND_Y - 300 : GROUND_Y - d.h,
      vx: 0, vy: 0, onGround: false, facing: -1,
      hp: d.hp, maxHp: d.hp,
      seed: rand(0, 10), hurtT: 0, timer: 1.4, state: 0, phase: 0, walk: 0,
    };
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
      e.facing = pcx < ecx ? -1 : 1;

      if (e.boss) this.bossAI(e, dt, e.facing, pcx, pcy);
      else this.mobAI(e, dt, e.facing, pcx, pcy);

      const flies = d.ai === 'fly' || (e.boss && d.fly);
      if (!flies) {
        e.vy += GRAV * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        this.collide(e);
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      e.x = clamp(e.x, (w.locked ? w.wallX : 0) + 2, w.len - e.w - 2);
      e.walk += dt * (flies ? 5 : 3 + Math.abs(e.vx) * 0.03);

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

      if (e.hp <= 0) this.killEnemy(e, i);
    }
  }

  /** Er monsteret paa skjermen? Kameraet er zoomet inn, saa det er ikke sikkert. */
  synlig(e) {
    const w = this.world;
    return e.x + e.w > w.camX + 10 && e.x < w.camX + this.viewW - 10 &&
      e.y + e.h > w.camY + 10 && e.y < w.camY + this.viewH - 10;
  }

  mobAI(e, dt, dir, pcx, pcy) {
    const d = e.def;
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dist = Math.abs(pcx - ecx);
    // Ingen skudd fra monstre du ikke ser: de venter litt etter at de kommer inn
    // paa skjermen, og de som vil holde avstand gaar inn til de synes foerst.
    const synlig = this.synlig(e);
    if (d.shotEvery && !synlig) e.timer = Math.max(e.timer, 0.5);

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
      const ty = Math.max(TAK + e.h / 2, pcy - 60 + Math.sin(this.t * 2.2 + e.seed) * 60);
      e.vx = dir * d.sp;
      e.vy = clamp((ty - ecy) * 2.4, -170, 170);
      // drager spytter ild
      if (d.shotEvery && e.timer <= 0 && dist < 520) {
        e.timer = d.shotEvery;
        this.enemyShot(ecx, ecy, pcx, pcy, d.shotSpeed, d.shotColor, d.skudd);
      }
    } else if (d.ai === 'shoot') {
      const want = 320;
      if (!synlig) e.vx = dir * d.sp;
      else e.vx = dist > want + 60 ? dir * d.sp : dist < want - 60 ? -dir * d.sp : e.vx * 0.9;
      if (e.timer <= 0 && dist < 620) {
        e.timer = d.shotEvery;
        this.enemyShot(ecx, ecy - e.h * 0.2, pcx, pcy, d.shotSpeed, d.shotColor, d.skudd);
      }
    } else if (d.ai === 'cast') {
      if (!synlig) e.vx = dir * d.sp;
      else e.vx = dist > 420 ? dir * d.sp : dist < 260 ? -dir * d.sp * 0.7 : 0;
      if (e.timer <= 0 && dist < 700) {
        e.timer = d.shotEvery;
        const b = this.enemyShot(ecx, ecy - e.h * 0.3, pcx, pcy, d.shotSpeed, d.shotColor, d.skudd);
        b.homing = 2.2;
        b.r = 13;
      }
    }
  }

  bossAI(e, dt, dir, pcx, pcy) {
    const d = e.def;
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
    const dist = Math.abs(pcx - ecx);
    const rage = e.hp / e.maxHp < 0.4 ? 0.78 : 1;

    switch (e.pattern) {
      case 'jump-spawn': {
        if (e.onGround) {
          e.vx *= 0.85;
          if (e.timer <= 0) {
            e.timer = 1.8 * rage;
            e.vy = -700;
            e.vx = dir * d.sp * 2.6;
            e.state++;
            if (e.state % 3 === 0) {
              for (let k = 0; k < 2; k++) this.spawnEnemy('smaadrage', ecx + rand(-90, 90));
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
            const b = this.enemyShot(ecx, ecy - e.h * 0.2, pcx, pcy, 280, '#8ef0c0', d.skudd);
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
          const ty = GROUND_Y - 320 + Math.sin(this.t * 1.6) * 50;
          e.vx = clamp((pcx - ecx) * 1.8, -d.sp, d.sp);
          e.vy = clamp((ty - ecy) * 2.2, -220, 220);
          if (e.timer <= 0) {
            e.timer = 2.4 * rage;
            if (chance(0.5)) { e.state = 1; e.vy = 660; }
            else this.enemyShot(ecx, ecy + e.h * 0.3, pcx, GROUND_Y, 320, '#ff9a3d', d.skudd);
          }
        } else {
          e.vx *= 0.96;
          if (e.y + e.h >= GROUND_Y) {
            e.y = GROUND_Y - e.h;
            e.state = 0;
            e.vy = -420;
            this.shake(0.3, 12);
            this.shock(ecx, e);
          }
        }
        break;
      }
      case 'slam': {
        e.vx = dist > 190 ? dir * d.sp : 0;
        if (e.onGround && e.timer <= 0) { e.timer = 3.6 * rage; e.vy = -520; e.state = 1; }
        if (e.state === 1 && e.onGround && e.vy === 0) {
          e.state = 0;
          this.shake(0.35, 14);
          this.shock(ecx, e);
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
              const b = this.enemyShot(ecx, ecy - 20 + k * 22, pcx, pcy, 180, '#bdf0ff', d.skudd);
              b.homing = 2.6; b.r = 14;
            }
            e.state = 1;
          } else {
            this.puff(ecx, ecy, 16, d.body);
            e.x = clamp(pcx + (chance(0.5) ? -380 : 380) - e.w / 2,
              this.world.wallX + 20, this.world.len - e.w - 20);
            e.y = GROUND_Y - e.h - 140;
            this.puff(e.x + e.w / 2, ecy, 16, d.body);
            e.state = 0;
            e.timer = 0.7;
          }
        }
        break;
      }
      case 'all-in': {
        e.vx = dist > 260 ? dir * d.sp : -dir * d.sp * 0.4;
        if (e.onGround && e.timer <= 0) {
          e.timer = 2.0 * rage;
          e.phase = (e.phase + 1) % 3;
          if (e.phase === 0) {
            for (let k = -3; k <= 3; k++) {
              const b = this.enemyShot(ecx, ecy, pcx, pcy, 320, '#ff6b6b', d.skudd);
              const a = Math.atan2(b.vy, b.vx) + k * 0.17;
              const sp = Math.hypot(b.vx, b.vy);
              b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
            }
          } else if (e.phase === 1) {
            e.vy = -560; e.state = 1;
          } else {
            this.spawnEnemy('flygedrage', ecx - 80);
            this.spawnEnemy('flygedrage', ecx + 80);
          }
        }
        if (e.state === 1 && e.onGround && e.vy === 0) {
          e.state = 0; this.shake(0.35, 14); this.shock(ecx, e); sound.boss();
        }
        break;
      }
    }
  }

  /**
   * Sjokkboelge langs bakken. Den blinker paa bakken en liten stund foer den
   * begynner aa rulle, slik at man rekker aa se den komme og hoppe over.
   */
  shock(x, e) {
    const d = (e && e.def) || {};
    const w = this.world;
    const sp = d.shockSpeed ?? 250;
    const dmg = d.shockDmg ?? 15;
    const warn = d.shockWarn ?? 0.35;
    const pcx = this.player.x + this.player.w / 2;
    const dirs = (d.shockCount ?? 2) === 1 ? [Math.sign(pcx - x) || 1] : [-1, 1];
    for (const s of dirs) {
      w.bullets.push({
        x: x + s * 40, y: GROUND_Y - 20, vx: s * sp, vy: 0, r: 19,
        friendly: false, life: 4, color: '#ff9a3d', dmg, warn, shock: true,
      });
    }
    this.ring(x, GROUND_Y - 10, 60, '#ff9a3d');
  }

  enemyShot(x, y, tx, ty, sp, color, dmg) {
    const a = Math.atan2(ty - y, tx - x);
    const b = {
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 10, friendly: false, life: 5, color, dmg: dmg || 12,
    };
    this.world.bullets.push(b);
    return b;
  }

  hurtEnemy(e, dmg, x, y) {
    e.hp -= dmg;
    e.hurtT = 0.16;
    this.puff(x, y, 4, '#ffe6a0');
    this.effekt('treff', x, y, 18, 0.18, { fra: 0.6, til: 1.1, rot: rand(0, TAU) });
    if (e.hp > 0) sound.hit();
  }

  killEnemy(e, idx) {
    const w = this.world;
    w.enemies.splice(idx, 1);
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    sound.kill();
    this.puff(cx, cy, e.boss ? 40 : 12, e.def.body);
    this.ring(cx, cy, e.boss ? 160 : 46, e.def.body);
    this.effekt('poff', cx, cy, Math.max(e.w, e.h) * (e.boss ? 0.6 : 0.75), 0.45,
      { fra: 0.7, til: 1.35, speil: chance(0.5) });

    let n = e.boss ? e.def.coins : randInt(e.def.coins[0], e.def.coins[1]);
    if (!e.boss) n = Math.max(1, Math.round(n * w.sc.coin));
    for (let k = 0; k < n; k++) {
      const c = this.mkCoin(cx + rand(-14, 14), cy, 1);
      c.vx = rand(-180, 180);
      c.vy = rand(-380, -160);
      w.coins.push(c);
    }
    if (!e.boss && chance(0.12) && this.run.hp < this.st.maxHp) {
      const h = this.mkPickup(cx, cy, 'heal', false);
      h.vx = rand(-60, 60); h.vy = -260;
      w.pickups.push(h);
    } else if (e.boss) {
      for (const s of [-1, 1]) {
        const h = this.mkPickup(cx, cy, 'heal', false);
        h.vx = s * 40; h.vy = -280; h.life = 99;
        w.pickups.push(h);
      }
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

  updateBullets(dt) {
    const w = this.world;
    const p = this.player;
    for (let i = w.bullets.length - 1; i >= 0; i--) {
      const b = w.bullets[i];
      if (b.warn > 0) { b.warn -= dt; continue; }   // blinker paa bakken, gjoer ingenting enda
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
      let gone = b.life <= 0 || b.x < w.camX - 120 || b.x > w.camX + this.viewW + 120 || b.y > VIEW_H + 60 || b.y < TAK - 120;

      if (!gone && b.friendly) {
        for (const e of w.enemies) {
          if (overlap(box, e)) { this.hurtEnemy(e, b.dmg, b.x, b.y); gone = true; break; }
        }
      } else if (!gone) {
        if (p.dying <= 0 && overlap(box, p)) { this.damagePlayer(b.dmg || 12, b.x); gone = true; }
      }
      if (gone) w.bullets.splice(i, 1);
    }
  }

  updateCoins(dt) {
    const w = this.world;
    const p = this.player;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
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
          c.y = GROUND_Y - c.r; c.vy = 0; c.vx = 0; c.rest = true;
        }
      }
      if (dist < 34 + p.w * 0.2) {
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
      if (!h.anchored) {
        h.life -= dt;
        h.vy += GRAV * 0.5 * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.y > GROUND_Y - h.r) { h.y = GROUND_Y - h.r; h.vy = 0; h.vx *= 0.6; }
      }
      const box = { x: h.x - h.r, y: h.y - h.r, w: h.r * 2, h: h.r * 2 };
      if (overlap(box, p)) {
        this.grabPickup(h);
        w.pickups.splice(i, 1);
      } else if (h.life <= 0) {
        w.pickups.splice(i, 1);
      }
    }
  }

  grabPickup(h) {
    const p = this.player;
    const w = this.world;
    const def = POWERUPS[h.kind] || POWERUPS.heal;
    const say = (text, color) => w.texts.push({
      x: h.x, y: h.y - 10, vy: -62, life: 0.9, max: 0.9, text, color, size: 24,
    });

    if (h.kind === 'rate') {
      p.boostRate = def.time;
      sound.buy();
      say('⚡ x2', def.color);
    } else if (h.kind === 'star') {
      p.boostStar = def.time;
      sound.buy();
      say('⭐', def.color);
    } else {
      const heal = Math.round(this.st.maxHp * 0.3);
      const got = Math.min(heal, this.st.maxHp - this.run.hp);
      this.run.hp = Math.min(this.st.maxHp, this.run.hp + heal);
      sound.heart();
      say('+' + got, '#ff9aa6');
    }
    this.ring(h.x, h.y, 44, def.color);
    this.puff(h.x, h.y, 8, def.color);
  }

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

  /**
   * Effekt med eget bilde (art/effekter/<navn>.png). Uten bildet skjer ingenting -
   * da er det de vanlige prikkene og ringene som synes.
   */
  effekt(navn, x, y, r, life, o = {}) {
    if (!art.effektBilde(navn)) return;
    this.world.parts.push({
      kind: 'bilde', navn, x, y, vx: 0, vy: 0, r, life, max: life,
      fra: o.fra ?? 1, til: o.til ?? 1, rot: o.rot || 0, speil: !!o.speil, bunn: !!o.bunn,
    });
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
      if (p.kind !== 'ring' && p.kind !== 'bilde') {
        p.vy += GRAV * 0.4 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (p.life <= 0) w.parts.splice(i, 1);
    }
    for (const arr of [w.texts, w.lasers, w.smashes]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        arr[i].life -= dt;
        if (arr[i].vy) arr[i].y += arr[i].vy * dt;
        if (arr[i].life <= 0) arr.splice(i, 1);
      }
    }
  }

  updateCamera(dt) {
    const w = this.world;
    const p = this.player;
    const sjef = w.locked && w.boss;

    // Zoom: tett paa i banen. I sjefkampen zoomer den ut akkurat nok til at
    // baade sjefen og roboten er med.
    let zoomMaal = ZOOM;
    if (sjef) {
      const b = w.boss;
      const hoyde = GROUND_Y + BAKKEKANT - (Math.min(b.y, p.y) - 40);
      const bredde = Math.abs((b.x + b.w / 2) - (p.x + p.w / 2)) + b.w / 2 + p.w / 2 + 160;
      zoomMaal = clamp(Math.min(this.H / hoyde, this.W / bredde), ZOOM_SJEF, ZOOM);
    }
    this.zoom += (zoomMaal - this.zoom) * Math.min(1, dt * 2.5);
    const viewW = this.viewW, viewH = this.viewH;

    // sideveis: roboten godt til venstre, saa man ser det som kommer.
    // I sjefkampen: midt mellom roboten og sjefen - men aldri saa roboten faller ut.
    let tx = p.x + p.w / 2 - viewW * (w.locked ? 0.5 : 0.3);
    if (sjef) {
      tx = ((w.boss.x + w.boss.w / 2) + (p.x + p.w / 2)) / 2 - viewW / 2;
      tx = clamp(tx, p.x + p.w + 40 - viewW, p.x - 40);
    }
    const minX = w.locked ? w.wallX : 0;
    tx = clamp(tx, minX, Math.max(minX, w.len - viewW));
    w.camX += (tx - w.camX) * Math.min(1, dt * 7);

    // i hoeyden: bakken nederst, men kameraet foelger med naar roboten klatrer
    // eller flyr hoeyt (og ser litt foran seg naar den faller ned igjen).
    // I sjefkampen er bakken alltid med, saa man ser sjokkboelgene komme.
    const hvile = this.camYHvile();
    let ty = Math.min(hvile, p.y + Math.max(0, p.vy) * 0.12 - viewH * 0.28);
    if (sjef) ty = Math.max(Math.min(w.boss.y, p.y) - 40, GROUND_Y + 25 - viewH);
    ty = clamp(ty, TAK - 40, hvile);
    w.camY += (ty - w.camY) * Math.min(1, dt * 5);
  }

  /** Naar spillet stopper (pause, seier, tap): ingen flamme eller risting som henger igjen. */
  stopp() {
    this.shakeT = 0;
    if (this.player) this.player.jetting = false;
  }

  // ---------------------------------------------------------------
  //  TEGNING
  // ---------------------------------------------------------------
  draw() {
    const ctx = this.ctx;
    const w = this.world;
    const W = this.W, H = this.H;
    if (!w) { ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, W, H); return; }
    const th = w.th;
    const z = this.zoom;
    // Himmel og bakgrunnslag tegnes i skjermkoordinater, alt annet i banen.
    art.drawBackground(ctx, th, w.camX, w.camY, z, W, H, this.t, GROUND_Y);

    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      sx = rand(-1, 1) * this.shakeAmt * this.shakeT * 3;
      sy = rand(-1, 1) * this.shakeAmt * this.shakeT * 3;
    }

    ctx.save();
    ctx.scale(z, z);
    ctx.translate(-w.camX + sx, -w.camY + sy);
    art.drawGround(ctx, th, w.camX, w.camY, this.viewW, this.viewH, GROUND_Y);

    const venstre = w.camX, hoyre = w.camX + this.viewW;
    for (const p of w.platforms) {
      if (p.x + p.w < venstre - 60 || p.x > hoyre + 60) continue;
      art.drawPlatform(ctx, p, th);
    }
    art.drawGate(ctx, (w.locked ? w.wallX : w.bossAt) + 26, GROUND_Y, th, this.t, w.gateOpen);

    for (const c of w.coins) {
      if (c.x < venstre - 40 || c.x > hoyre + 40) continue;
      art.drawCoin(ctx, c, this.t);
    }
    for (const h of w.pickups) art.drawPowerup(ctx, h, this.t);

    for (const e of w.enemies) {
      if (e.x + e.w < venstre - 160 || e.x > hoyre + 160) continue;
      this.drawEnemy(ctx, e);
    }

    for (const b of w.bullets) art.drawBullet(ctx, b);
    for (const s of w.smashes) art.drawSmash(ctx, s);

    this.drawPlayer(ctx);

    for (const l of w.lasers) art.drawLaser(ctx, l);
    for (const pt of w.parts) art.drawParticle(ctx, pt);
    for (const ft of w.texts) art.drawFloatText(ctx, ft);

    ctx.restore();
  }

  /** Proever egne PNG-figurer foerst, faller tilbake paa innebygd tegning. */
  drawEnemy(ctx, e) {
    if (e.hurtT > 0) {
      art.drawHitHalo(ctx, e.x + e.w / 2, e.y + e.h / 2,
        Math.max(e.w, e.h) * 0.85, Math.min(1, e.hurtT / 0.16));
    }
    const rig = rigFor(e.key);
    const ok = rig && sprites.drawRig(ctx, rig, {
      x: e.x + e.w / 2, y: e.y + e.h, h: e.h,
      facing: e.facing, walk: e.walk || 0,
      move: Math.abs(e.vx) > 12 ? 1 : 0.25,
      t: this.t, seed: e.seed,
      flash: e.hurtT > 0 && Math.floor(e.hurtT * 30) % 2 === 0,
    });
    if (!ok) art.drawCreature(ctx, e, this.t);
  }

  drawPlayer(ctx) {
    const p = this.player;
    // ⭐ usaarbar: gyllen glorie rundt roboten
    if (p.boostStar > 0) {
      const fade = Math.min(1, p.boostStar / 1.2);
      ctx.save();
      ctx.globalAlpha = (0.3 + 0.16 * Math.sin(this.t * 11)) * fade;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h * 0.5, p.h * 0.78, 0, TAU);
      ctx.fillStyle = '#ffe066';
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#fff3b0';
      ctx.stroke();
      ctx.restore();
    }
    // Har jetpakken sitt eget bilde med flammer, tegnes det av riggen (se tilstand under).
    if (p.jetting && p.dying <= 0 && !sprites.harTilstand(ROBOT_RIG, 'rygg', this.run.up, 'flamme')) {
      const dys = sprites.dysePunkt(ROBOT_RIG, p.h);
      art.drawJetFlame(ctx, p.x + p.w / 2 + dys.x * p.facing, p.y + p.h + dys.y, p.h * 0.24, this.t);
    }
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;
    ctx.save();
    if (p.dying > 0) {
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate((1.3 - p.dying) * 3);
      ctx.translate(-(p.x + p.w / 2), -(p.y + p.h / 2));
    }
    // Siktevinkelen regnes om til robotens egen retning, slik at armen peker
    // rett vei ogsaa naar hele figuren er speilvendt.
    let a = p.aim || 0;
    if (p.facing < 0) a = Math.PI - a;
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    const localAim = clamp(a, -1.25, 1.25);

    const s = {
      x: p.x + p.w / 2, y: p.y + p.h, h: p.h,
      facing: p.facing, walk: p.walk,
      move: Math.abs(p.vx) > 30 ? 1 : 0,
      t: this.t,
      aim: localAim, recoil: p.flashShot, smash: p.smashT / 0.28,
      flash: p.inv > 0.9,
      variants: this.run.up,
      tilstand: p.jetting && p.dying <= 0 ? { rygg: 'flamme' } : null,
    };
    if (!sprites.drawRig(ctx, ROBOT_RIG, s)) {
      art.drawRobot(ctx, s.x, s.y, p.h, {
        up: this.run.up, facing: p.facing, walk: p.walk,
        moving: s.move > 0, onGround: p.onGround, t: this.t,
        aim: localAim, flashShot: p.flashShot, smash: s.smash,
        shieldOn: p.shieldUp, flash: p.inv > 0.9,
      });
    } else if (p.shieldUp) {
      ctx.save();
      ctx.globalAlpha = 0.26 + 0.1 * Math.sin(this.t * 8);
      ctx.beginPath();
      ctx.arc(s.x, s.y - p.h * 0.5, p.h * 0.62, 0, TAU);
      ctx.fillStyle = '#7fe8ff'; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  hudState() {
    const w = this.world;
    const p = this.player;
    const boosts = [];
    if (p && p.boostRate > 0) {
      boosts.push({ key: 'rate', ico: POWERUPS.rate.ico, left: p.boostRate, frac: p.boostRate / POWERUPS.rate.time });
    }
    if (p && p.boostStar > 0) {
      boosts.push({ key: 'star', ico: POWERUPS.star.ico, left: p.boostStar, frac: p.boostStar / POWERUPS.star.time });
    }
    const st = this.st;
    return {
      boosts,
      // knappene for jetpakke og hammer vises bare naar de er kjoept
      jet: !!(st && st.jet > 0),
      fuel: p ? p.fuel : 1,
      jetting: !!(p && p.jetting),
      jetTom: !!(p && p.tom),
      hammer: !!(st && st.hammer > 0),
      hammerKlar: p && st && st.hammer > 0 ? 1 - clamp(p.smashCool / st.hammerEvery, 0, 1) : 1,
      hp: this.run ? this.run.hp : 0,
      maxHp: this.st ? this.st.maxHp : 100,
      coins: this.run ? this.run.coins : 0,
      shield: this.player ? this.player.shieldUp : false,
      progress: w ? clamp((this.player.x - 100) / Math.max(1, w.bossAt - 100), 0, 1) : 0,
      boss: w && w.boss ? w.boss.hp / w.boss.maxHp : null,
      bossFace: w && w.boss ? w.boss.def.face : '',
    };
  }
}

/** Treffer linja fra (x0,y0) til (x1,y1) boksen e? Vi sjekker noen punkter. */
function segHitsBox(x0, y0, x1, y1, e) {
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h) return true;
  }
  return false;
}

export { GROUND_Y };
