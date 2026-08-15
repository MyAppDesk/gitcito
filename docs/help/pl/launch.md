---
title: Uruchamianie i debugowanie (launch.json)
category: Narzędzia środowiska pracy
order: 91
summary: Uruchamiaj swoje konfiguracje launch z VS Code bez opuszczania Gitcito.
keywords: launch.json uruchom debuguj vscode konfiguracje zadania preLaunchTask input background run debug configs tasks
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
- Zadania **`isBackground`** (watchery, serwery deweloperskie) działają
  odczepione, więc nigdy nie blokują uruchomienia.

Pływający pasek narzędzi daje ci **pauzę / wznowienie, restart, zatrzymanie**
i przełącza między działającymi sesjami.

Włącz to w **Ustawienia → Ogólne → Włącz launch.json**. Przycisk **LAUNCH**
pojawia się obok zakładek Git / Pliki.

**Zobacz też:** [Wbudowany terminal](terminal.md)
