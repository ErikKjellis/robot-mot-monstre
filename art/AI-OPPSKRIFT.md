# 🤖 Oppskrift til bilde-AI-en

Denne fila er skrevet for å limes rett inn til AI-en som lager bildene.
Du trenger **ikke** sende med `LES-MEG.md` eller `mal-tobeint.png` — malen hører
til den gamle måten der alle delene måtte ligge på samme lerret. Nå plasserer du
delene i `verktoy/rigger.html`, og da spiller det ingen rolle hvor stor delen er
eller hvor i bildet den ligger.

---

## Be om ALLE delene i ETT bilde

Ber du om én del om gangen, driver stilen fra seg selv — fargene forskyver seg,
konturen blir tynnere, lyset snur. Be heller om **ett ark med alle delene**, godt
adskilt på hvit bakgrunn. Da er alt tegnet i samme slengen, og stilen er lik.

Etterpå klipper dette verktøyet arket fra hverandre:

```bash
node verktoy/del-opp.js ark/skyggedrage.png art/monstre/skyggedrage kropp hode hale vinge-fram vinge-bak bein-fram bein-bak
```

Legg selve arket i `ark/` (ikke i `art/`). Verktøyet fjerner bakgrunnen, finner
hver del, beskjærer og lagrer dem med navnene du oppgir — i **leserekkefølge**:
øverste rad fra venstre mot høyre, så neste rad. Det lager også
`ark-oversikt.png` med nummererte rammer, så du kan se at delene fikk riktig
navn. Ble det feil, kjør på nytt med navnene i en annen rekkefølge.

---

## Malen — bytt ut det som står i «hakeparentes»

> Jeg lager en 2D-sidescroller og trenger kroppsdeler som settes sammen i
> spillet. Tegn **alle delene i ett og samme bilde**, som et delark.
>
> **FIGUR:** [navn og kort beskrivelse]
>
> **STIL:** tegneseriestil til et spill. Tykk mørk kontur rundt hver del, flate
> farger med enkel skyggelegging, lyset kommer ovenfra og fra venstre. Rene
> former, tydelig silhuett, ingen fotorealisme.
>
> **FARGER:** [palett]
>
> **DELENE — i denne rekkefølgen, radvis fra øverst til venstre:**
> [liste, f.eks. kropp, hode, hale, vinge-fram, vinge-bak, bein-fram, bein-bak]
>
> **REGLER:**
> 1. **Ensfarget hvit bakgrunn.** Ikke rutemønster, ikke gjennomsiktig, ikke
>    skygge på bakken, ikke bakgrunnsmotiv, ikke ramme eller tekst.
> 2. **God luft mellom delene** — de må ikke berøre eller overlappe hverandre.
> 3. **Tykk mørk kontur hele veien rundt hver del.**
> 4. **Alt sett fra siden, vendt mot høyre.** Ikke skrått forfra.
> 5. Hver del skal være **løsrevet**, som om den er tatt av figuren. Enden som
>    festes (skulder, hofte, hals, vingerot) skal være en ren avrundet ende.
> 6. Ingen hel figur i bildet — bare delene, hver for seg.
> 7. Samme farger, samme lysretning og samme strektykkelse på alle delene.

**Går det galt?** Be om én del om gangen i samme samtale i stedet, med
«nøyaktig samme stil, farger og lysretning som forrige del». Da kan du legge
PNG-ene rett i figurmappa uten å dele opp noe.

---

## Hvorfor akkurat disse reglene

**Hvit bakgrunn, ikke «transparent».** Bildegeneratorer klarer nesten aldri ekte
gjennomsiktighet. Ber du om det, får du et grått rutemønster *malt inn i bildet*,
og da blir hver kroppsdel en firkant i spillet. Hvit bakgrunn fjernes automatisk.

**Tykk mørk kontur er ikke bare stil.** Bakgrunnen fjernes ved å «flyte innover»
fra kanten av bildet, og konturen er det som stopper den. Uten kontur spiser den
seg inn i lyse felter — hvit buk, lyse klør, tenner.

**God luft mellom delene.** Henger to deler sammen, leser verktøyet dem som én.

---

## Delene figuren trenger

Filnavnet er det samme som delnavnet. «fram» er siden som vender mot deg, «bak»
er den bortenfor kroppen — tegn gjerne bak-delene et hakk mørkere, det gir dybde.
`kropp` er bare overkroppen, uten hode, bein og hale.

| Type | Deler, i rekkefølge |
|---|---|
| **Tobeint** (godzilla-aktig) | `kropp` `hode` `hale` `arm-fram` `arm-bak` `bein-fram` `bein-bak` |
| **Firbeint** (øgle) | `kropp` `hode` `hale` `bein-fram` `bein-bak` `arm-fram` `arm-bak` |
| **Flygende** (drage) | `kropp` `hode` `hale` `vinge-fram` `vinge-bak` `bein-fram` `bein-bak` |
| **Klump** (troll, stein) | `kropp` `hode` `arm-fram` `arm-bak` `bein-fram` `bein-bak` |

På en firbeint er `arm-fram` og `arm-bak` frambeina.

---

## Ferdige oppskrifter — ett monster per blokk

Lim inn malen over, med feltene fylt ut som her. Mappa står i overskriften.

### 🌑 Skyggedragen → `art/monstre/skyggedrage`

> **FIGUR:** en skyggedrage — en slank, uhyggelig drage som virker halvveis laget
> av røyk. Tynn kropp, lange vinger med frynsete kant, glødende øyne.
> **FARGER:** mørk lilla #4c2a8f, lys lilla #8b5cf6, glødende fiolett #c9a3ff,
> nesten svart #1a1030.
> **DELENE:** kropp, hode, hale, vinge-fram, vinge-bak, bein-fram, bein-bak

### 🦖 Godzaur → `art/monstre/godzaur` *(sjef, nivå 1)*

> **FIGUR:** en diger grønn kjempeøgle i godzilla-stil. Tung overkropp, kraftige
> bakbein, små framlabber, takkete rygg­pigger, bred kjeve med tenner.
> Skal se mektig ut, men ikke skummel — dette er første sjefen.
> **FARGER:** mørk grønn #23512d, gressgrønn #4f8f5a, lys grønn #7dc98a,
> beige buk #d9d2ae.
> **DELENE:** kropp, hode, hale, arm-fram, arm-bak, bein-fram, bein-bak

### 🐉 Røddragen → `art/monstre/roddrage` *(sjef, nivå 2)*

> **FIGUR:** en rasende rød flygedrage med enormt vingespenn, horn bakover og
> ild som ulmer i halsen.
> **FARGER:** dyp rød #8c1c14, ildrød #e04b3a, oransje glød #ff9a3d,
> mørk beinhvit #e8dcc0.
> **DELENE:** kropp, hode, hale, vinge-fram, vinge-bak, bein-fram, bein-bak

### 🐍 Hydra → `art/monstre/hydra` *(sjef, nivå 3)*

> **FIGUR:** en hydra — en tung, grønnblå slangekropp med **tre hals­er og tre
> hoder** som vokser ut fra samme sted. *Tegn alle tre hodene med halsene sine
> som ÉN samlet del*, så de henger sammen.
> **FARGER:** mørk sjøgrønn #1a6b4d, jadegrønn #3fb98a, lys mynte #8ef0c0,
> gulhvit buk #e6e2b8.
> **DELENE:** kropp, hode, hale, arm-fram, arm-bak, bein-fram, bein-bak

### ❄️ Frostdragen → `art/monstre/frostdragen` *(sjef, nivå 4)*

> **FIGUR:** en isdrage av frosset krystall. Skarpe iskanter langs ryggen,
> gjennomskinnelige vinger som knust is, frostrøyk rundt seg.
> **FARGER:** dyp isblå #256f8a, lys isblå #7fd8f0, nesten hvit #dff4ff,
> krystallhvit #ffffff *(husk mørk kontur rundt de hvite feltene)*.
> **DELENE:** kropp, hode, hale, vinge-fram, vinge-bak, bein-fram, bein-bak

### 🗿 Kolossen → `art/monstre/kolossen` *(sjef, nivå 5)*

> **FIGUR:** en diger steinkjempe av brune klippeblokker, mosegrodd på oversiden,
> med glødende oransje sprekker mellom steinene. Små bein, enorme armer og never.
> **FARGER:** mørk brun #5a3624, steinbrun #a06a4a, lys sandstein #d6b08a,
> mose #4a8c39, glødende oransje #ffb02e.
> **DELENE:** kropp, hode, arm-fram, arm-bak, bein-fram, bein-bak

### 👑 Kongedragen → `art/monstre/kongedragen` *(sjef, nivå 6, siste)*

> **FIGUR:** den siste sjefen — en gyllen dragekonge med krone av horn, tung
> pansret kropp, arr etter mange kamper. Skal se ut som den mektigste i spillet.
> **FARGER:** mørk gullbrun #8a520c, gull #f0a63c, lys gull #ffd98a,
> dyp rød #8c1c14 som kontrast.
> **DELENE:** kropp, hode, hale, arm-fram, arm-bak, bein-fram, bein-bak

---

## Når bildene er ferdige

1. **Ett ark?** `node verktoy/del-opp.js ark/<navn>.png art/monstre/<navn> <delnavn i rekkefølge>`
   Sjekk `ark-oversikt.png` at delene fikk riktig navn.
   **Én og én PNG?** Legg dem rett i `art/monstre/<navn>/`.
2. Ha `node serve.js` i gang — den fjerner bakgrunn, beskjærer og krymper
   automatisk, og legger originalene i `art/original/`.
3. Åpne `verktoy/rigger.html`, dra delene på plass, sett leddene, og trykk
   **Last ned rigg.json**. Legg fila i samme mappe.

Ser du en gul advarsel i riggverkstedet om at bakgrunnen ligger igjen, er bildet
laget med rutemønster — be om hvit bakgrunn og prøv på nytt.

---

## Ting som ofte går galt

| Det skjer | Si dette til AI-en |
|---|---|
| Grått rutemønster i bakgrunnen | «Ensfarget **hvit** bakgrunn. Ikke tegn et rutemønster.» |
| To deler henger sammen etter oppdeling | «Mer luft mellom delene, de må ikke berøre hverandre.» |
| Hele figuren er tegnet i stedet for deler | «Bare løse kroppsdeler, ingen samlet figur.» |
| Delen henger fortsatt på kroppen | «Delen skal være løsrevet, som om den er tatt av figuren.» |
| Skygge på bakken under delene | «Ingen skygge, ingen bakke, ingen grunnflate.» |
| Delene er avkuttet av bildekanten | «Ha luft rundt alle delene, ingen skal berøre kanten.» |
| Stilen driver mellom delene | Be om alle delene i **ett** bilde. |
| Figuren ser mot venstre | «Alt sett fra siden, vendt mot **høyre**.» |
| Lyse felter blir spist opp i spillet | «Tykk mørk kontur **hele veien rundt**, også rundt hvite felter.» |

---

## Klare kall — kopier og lim inn

Ett kall per monster. Etterpå deler du arket opp med kommandoen under hvert av
dem. Rekkefølgen på delnavnene MÅ stemme med rekkefølgen i prompten.

To ting er lagt inn her som sparte mye etterarbeid på skyggedragen:
**kroppen skal ha halsåpningen til HØYRE og haleflekken til VENSTRE**, og
**halen skal være tykk til høyre og smalne mot venstre**. Da peker alt riktig
vei med en gang, og du slipper å speilvende i riggverkstedet.

### 🦖 Godzaur — sjef, nivå 1

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SEVEN separate body parts of one giant green kaiju lizard, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE CREATURE: a hulking godzilla-like kaiju - heavy chest, thick legs, small clawed arms, jagged plates down the spine, broad jaw with blunt teeth. Powerful and impressive but not frightening, this is the first boss a child meets. Colours: dark green #23512d, grass green #4f8f5a, light green #7dc98a, pale beige belly #d9d2ae. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no head no limbs no tail, with the neck opening at its RIGHT end and the tail socket at its LEFT end, 2 head with neck facing RIGHT, 3 full tail thick at its RIGHT end and tapering to the tip at the LEFT, 4 near small clawed arm with shoulder joint at top, 5 far small clawed arm slightly darker, 6 near hind leg with clawed foot and hip joint at top, 7 far hind leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around any light areas. No assembled creature, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/godzaur.png art/monstre/godzaur kropp hode hale arm-fram arm-bak bein-fram bein-bak
```

### 🐉 Røddragen — sjef, nivå 2

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SEVEN separate body parts of one furious red flying dragon, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE DRAGON: a furious red dragon with a huge wingspan, horns swept back, and fire glowing in its throat. Colours: deep red #8c1c14, fire red #e04b3a, orange glow #ff9a3d, dark bone white #e8dcc0. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no head no limbs no wings no tail, with the neck opening at its RIGHT end and the tail socket at its LEFT end, 2 head with neck facing RIGHT, 3 full tail thick at its RIGHT end and tapering to the tip at the LEFT, 4 near wing spread open with the shoulder end at the RIGHT and the membrane spreading up and to the LEFT, 5 far wing same shape slightly darker, 6 near hind leg with clawed foot and hip joint at top, 7 far hind leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around any light areas. No assembled dragon, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/roddrage.png art/monstre/roddrage kropp hode hale vinge-fram vinge-bak bein-fram bein-bak
```

### 🐍 Hydra — sjef, nivå 3

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SEVEN separate body parts of one three-headed hydra, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE CREATURE: a heavy green-teal serpent beast with three snake heads on long necks, scaly hide and a pale belly. Colours: dark sea green #1a6b4d, jade green #3fb98a, light mint #8ef0c0, yellow-white belly #e6e2b8. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no heads no limbs no tail, with the neck opening at its RIGHT end and the tail socket at its LEFT end, 2 ALL THREE heads together with their three necks joined at one shared base, drawn as ONE single connected piece facing RIGHT, 3 full tail thick at its RIGHT end and tapering to the tip at the LEFT, 4 near clawed arm with shoulder joint at top, 5 far clawed arm slightly darker, 6 near hind leg with clawed foot and hip joint at top, 7 far hind leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. The three heads must stay joined to each other as one single piece, but must not touch any other part. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around any light areas. No assembled creature, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/hydra.png art/monstre/hydra kropp hode hale arm-fram arm-bak bein-fram bein-bak
```

### ❄️ Frostdragen — sjef, nivå 4

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SEVEN separate body parts of one ice crystal dragon, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE DRAGON: a dragon made of frozen crystal, sharp ice shards along its spine, translucent wings like cracked ice, frost haze around it. Colours: deep ice blue #256f8a, light ice blue #7fd8f0, almost white #dff4ff, crystal white #ffffff. IMPORTANT: this creature is very pale, so every part needs a strong dark navy outline all the way around, so that the white areas are clearly enclosed. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no head no limbs no wings no tail, with the neck opening at its RIGHT end and the tail socket at its LEFT end, 2 head with neck facing RIGHT, 3 full tail thick at its RIGHT end and tapering to the tip at the LEFT, 4 near wing spread open with the shoulder end at the RIGHT and the membrane spreading up and to the LEFT, 5 far wing same shape slightly darker, 6 near hind leg with clawed foot and hip joint at top, 7 far hind leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around every white and pale area. No assembled dragon, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/frostdragen.png art/monstre/frostdragen kropp hode hale vinge-fram vinge-bak bein-fram bein-bak
```

### 🗿 Kolossen — sjef, nivå 5

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SIX separate body parts of one giant stone golem, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE CREATURE: a massive golem built from brown rock slabs, moss growing on the upper surfaces, glowing orange cracks between the stones. Tiny legs, enormous arms and fists, a blocky head with a heavy brow and glowing eyes. Colours: dark brown #5a3624, stone brown #a06a4a, light sandstone #d6b08a, moss green #4a8c39, glowing orange #ffb02e. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no head no limbs, 2 head facing RIGHT with the neck stump at the bottom, 3 near huge arm with massive fist and shoulder joint at top, 4 far huge arm slightly darker, 5 near short thick leg with wide stone foot and hip joint at top, 6 far short thick leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around any light areas. No assembled creature, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/kolossen.png art/monstre/kolossen kropp hode arm-fram arm-bak bein-fram bein-bak
```

### 👑 Kongedragen — sjef, nivå 6, siste

```
GetImageGeneration(size = square, description = Character parts sheet for a 2D side-scroller game: SEVEN separate body parts of one golden dragon king, laid out well apart from each other on a PLAIN WHITE background. Polished cartoon 2D game art, thick dark-navy outline all the way around every part, flat cel shading, light from upper left. THE DRAGON KING: the final boss - a golden armoured dragon with a crown of horns, a heavy plated body and old battle scars, radiating power. It should look like the mightiest creature in the game. Colours: dark gold brown #8a520c, gold #f0a63c, light gold #ffd98a, deep red #8c1c14 as accent. LAY OUT IN THIS ORDER, left to right, top row first: 1 torso only with no head no limbs no tail, heavily armoured, with the neck opening at its RIGHT end and the tail socket at its LEFT end, 2 head with a crown of horns and neck facing RIGHT, 3 full tail thick at its RIGHT end and tapering to the tip at the LEFT, 4 near powerful clawed arm with shoulder joint at top, 5 far clawed arm slightly darker, 6 near hind leg with clawed foot and hip joint at top, 7 far hind leg slightly darker for depth. RULES: PLAIN WHITE background - not a checkerboard, not transparent, no gradient. Wide clear gaps between the parts, nothing touching or overlapping. Every part detached as if taken off the figure, with a clean rounded stump where it attaches. All parts in side view facing RIGHT. Thick dark outline completely around every part including around any light areas. No assembled dragon, no background scenery, no ground, no shadow under the parts, no text, labels, numbers, grid, guides, frames or watermark. Leave margin around everything - no part may touch the image edge.)
```

```bash
node verktoy/del-opp.js ark/kongedragen.png art/monstre/kongedragen kropp hode hale arm-fram arm-bak bein-fram bein-bak
```

---

Blir en del ufullstendig, som vingen på skyggedragen, kan du lage den av
motparten i stedet for å be om et nytt bilde:

```bash
node verktoy/lag-bakside.js art/monstre/<navn>/vinge-fram.png art/monstre/<navn>/vinge-bak.png 0.55
```
