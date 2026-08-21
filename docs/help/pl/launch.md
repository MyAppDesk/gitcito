---
title: Uruchamianie i debugowanie (launch.json)
category: Narzędzia środowiska pracy
order: 91
summary: Uruchamiaj swoje konfiguracje launch z VS Code bez opuszczania Gitcito.
keywords: launch.json uruchom debuguj vscode konfiguracje zadania preLaunchTask input background run debug configs tasks compound compounds stopAll serverReadyAction równoległe sesje
---

# Uruchamianie i debugowanie

Gitcito czyta twój `.vscode/launch.json` — ten z korzenia oraz wszystkie
zagnieżdżone, pogrupowane separatorami — i uruchamia wybraną przez ciebie
konfigurację we wbudowanym terminalu.

![Wybór konfiguracji uruchamiania i pływający pasek narzędzi](../../screenshots/launch-configs.webp)

- **Zmienne VS Code są rozwiązywane** (`${workspaceFolder}` i spółka).
- **`preLaunchTask`** danej konfiguracji uruchamia się jako pierwsze.
- Wartości **`${input:…}`** są odpytywane interaktywnie przed uruchomieniem
  (`promptString` i `pickString`).
  `pickString` pokazuje opcje jako prawdziwy wybierak z zaznaczoną wartością
  domyślną; `promptString` oznaczony `password` jest maskowany.
- Zadania **`isBackground`** (watchery, serwery deweloperskie) działają
  odczepione, więc nigdy nie blokują uruchomienia.
- **Compoundy** uruchamiają każdego członka jako **osobną równoległą sesję**,
  w jednym podzielonym terminalu o nazwie compoundu — jeden panel na członka,
  dokładnie jak sesje debugowania w VS Code. Z `stopAll: true` zatrzymanie
  jednego członka zatrzymuje wszystkie.
  Zadania wspólne dla kilku członków uruchamiają się **raz**, we własnym
  panelu, zanim wystartują członkowie — prompt podbicia wersji pyta raz, a nie
  raz na członka.
  Ten panel zamyka się sam po sukcesie, a przy błędzie zostaje otwarty.
- **`serverReadyAction`** jest honorowane: gdy wyjście sesji pasuje do
  skonfigurowanego wzorca, ogłoszony URL otwiera się w przeglądarce
  (`openExternally`; `debugWithChrome` / `debugWithEdge` również otwierają
  przeglądarkę — Gitcito nie może podłączyć do niej debugera).

![Compound uruchamiający dwie równoległe sesje](../../screenshots/launch-compound.webp)

![Wybierak ${input} z zaznaczoną wartością domyślną](../../screenshots/launch-input.webp)

Pływający pasek narzędzi daje ci **pauzę / wznowienie, restart, zatrzymanie**
i przełącza między działającymi sesjami.

Włącz to w **Ustawienia → Ogólne → Włącz launch.json**. Przycisk **LAUNCH**
pojawia się obok zakładek Git / Pliki.

Członek compoundu wyświetla się jako *compound › członek*, a jego restart
restartuje tylko tego członka.
Jeśli pasek zasłania coś, czego potrzebujesz, przeciągnij go w bok za uchwyt —
pozycja jest zapamiętywana, a podwójne kliknięcie uchwytu ponownie go
wyśrodkowuje.

Czego Gitcito celowo **nie** robi: uruchamia programy w prawdziwych
terminalach, ale nie jest debugerem — bez breakpointów, bez podglądu
zmiennych, bez Debug Adapter Protocol. Konfiguracje typu attach działają, gdy
niosą `preLaunchTask` (zadanie jest pracą); czysty attach nie ma nic do
uruchomienia.

**Zobacz też:** [Wbudowany terminal](terminal.md)
