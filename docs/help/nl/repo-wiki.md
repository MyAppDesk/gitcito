---
title: Repo-wiki (AI)
category: AI
order: 81
summary: Een gegenereerde gids voor een codebase waarin elke bewering een bestand aanhaalt.
keywords: wiki documentatie gegenereerd codebase overzicht dependencies architectuur export docs
---

# Repo-wiki

Wijs hem naar een repository en hij schrijft een korte wiki die de codebase
uitlegt.

## De repokaart

- **Taalverdeling** naar bytes.
- **De stack** — frameworks getoond als badges (Next, Angular, Electron,
  Tailwind, Django…).
- **Dependencies** rechtstreeks gelezen uit je manifesten (`package.json`,
  `Cargo.toml`, `go.mod`, `pyproject.toml`, `pubspec.yaml`, `Gemfile`…) en
  gegroepeerd naar architecturale rol. Steigerwerk — typestubs, loaders,
  lint-plug-ins — wordt er eerst uitgefilterd, en alleen packages die het project
  werkelijk declareert kunnen opduiken.
- **Een moduleafhankelijkheidsgrafiek**, geparseerd uit de broncode (JS/TS,
  Python, Go, Rust, Dart, Ruby, C/C++, PHP) en opgelost tegen de eigen bestanden
  van de repo, zodat een package-import nooit een nepverbinding wordt.

## De geschreven pagina's

Gitcito plant een handvol pagina's op basis van de bestanden die de repository
trackt — documentatie en manifesten eerst, daarna wat het meest verandert — en
schrijft elke pagina uit de bestanden die ze beslaat.

**Elke uitspraak haalt het bestand aan waar hij vandaan komt**, en een bewering
die geen enkel bestand ondersteunt wordt afgewezen in plaats van gepubliceerd.
Pagina's worden parallel geschreven en in één keer opgeslagen, zodat een
mislukte run nooit een goede wiki vervangt. Het vertelt je wanneer de wiki bij
een oudere commit geschreven is.

## Exporteren

**Exporteren naar docs/** schrijft het geheel weg in `docs/wiki/` als gelinkte
Markdown — zodat het gecommit kan worden, in een PR gereviewd, en op je host
gelezen.

Bestanden die naar geheimen ruiken worden nooit verstuurd.

**Zie ook:** [AI-functies](ai.md)
