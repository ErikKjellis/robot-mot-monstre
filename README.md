# 🤖 Robot mot Monstre

Et lite 2D-sidescroller-spill for nettbrett, laget for en 6-åring som nettopp har
begynt å lese. Nesten all informasjon er ikoner, tall og enkeltord på norsk.

Kjør roboten mot høyre, skyt monstre, samle mynter, og slå sjefen på slutten av
hvert nivå. Mellom nivåene kjøper du oppgraderinger i butikken — og roboten
**ser** faktisk bedre ut jo mer du har kjøpt. Poengsummen er hvor mye roboten er
verdt.

Ingen rammeverk, ingen byggesteg, ingen bildefiler — bare HTML, CSS og JavaScript.

---

## Spille

**På nett:** legg det på GitHub Pages (se under), og åpne lenken i Chrome på nettbrettet.

**Lokalt på PC-en:**

```bash
node serve.js
```

Åpne så `http://localhost:8080`. Er nettbrettet på samme wifi, kan det åpne
`http://<PC-ens-IP-adresse>:8080` (finn IP-en med `ipconfig`).

> Spillet må serveres over http — det virker ikke om du bare
> dobbeltklikker `index.html` (nettleseren blokkerer JavaScript-moduler fra `file://`).

### Kontroller

| Nettbrett | Tastatur (til testing) |
|---|---|
| ◀ ▶ store knapper nede til venstre | piltaster / A og D |
| ⬆ grønn knapp nede til høyre | mellomrom / pil opp / W |
| 💥 rød knapp nede til høyre | J, K, Z eller Shift |

Hold 💥 inne for å skyte i ett sett. Du kan også hoppe **oppå** små monstre for
å knuse dem.

---

## Legge det på GitHub Pages

1. Lag et tomt repo på GitHub (f.eks. `robot-mot-monstre`). Ikke huk av for README.
2. I denne mappa:

```bash
git remote add origin https://github.com/BRUKERNAVN/robot-mot-monstre.git
git branch -M main
git push -u origin main
```

3. På GitHub: **Settings → Pages → Source: Deploy from a branch**, velg
   `main` og mappa `/ (root)`, og trykk Save.
4. Etter et minutt ligger spillet på
   `https://BRUKERNAVN.github.io/robot-mot-monstre/`.

### Legg det på hjemskjermen (anbefalt)

Åpne lenken i Chrome på nettbrettet → menyen (⋮) → **Legg til på startskjermen**.
Da starter spillet i fullskjerm uten adresselinje, og virker også uten nett.

---

## Nivåer og monstre

| Nivå | Sted | Nye monstre | Sjef |
|---|---|---|---|
| 1 | Skraphaug | slim, edderkopp | 👑 Slimkongen |
| 2 | Skog | flaggermus | 🕸️ Edderkoppdronninga |
| 3 | Hule | øyet (skyter) | 🦇 Flaggermuskongen |
| 4 | Is | steintrollet | 🗿 Steinkjempen |
| 5 | Lava | trollmannen (magi som følger etter deg) | 🧙 Trollmesteren |
| 6 | Rommet | alt sammen | 👹 Mega-Monsteret |

Fra nivå 3 begynner monstrene å skyte, og fra nivå 5 kaster trollmennene magi
som svinger etter roboten.

## Butikken

| | | |
|---|---|---|
| 💥 **SKADE** — hardere skudd | ⚡ **SKYT** — skyter oftere | 👟 **FART** — løper og hopper bedre |
| ❤️ **LIV** — flere hjerter | 🛡️ **SKJOLD** — tåler ett treff, lader seg opp | 🧲 **MAGNET** — suger til seg mynter |

Hver kan kjøpes 5 ganger. Hjertene fylles opp ved starten av hvert nivå.

## Poeng

```
VERDI = mynter brukt i butikken + mynter du har igjen + 100 per nivå klart
```

Alt du har samlet teller, så du taper aldri poeng på å kjøpe noe. De ti beste
lagres i nettleseren på nettbrettet (`localStorage`).

---

## Skru på spillet

Nesten alt som bestemmer vanskelighetsgrad ligger i [`js/content.js`](js/content.js):

- `ENEMIES` — helse, fart og skade på hvert monster
- `BOSSES` — sjefenes helse og angrepsmønster
- `LEVELS` — banelengde, hvilke monstre som dukker opp, hvor mange mynter
- `UPGRADES` / `stats()` — priser og hva oppgraderingene gjør
- `levelScale()` — hvor mye seigere monstrene blir utover i spillet

**Er det for vanskelig?** Sett ned `hp` på monstrene, eller gi flere starthjerter
ved å endre `maxHp: 3 + up.hp` i `stats()`.

I nettleserkonsollen finnes `game` for fikling:

```js
game.run.coins = 999                      // masse mynter
game.player.x = game.world.bossAt + 10    // hopp rett til sjefen
```

## Filer

```
index.html            skjermbildene (meny, butikk, poengliste)
css/style.css         utseende, store trykkeknapper
js/core.js            matte, lagring, lyd (lages i WebAudio), kontroller
js/content.js         monstre, sjefer, nivåer, oppgraderinger  ← skru her
js/art.js             all tegning (ingen bildefiler)
js/game.js            fysikk, monster-AI, sjefsmønstre
js/ui.js              HUD, butikk, poengliste
js/main.js            starter spillet, bytter skjermbilder
sw.js                 gjør at spillet virker uten nett
serve.js              liten lokal server for testing
```
