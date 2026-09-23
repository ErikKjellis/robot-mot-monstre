// serve.js - bittelien lokal server for aa teste spillet paa PC-en.
//   node serve.js          -> http://localhost:8080
//   node serve.js 3000     -> http://localhost:3000
// Er du paa samme wifi kan nettbrettet aapne http://<PC-ens-IP>:8080
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ryddFil, ryddMappe } = require('./verktoy/fiks-figurer.js');

const PORT = Number(process.argv[2]) || 8080;
const ROOT = __dirname;

// ------------------------------------------------------------------
//  Rydder figurbildene av seg selv
//  Legger du nye PNG-er i art/ blir bakgrunnen fjernet og bildet
//  krympet med en gang - du trenger ikke huske aa kjoere noe.
// ------------------------------------------------------------------
const ART = path.join(ROOT, 'art');

function fortell(r) {
  if (r.feil) console.log('  ! ' + r.rel + ': ' + r.feil);
  else console.log('  ryddet ' + r.rel + '  ' + Math.round(r.before / 1024) + ' kB -> ' +
    r.w + 'x' + r.h + ' ' + Math.round(r.after / 1024) + ' kB');
}

if (fs.existsSync(ART)) {
  const endret = ryddMappe(ART);
  if (endret.length) {
    console.log('Ryddet ' + endret.length + ' figurbilde(r):');
    endret.forEach(fortell);
    console.log('Originalene ligger i art/original/\n');
  }

  // Se etter nye filer mens serveren kjoerer.
  const venter = new Map();
  const egneSkrivinger = new Set();   // filer VI nettopp skrev - ikke reager paa dem
  try {
    fs.watch(ART, { recursive: true }, (ev, navn) => {
      if (!navn || !navn.toLowerCase().endsWith('.png')) return;
      if (navn.split(/[\\/]/)[0] === 'original') return;
      const full = path.join(ART, navn);
      if (egneSkrivinger.has(full)) { egneSkrivinger.delete(full); return; }
      clearTimeout(venter.get(full));
      venter.set(full, setTimeout(() => {
        venter.delete(full);
        if (!fs.existsSync(full)) return;
        try {
          const r = ryddFil(full);
          if (r) { egneSkrivinger.add(full); console.log('Ny figurdel funnet:'); fortell(r); }
        } catch (e) { console.log('  ! ' + navn + ': ' + e.message); }
      }, 600));
    });
  } catch (e) {
    console.log('(kunne ikke se etter nye bilder: ' + e.message + ')');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url === '/' ? 'index.html' : url);
  // ikke slipp noen ut av mappa
  if (!path.resolve(file).startsWith(path.resolve(ROOT))) {
    res.writeHead(403).end('nope');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      // Viktig: ikke la nettleseren huske at fila manglet - da dukker
      // ikke en ny PNG opp foer du toemmer cachen.
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('404');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Robot mot Monstre kjoerer paa http://localhost:' + PORT);
});
