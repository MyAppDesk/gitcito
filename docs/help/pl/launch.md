---
title: Uruchamianie i debugowanie (launch.json)
category: Narzędzia środowiska pracy
order: 91
summary: Uruchamiaj swoje konfiguracje launch z VS Code bez opuszczania Gitcito.
keywords: launch.json uruchom debuguj vscode konfiguracje zadania preLaunchTask input background run debug configs tasks compound compounds stopAll serverReadyAction równoległe sesje hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
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

## Akcje na gorąco — szybka ścieżka obok Uruchom ponownie

![Hot reload wysłany z paska debugowania](../../screenshots/launch-hot.webp)

Większość środowisk deweloperskich przeładowuje się jednym klawiszem:
`flutter run` na **r**, Metro na **r**, nodemon na **rs ⏎**, a Vitest uruchamia
zestaw ponownie na **a**. Restart konfiguracji uruchamiania, żeby osiągnąć to
samo, to droga wolna — zabija proces, uruchamia ponownie każdy `preLaunchTask` i
wyrzuca stan aplikacji.

Dlatego Gitcito czyta polecenie, które konfiguracja naprawdę uruchamia — idąc za
`npm run dev` aż do skryptów w twoim `package.json` — i umieszcza klawisze tego
środowiska na pasku debugowania. Naciśnięcie zapisuje klawisz na standardowe
wejście sesji, dokładnie tak, jakbyś wpisał go w terminalu.

| Środowisko | Przyciski | Za ⋯ |
|------------|-----------|------|
| Flutter (`flutter run`) | Hot reload `r`, hot restart `R` | debug paint, nakładka wydajności, zmiana platformy, DevTools |
| Expo | Przeładuj `r` | menu programisty, debugger |
| Metro / React Native | Przeładuj `r` | menu programisty, debugger |
| Vite (dev, serve, preview) | Uruchom serwer ponownie `r ⏎` | otwórz w przeglądarce, pokaż adresy, wyczyść konsolę |
| nodemon | Uruchom ponownie `rs ⏎` | — |
| Vitest (tryb watch) | Wszystkie ponownie `a`, nieudane ponownie `f` | zaktualizuj snapshoty |
| Jest (`--watch`) | Wszystkie ponownie `a`, nieudane ponownie `f` | tylko zmienione pliki, zaktualizuj snapshoty |
| Mocha (`--watch`) | Uruchom ponownie `rs ⏎` | — |
| AVA (`--watch`) | Wszystkie ponownie `r ⏎`, zaktualizuj snapshoty `u ⏎` | — |
| `dotnet watch` | Wymuś restart `Ctrl+R` | — |
| Wrangler (`wrangler dev`) | Otwórz w przeglądarce `b` | DevTools, lokalnie/zdalnie, wyczyść konsolę |

Środowiska, które przeładowują się same, nie dostają przycisków — `node --watch`,
`ng serve`, `tsc --watch`, `cargo watch`, `next dev`, webpack-dev-server.
Przycisk wysyłający klawisz, którego nikt nie czyta, jest gorszy niż brak
przycisku, bo wygląda, jakby zadziałał.

**Ograniczenia.** Wykrywanie jest tekstowe: dopasowuje nazwę programu w linii
poleceń, więc konfiguracja, która startuje serwer przez skrypt opakowujący,
którego Gitcito nie potrafi odczytać, nie dostanie nic. Nie ma też potwierdzenia
— przycisk mignie, a prawdziwą odpowiedzią jest wyjście samego procesu. Sesja
wstrzymana lub zakończona nie przyjmuje wejścia, więc przyciski są wyszarzone.

**Gdy zgadywanie zawodzi**, powiedz to w samej konfiguracji:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` jest zapisywane dosłownie — zakończ je `\n` dla CLI czekającego na Enter.
`icon` jest opcjonalne: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`.
Pusta tablica `hotActions` wyłącza przyciski dla tej konfiguracji.

## Cel uruchomienia — na jakim urządzeniu startuje konfiguracja

![Wybór celu obok zakładki LAUNCH](../../screenshots/launch-device.webp)

Konfiguracji, która buduje aplikację mobilną, trzeba powiedzieć, gdzie ma ją
uruchomić. Ten wybór nie należy tylko do Fluttera — React Native, Expo,
Capacitor i xcodebuild też przyjmują cel, każdy zapisywany inaczej. Dlatego
Gitcito pyta raz, obok zakładki **LAUNCH**, i zapisuje odpowiedź w formie, którą
czyta środowisko tej konfiguracji. Selektor pojawia się tylko wtedy, gdy któraś
konfiguracja w repozytorium faktycznie przyjmuje urządzenie.

**Skąd bierze się lista** — z tych narzędzi SDK, które są na maszynie, pytanych
równolegle:

| Narzędzie | Dostarcza | Pytane |
|-----------|-----------|--------|
| `flutter devices` / `flutter emulators` | wszystko, już znormalizowane | gdy folder ma `pubspec.yaml` |
| `xcrun simctl` | symulatory iOS, uruchomione i zimne | na macOS |
| `adb devices` | telefony Android i uruchomione emulatory | zawsze |
| `emulator -list-avds` | wciąż zimne emulatory Androida | zawsze |

Ten sam symulator zgłaszają nawet trzy z nich, więc wpisy są łączone po
platformie i nazwie; przy remisie wygrywa Flutter, bo jego id jest tym, którego
oczekuje `flutter run -d`. Niezainstalowane narzędzia wymieniamy na dole menu —
krótka lista powinna sama się tłumaczyć.

**Co robi wybór:**

| Rodzina | Zapisywane jako |
|---------|-----------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| wszystko inne | tylko środowisko |

Każda uruchomiona konfiguracja dostaje też `GITCITO_DEVICE_ID`,
`GITCITO_DEVICE_NAME` i `GITCITO_DEVICE_PLATFORM` w środowisku, a przy prawdziwym
urządzeniu z Androidem również `ANDROID_SERIAL`. To właśnie pozwala skryptowi
opakowującemu, zadaniu Gradle albo gołemu `adb` trafić w ten sam telefon, bez
przepisywania czegokolwiek przez Gitcito.

**Uruchamianie zimnego urządzenia.** Wszystko pod *Nieuruchomione* startuje po
wybraniu: `flutter emulators --launch`, `xcrun simctl boot` (plus okno
Simulatora) albo odłączony `emulator -avd` — dzięki temu zamknięcie Gitcito nie
zabiera ze sobą twojego emulatora Androida.

**Ograniczenia.** Konfiguracja, która już nazywa urządzenie — jawne `-d`,
`--simulator`, `deviceId` z Dart-Code — zostaje nietknięta: selektor nigdy nie
nadpisuje tego, co napisał autor. Id, które wymagałoby cudzysłowów, trafia do
środowiska, zamiast ryzykować zepsutą linię poleceń. Menu jest filtrowane do
tego, co twoje konfiguracje mogą osiągnąć, więc repozytorium tylko z Androidem
nigdy nie zaproponuje ci iPhone’a. A lista to zdjęcie chwili: podłącz telefon i
naciśnij **Odśwież urządzenia**.

Wybór jest pamiętany dla każdego repozytorium i zapominany, gdy urządzenie
przestaje istnieć.

**Zobacz też:** [Wbudowany terminal](terminal.md)
