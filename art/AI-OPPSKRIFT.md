# 🤖 Oppskrift til bilde-AI-en

Denne fila er skrevet for å limes rett inn til AI-en som lager bildene.
Du trenger **ikke** sende med `LES-MEG.md` eller `mal-tobeint.png` — malen hører
til den gamle måten, der alle delene måtte ligge på samme lerret. Nå plasserer
du delene i `verktoy/rigger.html`, og da spiller det ingen rolle hvor stor delen
er eller hvor i bildet den ligger.

---

## Det viktigste

**Én kroppsdel per bilde.** Ikke be om hele figuren og ikke flere deler i samme
bilde. Spør om én og én del, i samme samtale, så AI-en husker stilen.

**Be om hvit bakgrunn — ikke «transparent».** Bildegeneratorer klarer nesten
aldri ekte gjennomsiktighet. Ber du om det, får du et grått rutemønster
*malt inn i bildet*, og da blir hver kroppsdel en firkant i spillet.
Be heller om **ensfarget hvit bakgrunn**, så fjerner `serve.js` den automatisk.

**Krev tykk mørk kontur hele veien rundt.** Det er ikke bare stil: bakgrunnen
fjernes ved å «flyte innover» fra kanten av bildet, og konturen er det som
stopper den. Uten kontur spiser den seg inn i lyse felter — hvit buk, lyse
klør, tenner.

---

## Ferdig mal — bytt ut det som står i «hakeparentes»

> Jeg lager en 2D-sidescroller og trenger kroppsdeler som settes sammen i
> spillet. Tegn **én kroppsdel om gangen**, som jeg ber om.
>
> **FIGUR:** [navn og kort beskrivelse, f.eks. «en skyggedrage — en slank,
> flygende drage i mørk lilla med glødende fiolette øyne og røyk rundt vingene»]
>
> **STIL:** tegneseriestil til et spill. Tykk mørk kontur rundt hele delen,
> flate farger med enkel skyggelegging, lyset kommer ovenfra og fra venstre.
> Rene former, tydelig silhuett, ingen fotorealisme.
>
> **FARGER:** [f.eks. «mørk lilla #4c2a8f, lys lilla #8b5cf6, glødende fiolett
> #c9a3ff, beinhvit #f0e6d2»]
>
> **REGLER — gjelder hver eneste del:**
> 1. Bare **én** kroppsdel i bildet. Ingen andre kroppsdeler, ingen hel figur.
> 2. **Ensfarget hvit bakgrunn.** Ikke rutemønster, ikke gjennomsiktig, ikke
>    skygge på bakken, ikke bakgrunnsmotiv, ikke ramme.
> 3. **Tykk mørk kontur hele veien rundt** delen.
> 4. **Sett fra siden, vendt mot høyre.** Ikke skrått forfra.
> 5. Delen skal være **hel og fri**, som om den er tatt av figuren. Enden som
>    skal festes (skulder, hofte, hals, vingerot) skal være en ren, avrundet
>    ende — ikke utflytende, ikke avkuttet av bildekanten.
> 6. **Litt luft rundt delen.** Den skal ikke berøre bildekanten.
> 7. Samme stil, samme farger og samme lysretning som de forrige delene.
>
> **Første del:** tegn **kroppen** (overkroppen uten hode, armer og bein).

Så fortsetter du i samme samtale:

> Bra. Tegn nå **hodet**, i nøyaktig samme stil, farger og lyssetting som
> kroppen. Sett fra siden, vendt mot høyre, hvit bakgrunn, tykk mørk kontur.
> Halsen skal være en ren avrundet ende.

…og slik videre gjennom lista under.

---

## Hvilke deler figuren trenger

Filnavnet er det samme som delnavnet, f.eks. `arm-fram.png`.
«fram» er den siden som vender mot deg, «bak» er den bortenfor kroppen —
tegn gjerne bak-delene et hakk mørkere, det gir dybde.

| Type figur | Deler |
|---|---|
| **Tobeint** (godzilla-aktig) | `kropp` `hode` `hale` `arm-fram` `arm-bak` `bein-fram` `bein-bak` |
| **Firbeint** (øgle) | `kropp` `hode` `hale` `bein-fram` `bein-bak` `arm-fram` `arm-bak` |
| **Flygende** (drage) | `kropp` `hode` `hale` `vinge-fram` `vinge-bak` `bein-fram` `bein-bak` |
| **Klump** (troll, stein) | `kropp` `hode` `arm-fram` `arm-bak` `bein-fram` `bein-bak` |

På en firbeint er `arm-fram` og `arm-bak` frambeina.
`kropp` er bare overkroppen — uten hode, bein og hale.

### Hva hver del skal vise

- **kropp** — overkroppen alene. Sett fra siden.
- **hode** — hele hodet med hals, vendt mot høyre.
- **hale** — hele halen. Tykk ende der den festes, spiss ut mot tuppen.
- **arm / bein** — hele lemmet med labb eller klo, fra skulder-/hofteleddet
  og ut. Leddenden øverst.
- **vinge** — hele vingen utslått, vingeroten der den festes.

---

## Ting som ofte går galt

| Det skjer | Si dette til AI-en |
|---|---|
| Grått rutemønster i bakgrunnen | «Ensfarget **hvit** bakgrunn. Ikke tegn et rutemønster.» |
| Flere kroppsdeler i samme bilde | «Bare **én** kroppsdel. Ingen andre deler.» |
| Delen henger fortsatt på kroppen | «Delen skal være løsrevet, som om den er tatt av figuren.» |
| Skygge på bakken under delen | «Ingen skygge, ingen bakke, ingen grunnflate.» |
| Delen er avkuttet av bildekanten | «Ha litt luft rundt delen, den skal ikke berøre kanten.» |
| Neste del har annen stil eller farge | «Nøyaktig samme stil, farger og lysretning som forrige del.» |
| Figuren ser mot venstre | «Sett fra siden, vendt mot **høyre**.» |
| Lyse felter blir spist opp i spillet | «Tykk mørk kontur **hele veien rundt**, også rundt lyse felter.» |

---

## Når bildene er ferdige

1. Legg dem i **`art/monstre/<navn>/`** — navnet må være ett av dem spillet
   kjenner (se tabellen i `LES-MEG.md`). Roboten ligger i `art/robot/`.
2. Ha `node serve.js` i gang. Den fjerner bakgrunnen, beskjærer og krymper
   automatisk, og legger originalene i `art/original/`.
3. Åpne `verktoy/rigger.html`, dra delene på plass, sett leddene, og trykk
   **Last ned rigg.json**. Legg fila i samme mappe.

Ser du en gul advarsel i riggverkstedet om at bakgrunnen ligger igjen, er
bildet laget med rutemønster — be om hvit bakgrunn og prøv på nytt.
