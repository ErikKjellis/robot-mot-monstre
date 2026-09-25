// sjekk-del.js - sjekker bilder av EN kroppsdel fra bilde-AI-en.
//
//   node verktoy/sjekk-del.js ark/roddrage/kropp.png        en fil
//   node verktoy/sjekk-del.js ark/roddrage                  hele mappa, og om delene passer sammen
//
// Ser etter det som pleier aa gaa galt: bakgrunn som ikke blir fjernet, deler
// som er kuttet av bildekanten, flere biter i ett bilde, bleke kanter uten
// strek (der spiser bakgrunnsfjerningen seg inn), hale som peker feil vei, og
// deler som ikke har samme farger og omriss som resten av figuren.
//
// Kjernen er ren JavaScript, saa den kan ogsaa kjoeres i en nettleser.
//
// Svar per bilde:  ok  |  se over  |  forkast   (med grunner)
// Sluttkode: 0 alt ok, 1 noe aa se over, 2 noe maa lages paa nytt.

var SjekkDel = (function () {
  'use strict';

  // Samme regel som verktoy/fiks-figurer.js: lys og nesten graa = bakgrunn.
  function bgLike(px, i) {
    if (px[i + 3] < 8) return true;
    var r = px[i], g = px[i + 1], b = px[i + 2];
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return (r + g + b) / 3 > 205 && mx - mn < 26;
  }

  function lys(px, i) { return (px[i] + px[i + 1] + px[i + 2]) / 3; }

  function hue(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return -1;
    var h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return ((h * 60) + 360) % 360;
  }

  /** Bakgrunnen slik spillet fjerner den: flyt innover fra kanten. 1 = bakgrunn. */
  function fjernBakgrunn(px, w, h) {
    var bg = new Uint8Array(w * h), stakk = [], x, y, k;
    function dytt(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      var k = y * w + x;
      if (bg[k] || !bgLike(px, k * 4)) return;
      bg[k] = 1; stakk.push(k);
    }
    for (x = 0; x < w; x++) { dytt(x, 0); dytt(x, h - 1); }
    for (y = 0; y < h; y++) { dytt(0, y); dytt(w - 1, y); }
    while (stakk.length) {
      k = stakk.pop(); x = k % w; y = (k / w) | 0;
      dytt(x + 1, y); dytt(x - 1, y); dytt(x, y + 1); dytt(x, y - 1);
    }
    return bg;
  }

  /**
   * px: RGBA (Buffer, Uint8Array eller Uint8ClampedArray), w x h.
   * del: delnavnet (kropp, hode, hale, arm-fram ...) - brukes til retningssjekk.
   */
  function sjekkPiksler(px, w, h, del) {
    var N = w * h, x, y, k, i;

    // -- 1. Kanten av bildet: er bakgrunnen ren hvit? --------------------
    var band = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    var kantN = 0, kantHvit = 0, kantGraa = 0;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (x >= band && y >= band && x < w - band && y < h - band) continue;
        i = (y * w + x) * 4; kantN++;
        var mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
        if (px[i + 3] < 8 || (lys(px, i) >= 240 && mx - mn < 20)) kantHvit++;
        else if (lys(px, i) >= 150 && mx - mn < 26) kantGraa++;
      }
    }

    // -- 2. Fjern bakgrunnen slik spillet gjoer ---------------------------
    var bg = fjernBakgrunn(px, w, h);
    var kantFjernet = 0;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        if (x >= band && y >= band && x < w - band && y < h - band) continue;
        if (bg[y * w + x]) kantFjernet++;
      }
    }

    // -- 3. Sammenhengende biter av det som er igjen --------------------
    var lab = new Int32Array(N).fill(-1), ko = new Int32Array(N), biter = [];
    for (var start = 0; start < N; start++) {
      if (lab[start] !== -1 || bg[start] || px[start * 4 + 3] <= 40) continue;
      var id = biter.length, hode = 0, hale = 0;
      var b = { id: id, n: 0, x0: w, y0: h, x1: -1, y1: -1 };
      ko[hale++] = start; lab[start] = id;
      while (hode < hale) {
        k = ko[hode++]; x = k % w; y = (k / w) | 0; b.n++;
        if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
        var nb = [k + 1, k - 1, k + w, k - w];
        for (var j = 0; j < 4; j++) {
          var nk = nb[j];
          if (j === 0 && x === w - 1) continue;
          if (j === 1 && x === 0) continue;
          if (nk < 0 || nk >= N) continue;
          if (lab[nk] !== -1 || bg[nk] || px[nk * 4 + 3] <= 40) continue;
          lab[nk] = id; ko[hale++] = nk;
        }
      }
      biter.push(b);
    }
    var totalt = 0;
    for (j = 0; j < biter.length; j++) totalt += biter[j].n;
    biter.sort(function (a, b) { return b.n - a.n; });
    var rapport = { del: del || '', w: w, h: h, dom: 'ok', grunner: [], maal: {} };
    var M = rapport.maal;
    M.kantHvit = +(kantHvit / kantN).toFixed(3);
    M.kantGraa = +(kantGraa / kantN).toFixed(3);
    M.kantFjernet = +(kantFjernet / kantN).toFixed(3);
    if (!biter.length) {
      rapport.dom = 'forkast';
      rapport.grunner.push('bildet er tomt etter at bakgrunnen er fjernet');
      return rapport;
    }
    var hoved = biter[0];
    var store = biter.filter(function (b) { return b.n >= totalt * 0.01; });
    var smaa = biter.filter(function (b) { return b.n < totalt * 0.01 && b.n >= 20; });
    M.biter = store.length;
    M.smaabiter = smaa.length;
    M.nestStoerst = store.length > 1 ? +(store[1].n / hoved.n).toFixed(3) : 0;

    // -- 4. Plassering i bildet ------------------------------------------
    var bw = hoved.x1 - hoved.x0 + 1, bh = hoved.y1 - hoved.y0 + 1;
    M.boks = [hoved.x0, hoved.y0, bw, bh];
    M.dekning = +Math.max(bw / w, bh / h).toFixed(3);
    M.berorerKant = hoved.x0 <= 2 || hoved.y0 <= 2 || hoved.x1 >= w - 3 || hoved.y1 >= h - 3;

    // -- 5. Omriss: har kanten av delen moerk strek i naerheten? ---------
    // Bare BLEKE kantpiksler uten strek er farlige: bakgrunnsfyllet spiser
    // lyst og graatt, saa en mettet oransje kant stopper det like godt.
    var R = Math.max(3, Math.round(Math.min(w, h) * 0.004));
    var kant = 0, aapen = 0, utenStrek = 0, lyseInni = 0, delN = 0;
    var sumR = 0, sumG = 0, sumB = 0, omR = 0, omG = 0, omB = 0, omN = 0;
    var hist = new Float64Array(12), histSum = 0;
    var tykk = new Float64Array(bw);
    // summert tabell over moerke piksler rundt delen, saa hvert oppslag er raskt
    var ox0 = Math.max(0, hoved.x0 - R), oy0 = Math.max(0, hoved.y0 - R);
    var ox1 = Math.min(w - 1, hoved.x1 + R), oy1 = Math.min(h - 1, hoved.y1 + R);
    var tw = ox1 - ox0 + 2, th = oy1 - oy0 + 2;
    var sum = new Int32Array(tw * th);
    for (y = oy0; y <= oy1; y++) {
      var rad = 0;
      for (x = ox0; x <= ox1; x++) {
        k = y * w + x; i = k * 4;
        if (!bg[k] && px[i + 3] > 128 && lys(px, i) < 80) rad++;
        sum[(y - oy0 + 1) * tw + (x - ox0 + 1)] = sum[(y - oy0) * tw + (x - ox0 + 1)] + rad;
      }
    }
    function moerkRundt(xx, yy) {
      var a0 = Math.max(ox0, xx - R) - ox0, b0 = Math.max(oy0, yy - R) - oy0;
      var a1 = Math.min(ox1, xx + R) - ox0 + 1, b1 = Math.min(oy1, yy + R) - oy0 + 1;
      return sum[b1 * tw + a1] - sum[b0 * tw + a1] - sum[b1 * tw + a0] + sum[b0 * tw + a0] > 0;
    }
    for (y = hoved.y0; y <= hoved.y1; y++) {
      for (x = hoved.x0; x <= hoved.x1; x++) {
        k = y * w + x;
        if (lab[k] !== hoved.id) continue;
        i = k * 4; delN++;
        tykk[x - hoved.x0]++;
        var r = px[i], g = px[i + 1], bl = px[i + 2], l = lys(px, i);
        sumR += r; sumG += g; sumB += bl;
        var mx2 = Math.max(r, g, bl), mn2 = Math.min(r, g, bl);
        if (l > 235 && mx2 - mn2 < 20) lyseInni++;
        var hu = hue(r, g, bl);
        if (hu >= 0) { var vekt = (mx2 - mn2) / 255; hist[Math.floor(hu / 30) % 12] += vekt; histSum += vekt; }
        var erKant = x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          bg[k - 1] || bg[k + 1] || bg[k - w] || bg[k + w];
        if (!erKant) continue;
        kant++;
        // Omrissets farge maales bare ytterst paa kanten - ellers teller moerk skygge inni med.
        if (l < 110) { omR += r; omG += g; omB += bl; omN++; }
        if (moerkRundt(x, y)) continue;
        utenStrek++;
        if (l > 170 && mx2 - mn2 < 40) aapen++;
      }
    }
    M.aapenKant = +(aapen / Math.max(1, kant)).toFixed(3);
    M.kantUtenStrek = +(utenStrek / Math.max(1, kant)).toFixed(3);
    M.lyseInni = +(lyseInni / Math.max(1, delN)).toFixed(3);
    M.snittFarge = [Math.round(sumR / delN), Math.round(sumG / delN), Math.round(sumB / delN)];
    M.omrissFarge = omN ? [Math.round(omR / omN), Math.round(omG / omN), Math.round(omB / omN)] : null;
    M.fargeprofil = Array.prototype.map.call(hist, function (v) { return +(v / Math.max(1e-9, histSum)).toFixed(3); });

    // -- 6. Hvilken ende er tykkest? (halen skal vaere tykk til hoeyre) ---
    var ende = Math.max(1, Math.floor(bw * 0.3)), kutt = Math.floor(bw * 0.03);
    var v = 0, hs = 0;
    for (x = kutt; x < ende; x++) v += tykk[x];
    for (x = bw - ende; x < bw - kutt; x++) hs += tykk[x];
    v /= Math.max(1, ende - kutt); hs /= Math.max(1, ende - kutt);
    M.tykkVenstre = Math.round(v); M.tykkHoyre = Math.round(hs);
    M.tykkEnde = hs > v * 1.25 ? 'hoyre' : v > hs * 1.25 ? 'venstre' : 'uklar';

    // -- Dom --------------------------------------------------------------
    function forkast(t) { rapport.dom = 'forkast'; rapport.grunner.push(t); }
    function seOver(t) { if (rapport.dom === 'ok') rapport.dom = 'se over'; rapport.grunner.push(t); }

    // Blir ikke bakgrunnen fjernet, blir hele bildet "delen" - da er alt det
    // andre bare foelgefeil, og vi sier bare det som faktisk er galt.
    if (M.kantFjernet < 0.6 || (M.kantFjernet < 0.95 && !M.berorerKant)) {
      forkast('bakgrunnen er ikke ren hvit - ' + Math.round((1 - M.kantFjernet) * 100) +
        '% av bildekanten blir staaende igjen (rutemoenster, graatt eller farget?)');
      return rapport;
    }
    if (M.berorerKant) forkast('delen er kuttet av ved bildekanten');
    if (store.length > 1 && M.nestStoerst >= 0.15) {
      forkast(store.length + ' store separate biter - skal vaere EN del (to deler, ekstra ting eller tekst?)');
    } else if (store.length > 1) {
      seOver((store.length - 1) + ' loes(e) bit(er) ved siden av delen (horn, klo, gnist?)');
    }
    if (smaa.length >= 6) seOver(smaa.length + ' smaa loese flekker (gnister, stoev, tekst?) - de fjernes, men se over');
    if (M.aapenKant > 0.08) forkast('omrisset har hull: ' + Math.round(M.aapenKant * 100) + '% av kanten er blek uten moerk strek - bakgrunnsfjerningen spiser av delen');
    else if (M.aapenKant > 0.03) seOver(Math.round(M.aapenKant * 100) + '% av kanten er blek uten moerk strek - kan bli spist litt');
    else if (M.kantUtenStrek > 0.15) seOver(Math.round(M.kantUtenStrek * 100) + '% av kanten mangler moerk strek - se at ingenting er spist');
    if (M.dekning < 0.3) seOver('delen er liten i bildet (' + Math.round(M.dekning * 100) + '%) - mindre detaljer igjen i spillet');
    if (del === 'hale' && M.tykkEnde === 'venstre') seOver('halen er tykk til VENSTRE - den skal festes til hoeyre (speilvend)');
    return rapport;
  }

  return { bgLike: bgLike, fjernBakgrunn: fjernBakgrunn, sjekkPiksler: sjekkPiksler };
})();

// -----------------------------------------------------------------------
//  Kjoert som kommando i Node
// -----------------------------------------------------------------------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SjekkDel;

  if (require.main === module) {
    const fs = require('fs');
    const path = require('path');
    const F = require('./fiks-figurer.js');

    const filer = [];
    for (const a of process.argv.slice(2)) {
      if (fs.existsSync(a) && fs.statSync(a).isDirectory()) {
        for (const f of fs.readdirSync(a).sort()) if (f.toLowerCase().endsWith('.png')) filer.push(path.join(a, f));
      } else filer.push(a);
    }
    if (!filer.length) {
      console.log('Bruk:  node verktoy/sjekk-del.js <bilde.png | mappe> ...');
      process.exit(1);
    }

    const rapporter = [];
    let verst = 0;
    for (const f of filer) {
      const im = F.decode(f);
      const del = path.basename(f, '.png').replace(/-forsok\d+$/, '');
      const r = SjekkDel.sjekkPiksler(im.px, im.w, im.h, del);
      r.fil = f;
      rapporter.push(r);
      const merke = r.dom === 'ok' ? ' ok ' : r.dom === 'se over' ? ' !  ' : ' X  ';
      verst = Math.max(verst, r.dom === 'ok' ? 0 : r.dom === 'se over' ? 1 : 2);
      const m = r.maal;
      console.log(merke + f.replace(/\\/g, '/').padEnd(44) + ' ' + r.dom.toUpperCase());
      console.log('      dekning ' + Math.round(m.dekning * 100) + '%  biter ' + m.biter +
        (m.smaabiter ? ' (+' + m.smaabiter + ' smaa)' : '') + '  blek aapen kant ' + Math.round(m.aapenKant * 100) +
        '%  uten strek ' + Math.round(m.kantUtenStrek * 100) +
        '%  tykk ende ' + m.tykkEnde + '  omriss ' + (m.omrissFarge ? 'rgb(' + m.omrissFarge.join(',') + ')' : '-'));
      for (const g of r.grunner) console.log('      - ' + g);
    }

    // Passer delene sammen? Sammenlign farger og omriss mot kroppen.
    if (rapporter.length > 1) {
      const ref = rapporter.find((r) => r.del === 'kropp') || rapporter[0];
      const likhet = (a, b) => a.reduce((s, v, i) => s + Math.min(v, b[i]), 0);
      const avstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      console.log('\nSammenlignet med ' + ref.del + ':');
      for (const r of rapporter) {
        if (r === ref || !r.maal.fargeprofil) continue;
        const farge = likhet(ref.maal.fargeprofil, r.maal.fargeprofil);
        const om = r.maal.omrissFarge && ref.maal.omrissFarge ? avstand(r.maal.omrissFarge, ref.maal.omrissFarge) : 0;
        const merknad = [];
        if (farge < 0.5) merknad.push('fargene skiller seg mye ut');
        if (om > 45) merknad.push('omrisset har en annen farge');
        if (merknad.length) verst = Math.max(verst, 1);
        console.log('  ' + r.del.padEnd(12) + ' farger ' + Math.round(farge * 100) + '% like, omriss-avstand ' +
          Math.round(om) + (merknad.length ? '   ! ' + merknad.join(', ') : ''));
      }
    }
    console.log('\nRESULTAT: ' + ['GODKJENT', 'SE OVER', 'NYTT BILDE'][verst]);
    process.exit(verst);
  }
}
