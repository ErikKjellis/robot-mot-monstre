// fiks-figurer.js - rydder opp i egne PNG-figurer.
//
//   node verktoy/fiks-figurer.js art/robot
//   node verktoy/fiks-figurer.js art            (hele mappa)
//
// Gjoer tre ting med hver PNG:
//   1. Fjerner den lyse bakgrunnen (ogsaa "rutemoensteret" som mange
//      tegneprogram brenner inn i bildet) og lager ekte gjennomsiktighet.
//   2. Beskjaerer bort tom plass rundt figuren.
//   3. Krymper til maks 512 piksler - figurene vises uansett bare
//      50-250 piksler store i spillet, og da blir fila mye mindre.
//
// Originalene kopieres til art/original/ foerst, saa ingenting gaar tapt.
// Kjoer den paa nytt saa mange ganger du vil - den hopper over filer som
// allerede er ryddet.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAX_SIZE = 512;
const ROOT = process.cwd();

// ------------------------------------------------------------------
//  PNG inn
// ------------------------------------------------------------------
function decode(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString() !== 'PNG') throw new Error('ikke en PNG');
  let p = 8, w = 0, h = 0, ct = 0, bd = 0, interlace = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.slice(p + 4, p + 8).toString();
    const data = b.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bd = data[8]; ct = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bd !== 8) throw new Error('stoetter bare 8 bit per kanal (denne har ' + bd + ')');
  if (interlace) throw new Error('interlaced PNG stoettes ikke - lagre uten "interlace"');
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 4 ? 2 : ct === 0 ? 1 : 0;
  if (!ch) throw new Error('palett-PNG stoettes ikke - lagre som vanlig RGB/RGBA');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    for (let i = 0; i < stride; i++) {
      const x = raw[pos + i];
      const a = i >= ch ? out[y * stride + i - ch] : 0;
      const bb = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = (i >= ch && y > 0) ? out[(y - 1) * stride + i - ch] : 0;
      let v = x;
      if (f === 1) v += a;
      else if (f === 2) v += bb;
      else if (f === 3) v += (a + bb) >> 1;
      else if (f === 4) {
        const pa = Math.abs(bb - c), pb = Math.abs(a - c), pc = Math.abs(a + bb - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? bb : c);
      }
      out[y * stride + i] = v & 255;
    }
    pos += stride;
  }

  // alt om til RGBA
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    const s = i * ch, d = i * 4;
    if (ch >= 3) {
      rgba[d] = out[s]; rgba[d + 1] = out[s + 1]; rgba[d + 2] = out[s + 2];
      rgba[d + 3] = ch === 4 ? out[s + 3] : 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s];
      rgba[d + 3] = ch === 2 ? out[s + 1] : 255;
    }
  }
  return { w, h, px: rgba };
}

// ------------------------------------------------------------------
//  PNG ut
// ------------------------------------------------------------------
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, c]);
}
function encode(im) {
  const stride = im.w * 4;
  const raw = Buffer.alloc((stride + 1) * im.h);
  for (let y = 0; y < im.h; y++) {
    raw[y * (stride + 1)] = 0;
    im.px.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(im.w, 0); ihdr.writeUInt32BE(im.h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------
//  1. Fjern lys bakgrunn
// ------------------------------------------------------------------
/** Lys og nesten graa = bakgrunn. Daekker baade hvitt og rutemoenster. */
function bgLike(px, i) {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  if (px[i + 3] < 8) return true;                 // allerede gjennomsiktig
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return (r + g + b) / 3 > 205 && mx - mn < 26;
}

function stripBackground(im) {
  const { w, h, px } = im;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (bg[k]) return;
    if (!bgLike(px, k * 4)) return;
    bg[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const k = stack.pop();
    const x = k % w, y = (k / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // Tell BARE piksler som faktisk var synlige foer. Ellers ville et bilde
  // som allerede er ryddet se ut som om vi fjernet halve bakgrunnen paa nytt,
  // og da ville det blitt beskaaret og mykt i kantene om og om igjen.
  let removed = 0;
  for (let k = 0; k < w * h; k++) {
    if (!bg[k]) continue;
    if (px[k * 4 + 3] > 8) removed++;
    px[k * 4 + 3] = 0;
  }
  const andel = removed / (w * h);
  if (andel < 0.005) return andel;   // alt var gjennomsiktig fra foer

  // Mykne kanten: piksler som ligger inntil bakgrunnen og er lyse er
  // halvveis bakgrunn (kantutjevning fra tegneprogrammet).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (bg[k]) continue;
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (bg[ny * w + nx]) { touches = true; break; }
        }
      }
      if (!touches) continue;
      const i = k * 4;
      const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (lum <= 175) continue;
      const t = Math.min(1, (lum - 175) / 70);
      px[i + 3] = Math.round(px[i + 3] * (1 - t));
    }
  }
  return andel;
}

// ------------------------------------------------------------------
//  1b. Fjern loesrevne flekker
// ------------------------------------------------------------------
/**
 * Beholder bare de store sammenhengende bitene. Smaa prikker som blir
 * igjen etter bakgrunnsfjerning ville ellers gjoere at delen ikke kan
 * beskjaeres ordentlig - og da blir figuren bitte liten i spillet.
 */
function despeckle(im) {
  const { w, h, px } = im;
  const lab = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const q = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (lab[start] !== -1 || px[start * 4 + 3] <= 40) continue;
    const id = sizes.length;
    let head = 0, tail = 0, n = 0;
    q[tail++] = start; lab[start] = id;
    while (head < tail) {
      const k = q[head++]; n++;
      const x = k % w, y = (k / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ny * w + nx;
        if (lab[nk] !== -1 || px[nk * 4 + 3] <= 40) continue;
        lab[nk] = id; q[tail++] = nk;
      }
    }
    sizes.push(n);
  }
  if (!sizes.length) return 0;
  const biggest = Math.max(...sizes);
  const min = biggest * 0.04;
  let killed = 0;
  for (let k = 0; k < w * h; k++) {
    const id = lab[k];
    if (id >= 0 && sizes[id] < min) { px[k * 4 + 3] = 0; killed++; }
    else if (id < 0 && px[k * 4 + 3] > 0 && px[k * 4 + 3] <= 40) px[k * 4 + 3] = 0;
  }
  return killed;
}

// ------------------------------------------------------------------
//  2. Beskjaer  3. Krymp
// ------------------------------------------------------------------
function crop(im, margin = 0.02) {
  const { w, h, px } = im;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 10) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return im;                       // helt tomt - la vaere
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * margin);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    px.copy(out, y * nw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x0) * 4 + nw * 4);
  }
  return { w: nw, h: nh, px: out };
}

function shrink(im, max) {
  const scale = Math.min(1, max / Math.max(im.w, im.h));
  if (scale >= 1) return im;
  const nw = Math.max(1, Math.round(im.w * scale));
  const nh = Math.max(1, Math.round(im.h * scale));
  const out = Buffer.alloc(nw * nh * 4);
  const fx = im.w / nw, fy = im.h / nh;
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor(y * fy), sy1 = Math.min(im.h, Math.ceil((y + 1) * fy));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor(x * fx), sx1 = Math.min(im.w, Math.ceil((x + 1) * fx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * im.w + sx) * 4;
          const al = im.px[i + 3] / 255;
          r += im.px[i] * al; g += im.px[i + 1] * al; b += im.px[i + 2] * al;
          a += al; n++;
        }
      }
      const d = (y * nw + x) * 4;
      if (a > 0.0001) {
        out[d] = Math.round(r / a); out[d + 1] = Math.round(g / a); out[d + 2] = Math.round(b / a);
      }
      out[d + 3] = Math.round((a / n) * 255);
    }
  }
  return { w: nw, h: nh, px: out };
}

// ------------------------------------------------------------------
//  Rydd en enkelt fil. Returnerer null hvis den alt var i orden.
// ------------------------------------------------------------------
function ryddFil(f, force) {
  // Finn art-mappa ut fra selve fila, ikke ut fra hvor kommandoen ble kjoert.
  // Ellers havner sikkerhetskopiene feil naar serveren startes fra en annen mappe.
  let artRot = path.dirname(path.resolve(f));
  while (path.basename(artRot) !== 'art' && path.dirname(artRot) !== artRot) {
    artRot = path.dirname(artRot);
  }
  if (path.basename(artRot) !== 'art') artRot = path.dirname(path.resolve(f));
  const rel = path.relative(artRot, path.resolve(f)).replace(/\\/g, '/');
  const backup = path.join(artRot, 'original', rel);
  const before = fs.statSync(f).size;
  let im = decode(f);
  const removed = stripBackground(im);
  const flekker = despeckle(im);
  if (!force && removed < 0.02 && !flekker && Math.max(im.w, im.h) <= MAX_SIZE) return null;
  im = crop(im);
  im = shrink(im, MAX_SIZE);
  const out = encode(im);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  if (!fs.existsSync(backup)) fs.copyFileSync(f, backup);
  fs.writeFileSync(f, out);
  return { rel, before, after: out.length, w: im.w, h: im.h, removed };
}

function finnPngFiler(dir) {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'original') walk(p); }
      else if (e.name.toLowerCase().endsWith('.png')) files.push(p);
    }
  })(dir);
  return files;
}

/** Rydder en hel mappe. Returnerer liste over det som faktisk ble endret. */
function ryddMappe(dir, opt = {}) {
  const ut = [];
  for (const f of finnPngFiler(dir)) {
    try {
      const r = ryddFil(f, opt.force);
      if (r) ut.push(r);
    } catch (e) {
      ut.push({ rel: path.relative('art', f).replace(/\\/g, '/'), feil: e.message });
    }
  }
  return ut;
}

module.exports = { ryddFil, ryddMappe, finnPngFiler };

// ------------------------------------------------------------------
//  Kommandolinje
// ------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const force = process.argv.includes('--paa-nytt');
  const target = args[0] || 'art';
  let totalBefore = 0, totalAfter = 0, done = 0;
  for (const f of finnPngFiler(target)) {
    const rel = path.relative('art', f).replace(/\\/g, '/');
    try {
      const r = ryddFil(f, force);
      if (!r) { console.log('  hopper over (allerede ryddet): ' + rel); continue; }
      totalBefore += r.before; totalAfter += r.after; done++;
      console.log('  ' + r.rel.padEnd(34) +
        (Math.round(r.before / 1024) + ' kB').padStart(9) + '  ->  ' +
        (r.w + 'x' + r.h).padStart(9) + '  ' + (Math.round(r.after / 1024) + ' kB').padStart(8) +
        '   (' + Math.round(r.removed * 100) + '% bakgrunn fjernet)');
    } catch (e) {
      console.log('  HOPPET OVER ' + rel + ': ' + e.message);
    }
  }
  console.log('\n' + done + ' filer ryddet.  ' +
    (totalBefore / 1048576).toFixed(1) + ' MB -> ' + (totalAfter / 1048576).toFixed(2) + ' MB');
  console.log('Originalene ligger i art/original/');
}
