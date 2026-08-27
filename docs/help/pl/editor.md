---
title: Zewnętrzny edytor
category: Narzędzia środowiska pracy
order: 95
summary: Wyślij repozytorium, plik albo jedną linię kodu do edytora, w którym naprawdę piszesz.
keywords: edytor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode otwórz w edytorze linia kolumna własne polecenie argv
---

# Zewnętrzny edytor

Klient Gita to miejsce, w którym czytasz kod; rzadko jest miejscem, w którym go
naprawiasz. Odległość między zauważeniem problemu w diffie a postawieniem
kursora na tej linii w edytorze to wyszukanie pliku i przewinięcie — za każdym
razem.

Wskaż Gitcito swój edytor raz, a ta odległość znika: kliknij linię prawym
przyciskiem w widoku pliku albo blame, a otworzy się tam, na tej linii.

## Wybieranie

**Ustawienia → Ogólne → Zewnętrzny edytor.** Lista wypisuje edytory, które
Gitcito potrafi znaleźć na tej maszynie — szuka najpierw polecenia każdego
edytora, a potem, na macOS, pakietu aplikacji w `/Applications`
i `~/Applications`. Skanowanie uruchamia się przy każdym otwarciu Ustawień, więc
edytor zainstalowany pięć minut temu pojawia się bez restartu.

Rozpoznawane z pudełka:

| Edytor | Polecenie, którego szuka |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| IDE JetBrains | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## Ograniczenie warte wiedzy

**Skok do linii wymaga polecenia edytora, nie jego ikony.** Pakiet `.app` na
macOS uruchamia się przez `open`, które przyjmuje ścieżkę i nic więcej — więc
edytor znaleziony wyłącznie jako pakiet otwiera plik na początku, a Gitcito mówi
o tym pod listą, zamiast udawać, że jest inaczej.

Naprawa leży po stronie edytora: w VS Code *Shell Command: Install 'code'
command in PATH*, w Sublime dowiązanie `subl`, w JetBrains *Toolbox → Settings →
Shell scripts*. Gdy polecenie zacznie istnieć, wybierz edytor jeszcze raz,
a skok do linii zadziała.

## Gdzie pojawiają się akcje

| Miejsce | Co otwiera |
|---------|---------------|
| Karta repozytorium, repozytorium w panelu bocznym, pasek stanu | Katalog repozytorium |
| Drzewo plików, pliki commita, pliki stasha, kompozytor commita | Ten plik |
| Ikona na końcu wiersza w drzewie plików | Ten plik, jednym kliknięciem |
| Kliknięcie linii prawym przyciskiem w widoku **pliku** | Plik, na tej linii |
| Kliknięcie linii prawym przyciskiem w widoku **blame** | Plik, na tej linii |
| `.xcodeproj` lub inny pakiet w drzewie plików | Pakiet, w aplikacji, która go obsługuje |

Akcje liniowe pojawiają się tylko tam, gdzie numer linii jeszcze coś znaczy:
plik pokazany na starym commicie albo blame przewinięty do wcześniejszej rewizji
ma linie, które już nie odpowiadają temu, co jest na dysku — więc Gitcito nie
oferuje tam skoku, zamiast odesłać cię w złe miejsce.

## Projekty Xcode i inne pakiety

`MyApp.xcodeproj` to katalog. Git o tym wie i drzewo plików też wiedziało —
dopóki nie zaczęło to przeszkadzać: rozwijanie go, żeby znaleźć
`project.pbxproj`, `project.xcworkspace` i po jednym folderze na programistę w
`xcuserdata`, to trzy kliknięcia szumu wokół czegoś, czego i tak nigdy nie
zamierzałeś edytować ręcznie.

Teraz mają ikonę pakietu, a **kliknięcie wiersza otwiera pakiet** — tak jak
dwuklik w Finderze. Strzałka została, więc ten jeden raz, kiedy naprawdę
potrzebujesz `project.pbxproj` — prawie zawsze konflikt scalania — wchodzisz do
środka jak dotąd.

Rozpoznawane: `.xcodeproj`, `.xcworkspace`, `.xcframework`, `.framework`,
`.app`, `.appex`, `.dSYM`, `.playground`, `.xcuserdatad`.

**Nie** rozpoznawane, celowo: `.xcassets` i `.lproj`. To też pakiety, ale pliki w
środku faktycznie się edytuje, więc zwijanie ich kosztowałoby więcej, niż daje.

### Ograniczenia

**Pakiet otwiera system, nie Twój edytor.** `.xcodeproj` podany edytorowi
tekstu otwiera się jako folder pełen property list, czego nikt klikający nie
chciał — więc Gitcito przekazuje go temu, co system z nim kojarzy, czyli na Macu
z Xcode właśnie Xcode'owi. Wybór edytora zostaje nietknięty i nadal rządzi każdym
zwykłym plikiem.

**To konwencja nazw, nie flaga systemu plików.** Gitcito patrzy na rozszerzenie,
więc katalog, który przypadkiem nazwałeś `notes.app`, też się zwinie, a na
Linuksie czy Windowsie — gdzie to zwykłe foldery — kliknięcie otworzy menedżera
plików zamiast IDE.

## Własne polecenie

Wybierz **Własne polecenie** dla czegokolwiek spoza tabeli — skryptu
opakowującego, uruchamiacza zdalnego środowiska, edytora terminalowego
odpalanego przez twój własny shim.

| Pole | Znaczenie |
|-------|---------|
| Polecenie | Program do uruchomienia. Bez powłoki, więc bez `&&`, potoków i globów. |
| Nazwa | Jak nazywają go wpisy w menu. |
| Argumenty dla pliku | Szablon argv, np. `-g {path}:{line}:{col}` |
| Argumenty dla katalogu | Szablon argv, zwykle po prostu `{path}` |

Szablony są dzielone po spacjach, a każdy token podstawiany raz — ścieżka ze
spacją zostaje jednym argumentem i nic nie jest potem parsowane ponownie, więc
nazwa pliku nigdy nie zamieni się w składnię. Cztery symbole zastępcze:
`{path}`, `{line}`, `{col}`, `{repo}`.

Symbol bez wartości zabiera ze sobą swoją flagę: `--line {line} {path}`
uruchomione bez linii staje się samą ścieżką, nigdy zwisającym `--line`, które
zjadłoby nazwę pliku jako swój argument. Szablon bez `{line}` oznacza po prostu,
że Gitcito nie zaproponuje dla tego edytora akcji celujących w linię.

## Czym to nie jest

To nie jest ustawienie [aplikacji „Otwórz za pomocą"](repo-settings.md), które
pokazuje systemowy wybór i pamięta jedną aplikację do otwierania
*czegokolwiek* — obrazu, PDF-a, katalogu w Finderze. Edytor jest bardziej
konkretny z tych dwóch, więc gdy ustawione są oba, na ikonie na końcu wiersza
w drzewie plików wygrywa edytor; oba zostają wypisane w menu kontekstowym.

Gitcito nigdy nie odpala twojego edytora samo z siebie, a zamknięcie Gitcito
nigdy go nie zamyka: edytor jest uruchamiany odczepiony, jako własny proces.
