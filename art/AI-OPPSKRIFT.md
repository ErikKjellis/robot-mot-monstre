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
