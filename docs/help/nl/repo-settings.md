---
title: Instellingen per repository
category: Werkomgeving & tools
order: 94
summary: Beschermde branches, info, analytics, geschiedenis en het operatielogboek.
keywords: repo-instellingen settings beschermde branches protected analytics operatielogboek operation log geschiedenis info tandwiel tabafbeelding tab image pictogram logo
---

# Instellingen per repository

Het tandwiel naast de tools in de werkbalk opent instellingen die bij **deze**
repository horen, niet bij de app.

![Instellingen per repository](../../screenshots/repo-settings.webp)

| Tabblad | Wat erin zit |
|---|---|
| **Algemeen** | Beschermde branches (een meervoudige branchkeuze, opgeslagen in de git-config), ondertekenen, de tabafbeelding |
| **Config** | De [regels die deze repository meebrengt](repo-config.md) in `.gitcito.json`, en de doctor die ze controleert |
| **Info** | Vrije notities en velden over deze repository, lokaal bewaard |
| **Kluis** | De [kluis](vault.md)-regels van deze repository |
| **Inzichten** | Het [geschiedenisdashboard](insights.md) |
| **Analytics** | Wat jij in deze repository gedaan hebt, lokaal geteld |
| **Geschiedenis** · **Logs** | Het operatielogboek: elk git-commando dat Gitcito draaide, met de uitvoer |

Het operatielogboek is het eerlijke onderdeel: gedraagt iets zich vreemd, dan
toont het het exacte commando en de exacte fout, zodat een bugmelding feiten kan
dragen in plaats van bijvoeglijke naamwoorden.

## Tabafbeelding

Met tien tabbladen open zijn namen die hetzelfde beginnen — `api`,
`api-gateway`, `api-docs` — lastig uit elkaar te houden. Een kleine
afbeelding op het tabblad vind je sneller dan tekst.

Klik onder **Algemeen** in het afbeeldingsveld. Het toont de afbeeldingen van
de repository zelf — PNG, JPEG, GIF, WebP, SVG, ICO, BMP en AVIF —, elk met een
miniatuur, bestanden die naar een logo of icoon heten eerst. Typ om te filteren
(`logo dark` vindt `assets/logo-dark.png`), beweeg met de pijltjestoetsen en
kies met Enter; of typ zelf een pad. Het pad wordt **relatief aan de root van
de repository** opgeslagen, zodat de afbeelding de repository volgt, waar de
map ook staat.

Wat het tabblad toont, is een keuze voor de hele app, onder **Instellingen →
Algemeen → Repository-tabbladen tonen**:

| Optie | Het tabblad toont |
|---|---|
| **Afbeelding en naam** (standaard) | De afbeelding in plaats van het mappictogram, dan de naam |
| **Alleen naam** | Het mappictogram en de naam, alsof er geen afbeelding is |
| **Alleen afbeelding** | Alleen de afbeelding; de naam verhuist naar de tooltip |

Grenzen om te kennen:

- De lijst bevat de bestanden die git ziet — gevolgd en ongevolgd, geen
  genegeerde — en hoogstens 40 tegelijk; typ om de rest te bereiken. Een
  genegeerde afbeelding kun je nog steeds zelf intypen.
- Afbeeldingen boven 1 MB, of onleesbare, zijn grijs en niet te kiezen: een
  pictogram van 20 pixels heeft niet meer nodig.
- Een repository **zonder** afbeelding toont altijd de naam, welke optie ook
  gekozen is — een leeg tabblad zou niet te herkennen zijn.
- Is het pad **kapot** — bestand verwijderd, hernoemd, geen afbeelding of te
  groot —, dan valt het tabblad stil terug op de naam en toont deze
  instellingenpagina een waarschuwing onder het pad. Verder klaagt niets.
- De afbeelding wordt eens per sessie gelezen. Vervang je het bestand onder
  dezelfde naam, open deze instellingenpagina dan opnieuw om te herladen.
- De instelling staat in Gitcito’s eigen instellingen op deze computer, niet in
  de repository, dus teamgenoten erven haar niet.

**Zie ook:** [Beveiliging & geheimen](security.md) · [Inzichten](insights.md)
