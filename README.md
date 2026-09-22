# 🤖 Robot mot Monstre

Et lite 2D-sidescroller-spill for nettbrett, laget for en 6-åring som nettopp har
begynt å lese. Nesten all informasjon er ikoner, tall og enkeltord på norsk.

Roboten starter som en liten, enkel boks. For hver oppgradering blir den
**større og mer utbygd** — laserøyne, kanonarm, hammer, panser, jetpack — helt
til den er en kjempe som slåss mot Godzilla-aktige monstre og drager.
Poengsummen er hvor mye roboten er verdt.

**Du kan bytte ut alle figurene med PNG-er du tegner selv.**
Se [art/LES-MEG.md](art/LES-MEG.md).

Ingen rammeverk, ingen byggesteg, ingen avhengigheter.

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

Hold 💥 inne for å skyte i ett sett. Du kan hoppe **oppå** små monstre for å
knuse dem. Laseren og hammeren går av seg selv når du har kjøpt dem — ingen
ekstra knapper å huske.

---

## Legge det på GitHub Pages

1. Lag et tomt repo på GitHub (f.eks. `robot-mot-monstre`). Ikke huk av for README.
2. I denne mappa:

```bash
git remote add origin https://github.com/BRUKERNAVN/robot-mot-monstre.git
```

```bash
git branch -M main && git push -u origin main
```

3. På GitHub: **Settings → Pages → Source: Deploy from a branch**, velg
   `main` og mappa `/ (root)`, og trykk Save.
4. Etter et minutt ligger spillet på
   `https://BRUKERNAVN.github.io/robot-mot-monstre/`.

### Legg det på hjemskjermen (anbefalt)

Åpne lenken i Chrome på nettbrettet → menyen (⋮) → **Legg til på startskjermen**.
Da starter spillet i fullskjerm uten adresselinje, og virker også uten nett.

---

## 🎨 Egne figurer

Tegn monstrene selv og legg dem i `art/`-mappa. Spillet plukker dem opp uten at
du rører koden. Tre nivåer:

- **Én PNG** for hele figuren → den puster og hopper
- **Én PNG per kroppsdel** (kropp, hode, armer, bein, hale, vinger) → beina
  svinger, hodet nikker, vingene flakser
- **Ingen fil** → spillet tegner figuren selv

`art/monstre/smaadrage/` er et **ferdig eksempel** med alle sju delene, og
`art/maler/mal-tobeint.png` er en mal du kan tegne oppå.

**Full oppskrift med mål, festepunkter og filnavn: [art/LES-MEG.md](art/LES-MEG.md)**

### Figurtesteren

Åpne `verktoy/figurtest.html` mens serveren kjører. Den viser figuren stor og i
bevegelse, lister opp hvilke filer den fant og hvilke som mangler, og lar deg dra
i oppgraderingsnivåene for å se roboten bygge seg om.

---

## Nivåer og monstre

| Nivå | Sted | Nye monstre | Sjef |
|---|---|---|---|
| 1 | Byen | liten drage, ildøgle | 🦖 Godzaur |
| 2 | Skogen | flygedrage | 🐉 Røddragen |
| 3 | Hulen | isøgle (spytter) | 🐍 Hydra |
| 4 | Isen | steintroll | ❄️ Frostdragen |
| 5 | Lava | skyggedrage (magi som følger etter deg) | 🗿 Kolossen |
| 6 | Rommet | alt sammen | 👑 Kongedragen |

Fra nivå 2 begynner dragene å spytte ild, og fra nivå 5 kaster skyggedragene
magi som svinger etter roboten.

## Butikken

| | | |
|---|---|---|
| 🔫 **KANON** — hardere og raskere skudd | 👁️ **LASER** — laserøyne som skyter av seg selv | 🔨 **HAMMER** — smeller på alt som kommer nær |
| 🦿 **BEIN** — løper og hopper bedre | 🛡️ **PANSER** — flere hjerter og skjold | 🚀 **JET** — dobbelt- og trippelhopp |

Hver kan kjøpes 5 ganger, og **hver eneste en gjør roboten større**.
Hjertene fylles opp ved starten av hvert nivå.

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

**For vanskelig?** Sett ned `hp` på monstrene, eller gi flere starthjerter ved å
endre `maxHp: 3 + ...` i `stats()`.

I nettleserkonsollen finnes `game` for fikling:

```js
game.run.coins = 999                      // masse mynter
game.player.x = game.world.bossAt + 10    // hopp rett til sjefen
Object.keys(game.run.up).forEach(k => game.run.up[k] = 5); game.refreshStats()
```

## Filer

```
index.html            skjermbildene (meny, butikk, poengliste)
css/style.css         utseende, store trykkeknapper
js/core.js            matte, lagring, lyd (lages i WebAudio), kontroller
js/content.js         monstre, sjefer, nivåer, oppgraderinger  ← skru her
js/rigs.js            hvilke kroppsdeler hver figur har         ← figurer
js/sprites.js         laster PNG-figurer og animerer delene
js/art.js             spillets egen strektegning (når du ikke har PNG-er)
js/game.js            fysikk, monster-AI, sjefsmønstre
js/ui.js              HUD, butikk, poengliste
js/main.js            starter spillet, bytter skjermbilder
art/                  dine egne figurer  ← se art/LES-MEG.md
verktoy/figurtest.html    test dine egne figurer
sw.js                 gjør at spillet virker uten nett
serve.js              liten lokal server for testing
```
