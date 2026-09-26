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
| `verktoy/banetest.html` | Viser bakgrunnen, bakken, plattformene, tingene og effektene for hvert tema slik de blir i spillet, og lister hvilke bilder som ble funnet |
| `verktoy/lag-ramme.js` | Deler et ark med ni rammedeler opp i biter spillet bygger rammer av — se **Rammene** |
| `verktoy/lag-font.js` | Lager bildefonten av et ark med tegnede bokstaver — se **Skrift og knapper** |
| `verktoy/somlos.js` | Gjør et bakgrunnsbilde klart til å gjentas bortover uten synlig søm. `node verktoy/somlos.js --lag art/bane/skog/midt.png` (fjerner også hvitt og tom plass over og under), `--bakke` for `bakke.png` (legger bakkekanten en tolvdel ned), eller uten noe for `himmel.png`. |
| `verktoy/lag-startrigg.js` | Lager en `rigg.json` å starte med: finner leddene i bildene selv og setter figuren sammen. `node verktoy/lag-startrigg.js art/monstre/<navn> <kroppstype>` (tobeint, flygende, firbeint eller klump). Finjuster etterpå i riggverkstedet. |
| `verktoy/sjekk-del.js` | Sjekker bilder av kroppsdeler før du bruker dem: hvit bakgrunn, én bit, ingenting kuttet av kanten, bleke kanter uten strek, og om delene har samme farger. `node verktoy/sjekk-del.js <mappe>` |

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

**Føttene havner på bakken av seg selv.** Spillet finner figurens laveste synlige
punkt når den står stille, og setter det akkurat på bakken — så en figur kan ikke
sveve eller synke ned, selv om delene er plassert litt for høyt eller lavt i
riggverkstedet. Vil du heller styre høyden selv, skriv `"fotJustering": false`
i `rigg.json`.

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
| 🔫 KANON | `vapen` (kanonen i hånda) | `vapen-kanon1.png` … `-kanon5.png` |
| 🔫 KANON | `arm-fram` | `arm-fram-kanon1.png` … `-kanon5.png` |
| 👁️ LASER | `hode` | `hode-laser1.png` … `-laser5.png` |
| 🔨 HAMMER | `hammer` (hammeren i hånda) | `hammer-hammer1.png` … `-hammer5.png` |
| 🔨 HAMMER | `arm-bak` | `arm-bak-hammer1.png` … `-hammer5.png` |
| 🦿 BEIN | `bein-fram`, `bein-bak` | `bein-fram-bein1.png` … |
| 🛡️ PANSER | `kropp` | `kropp-panser1.png` … `-panser5.png` |
| 🚀 JET | `rygg` | `rygg-jet1.png` … `-jet5.png`, og `rygg-jet1-flamme.png` … med flammer |

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

**Jetpakken med flammer:** lag `rygg-jet3-flamme.png` ved siden av
`rygg-jet3.png`, så brukes den mens roboten flyr (og spillet tegner ingen egen
flamme). Tegn begge på **nøyaktig samme lerret** — samme størrelse og pakken på
samme sted — så ligger de oppå hverandre.

**Samme lerret for alle nivåene:** alle fem kanonene (og hamrene, og
jetpakkene) plasseres med de samme tallene i riggen. Legg dem derfor på like
store lerreter, med håndtaket (eller midten av pakken) på samme sted — da blir de
store nivåene større på roboten, og ingenting hopper når du kjøper et nytt nivå.

**Skudd og hammersmell per nivå:** `art/ting/skudd-1.png` … `-5.png` er
skuddene fra hver kanon, og `art/effekter/slag-1.png` … `-5.png` smellet fra
hver hammer (se under).

I figurtesteren kan du dra i skyvebryterne for hver oppgradering og se
roboten bygge seg om med en gang.

---

## Bakgrunner, bakke, ting og effekter

Alt i banen kan også byttes ut — himmelen, fjellene i bakgrunnen, bakken,
plattformene, mynter, kraftpakker, skudd og effektene (smell, flammer, støv). Samme regel som for figurene:
**finnes fila, brukes den, ellers tegner spillet selv.** Se resultatet i
`verktoy/banetest.html` mens du jobber.

### Banen — `art/bane/<tema>/`

Hvert nivå har sitt tema: `by` (nivå 1), `skog` (2), `hule` (3), `is` (4),
`lava` (5) og `rom` (6). Eksempel: `art/bane/skog/himmel.png`.

| Fil | Hva det er | Slik brukes den |
|---|---|---|
| `himmel.png` | himmelen | Fyller hele skjermen i høyden og gjentas bortover. Glir nesten ikke. Helt dekkende bilde, liggende format (f.eks. 1536 × 1024). |
| `sol.png` | sola, månen eller planeten (valgfri) | Tegnes én gang, oppe til høyre, 22 % av skjermhøyden, og glir nesten ikke. Tegn den **ikke** inn i `himmel.png` — himmelen gjentas bortover, og da kunne du sett to soler samtidig. Tegn den på hvit bakgrunn med en litt mørkere kant, så beskjæres den av seg selv. Uten `sol.png` får en egen himmel ingen sol; uten egen himmel tegner spillet sin egen. |
| `langt.png` | fjell eller byer langt borte | Hele bildet blir 55 % av skjermhøyden, med bunnkanten på horisonten. Gjentas bortover og glir sakte forbi. |
| `midt.png` | trær eller hus nærmere | Som `langt`, men 40 % av skjermhøyden, og glir raskere. |
| `naer.png` | busker og steiner rett bak banen (valgfri) | 25 % av skjermhøyden, glir nesten like fort som bakken. |
| `bakke.png` | bakken | Gjentas bortover. **Bakkekanten der figurene står skal ligge en tolvdel ned i bildet** — det over kanten stikker opp over bakken. La gresset gå helt opp til toppkanten, eller gjør mellomrommene mellom gresstråene ekte gjennomsiktige: hvitt fjernes ikke fra `bakke.png`. Bare omtrent de øverste 60 % synes, så legg detaljene øverst. Gjerne kvadratisk, f.eks. 512 × 512. |
| `plattform.png` | plattformene | **Øverste kant er der figurene står.** Minst tre ganger så bred som høy, f.eks. 768 × 256. Endene (et kvadrat hver) blir stående, midten strekkes til plattformens bredde. |
| `port.png` | porten foran sjefen | Tegnes 250 enheter høy, og bredden følger bildet. Vil du ha en smal port som den innebygde, tegn den omtrent fem ganger så høy som bred (f.eks. 256 × 1280). |

**Bilder som gjentas bortover må henge sammen i kantene** — det som går ut på
høyre side må fortsette på venstre side, ellers ser du en søm. Klarer du ikke
det selv, gjør `node verktoy/somlos.js` det for deg: den skjærer en snirklete
søm der de to endene ligner mest, og bildet blir en femtedel smalere.

**Hvit bakgrunn på `langt`, `midt` og `naer`:** tegn dem på hvit bakgrunn,
så fjernes det hvite rundt fjellene og trærne automatisk. Men alt som er hvitt
eller veldig lyst grått og henger sammen med kanten av bildet, tas for
bakgrunn — gi snø, is og dis en tydelig mørk strek. Har bildet allerede ekte
gjennomsiktighet, røres det ikke. Disse bildene krympes og beskjæres aldri.
`himmel.png` og `bakke.png` røres ikke av oppryddingen i det hele tatt.

**Bare din egen himmel?** Så lenge `langt.png` og `midt.png` mangler, tegner
spillet sine egne fjell og trær foran den. Vil du bare se himmelen din, legg
inn en helt gjennomsiktig `langt.png` og `midt.png`.

### Ting — `art/ting/`

| Fil | Hva det er |
|---|---|
| `mynt.png` | mynten — den snurrer av seg selv |
| `hjerte.png` | kraftpakken som gir helse |
| `lyn.png` | kraftpakken som gir dobbel skuddfart |
| `stjerne.png` | kraftpakken som gjør roboten usårbar |
| `skudd-1.png` … `skudd-5.png` | robotens skudd for hvert kanonnivå. Tegn dem **pekende mot høyre**. Mangler et nivå, brukes nivået under. `skudd-1` brukes også før du har kjøpt KANON. |
| `fiendeskudd.png` | monstrenes skudd, også pekende mot høyre — brukes for alle skudd som ikke har sitt eget bilde i `art/effekter/` |

Tingene ryddes som figurene: hvit bakgrunn fjernes, små løse prikker fjernes, og de krympes til maks 512 piksler. Tegn hver ting som én sammenhengende figur.

### Effekter — `art/effekter/`

| Fil | Hva det er | Slik brukes den |
|---|---|---|
| `ildkule.png` | ildkula fra de flygende dragene og Røddragen | Pekende mot høyre, snus i fartsretningen |
| `iskule.png` | isspyttet fra isøglene og Frostdragens kuler | som over |
| `magikule.png` | magien fra skyggedragene (den som svinger etter deg) | som over |
| `giftkule.png` | Hydraens vifte av skudd | som over |
| `kongekule.png` | Kongedragens skudd | som over |
| `sjokkbolge.png` | bølgen som ruller langs bakken når en sjef stamper | Tegnet mot høyre (speilvendes når den ruller mot venstre), med flat bunn — bunnen står på bakken |
| `poff.png` | røyksky når et monster blir beseiret | Vokser og blekner over monsteret; brukes for alle monstre, så hold fargen nøytral |
| `treff.png` | lite smell der et skudd treffer | Snus tilfeldig |
| `slag.png` | smellet når hammeren treffer | Vokser og blekner foran roboten, med bunnen litt under midten av den. Lag gjerne `slag-1.png` … `slag-5.png`, ett for hvert hammernivå |
| `jetflamme.png` | flammen fra jetpakken | **Spissen rett nedover**, bred ende øverst. Lengden flakker. Brukes ikke når jetpakken har sitt eget `rygg-jetN-flamme.png` |
| `stov.png` | støvsky ved føttene når roboten hopper og lander | Bunnen står på bakken |

Effektene ryddes som tingene, men små løse biter beholdes — et smell kan godt
være flere stråler. Gi alt en tydelig mørk strek rundt, ellers kan lyse flammer
og skyer bli spist opp sammen med den hvite bakgrunnen. Uten bildet tegner
spillet effekten som før.

---

## Skrift og knapper

### Bildefonten — `art/font/`

Tekstene i spillet (tall, overskrifter, butikken, poengene, "+5" når du tar en
mynt) tegnes med en **bildefont**: hver bokstav er et lite utsnitt av
`art/font/spillfont.png`, og `spillfont.json` sier hvor hver bokstav ligger.
Det er det samme som BitmapText i Phaser — `spillfont.xml` er i BMFont-formatet
Phaser leser, hvis du vil bruke fonten der også.

Vil du tegne bokstavene på nytt: tegn dem i rader på gjennomsiktig (eller hvit)
bakgrunn, godt adskilt, og kjør

```bash
node verktoy/lag-font.js ark/font-kilde.png spillfont "ABCDEFGHIJKLM" "NOPQRSTUVWXYZ" "ÆØÅ" "abcdefghijklm" "nopqrstuvwxyz" "æøå" "0123456789!?.,-" --som "I=l"
```

Hver rad i anførselstegn er tegnene i den raden på arket, fra venstre. Se
`art/font/spillfont-oversikt.png` etterpå — hver bokstav skal stå på den røde
grunnlinja. `--som "I=l"` betyr at stor I bruker formen til liten l (på arket
er stor I tegnet med prikk, som en liten i). Tegn som mangler (som + og emoji)
skrives med vanlig tekst.

`Spillfont.ttf` brukes bare i navnefeltet på slutten, der bildefont ikke går.

### Knapper og ikoner — `art/grafikk/`

| Fil | Hvor |
|---|---|
| `logo.png` | startskjermen |
| `knapp-spill.png`, `knapp-highscore.png`, `knapp-lyd.png`, `knapp-fullskjerm.png` | startskjermen (`-trykk` når de trykkes, `knapp-lyd-av.png` når lyden er av) |
| `knapp-fortsett.png` | fortsett-knappen i pausen |
| `knapp-hjem.png` | hjem-knappene (pause og poenglista) |
| `knapp-pause.png` | pauseknappen oppe til høyre |
| `knapp-igjen.png` | spill igjen, når du har tapt |
| `ikon-stjerne.png`, `ikon-hodeskalle.png` | når du vinner et nivå / taper |
| `ramme/` | rammen rundt vinduene (pause, vunnet, tapt, poeng) — se under |

### Rammene — `art/grafikk/ramme/`

Rammene rundt vinduene **bygges av ni deler**, akkurat som du tegnet dem — ingenting
strekkes. Hjørnene settes i hjørnene, kantene legges som hele planker (så mange som
får plass, hver planke justeres bare litt så den siste slutter ved hjørnet), og
midten legges som fliser. Da blir rammen like fin enten vinduet er lite eller stort.

| Fil | Del |
|---|---|
| `hjorne-oppe-venstre.png`, `hjorne-oppe-hoyre.png`, `hjorne-nede-venstre.png`, `hjorne-nede-hoyre.png` | hjørnene (gresset og steinene som stikker ut, blir med) |
| `kant-oppe.png`, `kant-nede.png`, `kant-venstre.png`, `kant-hoyre.png` | plankene langs kantene |
| `midt.png` | flisa i midten |
| `ramme.json` | hvor **steinen** er i hvert bilde (gress og småstein teller ikke) |

Tegner du et nytt sett, legg de ni delene i et rutenett på ett ark (hjørne, kant,
hjørne / kant, midt, kant / hjørne, kant, hjørne) og kjør

```bash
node verktoy/lag-ramme.js art/grafikk/panel-deler.png
```

I koden: `tegnRamme(ctx, x, y, bredde, hoyde, skala)` i `js/ramme.js` tegner en ramme
hvor som helst i et lerret, og `rammeRundt(element)` gir et vindu i menyene en ramme.

Mangler knappebildene, brukes de vanlige knappene. `-av` og `-pynt`-variantene
er lagt ved, men brukes ikke ennå.

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
