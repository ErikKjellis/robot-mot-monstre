# 🎨 Lage dine egne figurer

Alle figurene i spillet kan byttes ut med PNG-bilder du lager selv.
Du trenger ikke røre koden — legg fila på rett sted med rett navn, og spillet
finner den. Finner det ingen fil, tegner spillet figuren selv som før.

## 🔧 Verktøyene — start her

Kjør `node serve.js`, og åpne:

| Verktøy | Hva den gjør |
|---|---|
| **`verktoy/rigger.html`** | **Riggverkstedet.** Dra hver kroppsdel på plass, sett leddene, roter, speilvend. Lagrer `rigg.json`. Det er her du bygger figuren. |
| `verktoy/figurtest.html` | Viser figuren stor og i bevegelse, og lister hvilke filer som ble funnet |

### Bildene ryddes av seg selv

`node serve.js` **rydder opp i bildene automatisk** — både når den starter og
når du legger nye PNG-er i `art/` mens den kjører. Den fjerner bakgrunnen (også
det grå rutemønsteret mange tegneprogram brenner inn i bildet når du tror du
lagrer gjennomsiktig), beskjærer bort tom plass og krymper til 512 piksler.
Du ser det i terminalvinduet:

```
Ny figurdel funnet:
  ryddet monstre/flygedrage/hode.png  449 kB -> 512x363 285 kB
```

Originalene tas vare på i `art/original/`, så ingenting går tapt. Trenger du å
kjøre den for hånd går det også:

```bash
node verktoy/fiks-figurer.js art
```

### ⚠️ Legg mappa på rett sted

Monstre skal ligge i **`art/monstre/<navn>/`** — ikke rett i `art/`.
Navnet må være ett av dem i tabellen lenger ned (`flygedrage`, `isoegle` …).
Ligger mappa feil, finner ikke spillet den, og da blir figuren tegnet med
spillets egen strek i stedet.

```
art/monstre/flygedrage/kropp.png     ✅
art/flygedrage/kropp.png             ❌ spillet leter ikke her
```

Roboten er det eneste unntaket: den ligger i `art/robot/`.

---

## To måter å bygge en figur på

**A. Løse deler + riggverkstedet ← dette er måten figurene i spillet er laget på**

Tegn hver kroppsdel som sitt eget bilde — hodet i ett bilde, armen i et annet.
**Størrelsen spiller ingen rolle**, og delene trenger ikke ligge på samme sted i
bildet. Så åpner du `verktoy/rigger.html`, drar delene på plass, setter leddene,
og trykker **Last ned rigg.json**. Legg fila i figurens mappe. Ferdig — spillet
bruker den med en gang, uten at du rører koden.

> **Lager du bildene med en bilde-AI?** Bruk [AI-OPPSKRIFT.md](AI-OPPSKRIFT.md).
> Den er skrevet for å limes rett inn til AI-en, og tar med det som pleier å gå
> galt. Send **ikke** med denne fila eller malen — de fire reglene under gjelder
> bare måte B.

**B. Lag på felles lerret (hvis du tegner hele figuren i ett)**

Tegn hele figuren, og lagre hvert lag som sin egen PNG i nøyaktig samme
størrelse. Da faller alt på plass uten rigg-fil. Malen
`art/maler/mal-tobeint.png` viser hvor leddene skal ligge. Resten av dette
dokumentet beskriver denne måten.

---

## Tre måter, velg selv hvor mye du orker

### 1. Én enkelt PNG (enklest)

Tegn hele monsteret i ett bilde og lagre det som mappenavnet + `.png`:

```
art/monstre/ildoegle.png
```

Figuren puster og hopper litt, men armer og bein beveger seg ikke hver for seg.
Helt greit å begynne her.

### 2. Én PNG per kroppsdel (best — det beveger seg ordentlig)

Legg delene i en mappe som heter det samme som monsteret:

```
art/monstre/ildoegle/kropp.png
art/monstre/ildoegle/hode.png
art/monstre/ildoegle/bein-fram.png
art/monstre/ildoegle/bein-bak.png
...
```

Da svinger beina når den går, hodet nikker, halen logrer og vingene flakser.

### 3. Ingen fil

Spillet tegner figuren selv. Slett en mappe, så er du tilbake til det
innebygde utseendet.

> **`kropp.png` er sjefen.** Finnes den, brukes delemodus. Mangler den,
> ser spillet etter én-fils-bildet. Mangler det også, tegner spillet selv.
> Andre deler kan du droppe — de hoppes bare over.

---

## Slik skal bildene lages — måte B (felles lerret)

> ⚠️ **Disse fire reglene gjelder BARE måte B**, altså når du tegner hele
> figuren i ett og lagrer lag for lag. Bruker du riggverkstedet (måte A),
> spiller verken størrelse, beskjæring eller plassering i bildet noen rolle —
> se [AI-OPPSKRIFT.md](AI-OPPSKRIFT.md) i stedet.

Det er fire regler. Følg dem, så sitter alt på plass av seg selv.

1. **Alle delene til én figur skal ha nøyaktig samme bildestørrelse.**
   512 × 512 piksler er fint. Tegn hele figuren først, og lagre hvert lag
   for seg — samme lerret hver gang.
2. **Figuren skal se mot høyre.** Spillet speilvender den selv når monsteret
   snur.
3. **Føttene skal stå helt nede ved bunnkanten**, og figuren midt i bildet.
   Der bunnen av bildet er, der er bakken i spillet.
4. **Gjennomsiktig bakgrunn** (PNG med alfakanal). Ikke hvit bakgrunn.

Åpne **`art/maler/mal-tobeint.png`** som bunnlag i tegneprogrammet og tegn
oppå den. Den har rutenett, bakkelinje og de tre festepunktene markert.

### Arbeidsflyt i et lagbasert tegneprogram

Fungerer i Krita, GIMP, Photoshop, Paint.NET, Procreate, Photopea (gratis i
nettleseren) — alt som har lag og kan lagre PNG.

1. Nytt bilde, 512 × 512, gjennomsiktig bakgrunn.
2. Legg `mal-tobeint.png` som nederste lag.
3. Tegn **ett lag per kroppsdel**: kropp, hode, bein-fram, bein-bak …
4. Skjul alle lag unntatt ett, og lagre som PNG med delens navn.
   Gjenta for hvert lag. *Ikke* beskjær bildet — alle skal være 512 × 512.
5. Slett mal-laget til slutt (eller bare skjul det).

### Festepunktene (der delen roterer)

En del roterer om ett punkt. Tegn delen slik at leddet ligger på punktet:

| Punkt | Hvor i bildet | I malen | Gjelder |
|---|---|---|---|
| Nakke / skulder | midt på, 42 % ned | 🟡 gul prikk | `hode`, `arm-fram`, `arm-bak`, `vinge-*`, `vapen` |
| Hofte | midt på, 58 % ned | 🔴 rød prikk | `bein-fram`, `bein-bak` |
| Halerot | 42 % inn, 62 % ned | 🔵 blå prikk | `hale` |

På 512 × 512 betyr det: gul (256, 215), rød (256, 297), blå (215, 317).

Altså: **tegn låret slik at toppen av det ligger på den røde prikken**, og
hodet slik at halsen ender på den gule. Begge beina tegnes fra samme prikk —
spillet svinger dem i hver sin retning.

Vil du flytte et festepunkt, står de i `js/rigs.js` som `dreiepunkt: [x, y]`
(andel av bildet, 0–1).

---

## Delenavn

Bruk nøyaktig disse navnene. Ingen æ, ø eller å i filnavn.

| Fil | Hva det er |
|---|---|
| `kropp.png` | overkroppen — **må finnes** for delemodus |
| `hode.png` | hodet, med hals ned mot skulderpunktet |
| `arm-fram.png` | armen nærmest deg |
| `arm-bak.png` | armen bak kroppen (tegn den litt mørkere) |
| `bein-fram.png` | beinet nærmest deg |
| `bein-bak.png` | beinet bak (litt mørkere) |
| `hale.png` | hale |
| `vinge-fram.png` | vinge foran |
| `vinge-bak.png` | vinge bak |

Roboten har i tillegg `rygg.png` (jetpack) og `vapen.png`.

Hvilke deler en figur faktisk bruker står i `js/rigs.js` — og figurtesteren
lister dem opp for deg.

---

## Figurene i spillet

Mappene ligger under `art/monstre/`. Størrelsene er hvor stor figuren blir
i spillet (bredde × høyde i piksler) — nyttig hvis du vil treffe fasongen.
Bildet ditt skaleres etter **høyden**.

| Mappe | Hvem | Størrelse | Kroppsfasong |
|---|---|---|---|
| `smaadrage` | liten drage (**ferdig eksempel — se her!**) | 56 × 52 | tobeint |
| `ildoegle` | ildøgle | 64 × 46 | firbeint |
| `flygedrage` | flygende drage | 68 × 50 | flygende |
| `isoegle` | isøgle som spytter | 66 × 60 | firbeint |
| `steintroll` | steintroll | 82 × 88 | klump |
| `skyggedrage` | skyggedrage | 74 × 66 | flygende |
| `godzaur` | 🦖 sjef, nivå 1 | 200 × 180 | tobeint |
| `roddrage` | 🐉 sjef, nivå 2 | 250 × 150 | flygende |
| `hydra` | 🐍 sjef, nivå 3 | 220 × 190 | tobeint |
| `frostdragen` | ❄️ sjef, nivå 4 | 225 × 200 | flygende |
| `kolossen` | 🗿 sjef, nivå 5 | 235 × 225 | klump |
| `kongedragen` | 👑 sjef, nivå 6 | 290 × 250 | tobeint |

**`art/monstre/smaadrage/` er et ferdig eksempel** med alle sju delene.
Åpne filene og se hvordan de er bygget opp — det er den raskeste måten å
skjønne det på. Sletter du mappa, tegner spillet dragen selv igjen.

---

## Roboten

Roboten ligger i `art/robot/` og har én ekstra finesse: **hver oppgradering
kan bytte ut en kroppsdel.**

| Oppgradering | Bytter ut | Filnavn |
|---|---|---|
| 🔫 KANON | `arm-fram` | `arm-fram-kanon1.png` … `-kanon5.png` |
| 👁️ LASER | `hode` | `hode-laser1.png` … `-laser5.png` |
| 🔨 HAMMER | `arm-bak` | `arm-bak-hammer1.png` … `-hammer5.png` |
| 🦿 BEIN | `bein-fram`, `bein-bak` | `bein-fram-bein1.png` … |
| 🛡️ PANSER | `kropp` | `kropp-panser1.png` … `-panser5.png` |
| 🚀 JET | `rygg` | `rygg-jet1.png` … `-jet5.png` |

Har du kjøpt kanon nivå 3, leter spillet etter `arm-fram-kanon3.png`, så
`-kanon2`, så `-kanon1`, og til slutt `arm-fram.png`. **Du trenger altså ikke
lage alle fem** — lag `-kanon1.png` og `-kanon3.png`, så bytter roboten utseende
to ganger på veien.

Spillets egne kanoner er fem forskjellige våpen (pistol, rifle, dobbeltløp,
gatling, energikanon), så tegn gjerne dine som fem forskjellige våpen også — ikke
bare det samme røret i fem lengder.

**Viktig for `arm-fram` og `vapen`:** armen roterer når roboten sikter opp eller
på skrå. Tegn den derfor slik at skulderen ligger på den gule prikken i malen,
og med våpenet pekende rett mot høyre. Da peker det riktig vei i alle vinkler.

Roboten blir dessuten større for hver eneste oppgradering, fra 50 til 119
piksler høy. Tegn den derfor som den ser ut **ferdig utbygd** — den skaleres ned
når den er liten.

I figurtesteren kan du dra i skyvebryterne for hver oppgradering og se
roboten bygge seg om med en gang.

---

## Når noe ikke stemmer

| Det skjer | Sånn fikser du det |
|---|---|
| Figuren vises ikke | Sjekk stavingen i figurtesteren — den viser hele filnavnet den leter etter. Og husk at `kropp.png` må finnes. |
| Figuren svever over bakken | Føttene er ikke helt nede ved bunnkanten av bildet. |
| Delene sitter feil i forhold til hverandre | Delene har ulik bildestørrelse. Alle må være nøyaktig like store. |
| Beinet roterer rart | Hofteleddet ligger ikke på den røde prikken i malen. |
| Figuren ser feil vei | Tegn den mot høyre. Spillet speilvender selv. |
| Ny PNG dukker ikke opp i spillet | Nettleseren husker at fila manglet. Hard oppfrisking: **Ctrl + F5**. (Figurtesteren henter alltid ferskt.) |
| Kantene er hakkete | Lagre med gjennomsiktig bakgrunn, ikke hvit. |

Røde 404-meldinger i nettleserkonsollen er **normalt** — det er spillet som
leter etter PNG-er du ikke har laget. Det gjør ingen skade.
