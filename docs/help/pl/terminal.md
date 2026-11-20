---
title: Wbudowany terminal
category: Narzędzia środowiska pracy
order: 90
summary: Prawdziwy PTY zadokowany pod repozytorium, z kartami na każde repozytorium.
keywords: terminal powłoka pty xterm konsola karty zadokowany shell docked tabs
---

# Wbudowany terminal

Prawdziwy PTY (xterm + node-pty), a nie uruchamiacz poleceń. Twoja powłoka,
twój znak zachęty, twoje aliasy.

![Wbudowany terminal](../../screenshots/terminal.webp)

- **Wiele kart na repozytorium**, każda startująca w katalogu tego
  repozytorium.
- Zadokuj go **pod** grafem albo jako **prawą kolumnę**; panel pamięta swój
  rozmiar.
- Widoczność terminala jest per repozytorium: przełączenie się na kartę, która
  nigdy żadnego nie otworzyła, zostawia go zamkniętym.
- Karty nazywają się same, według tego, co w nich działa.
- Zwinięcie listy terminali kurczy ją do **szyny**: jedna ikona na terminal
  (terminale podzielone pokazują mini mapę paneli), kliknij, żeby przełączyć,
  kliknij prawym po zwyczajowe menu zmiany nazwy/podziału/ubicia.
- **Przeciągnij jeden terminal na drugi** na liście, aby scalić je w podzieloną
  grupę. Każdy terminal zachowuje swoją nazwę jako panel; scalona grupa dostaje
  świeżą numerowaną nazwę.

![Dwa panele podzielone obok siebie w jednej grupie terminali](../../screenshots/terminal-split.webp)

## Klawisze

| Klawisze | Działanie |
|---|---|
| <kbd>⌃`</kbd> | Pokazuje lub ukrywa terminal — fizyczny klawisz Control, na każdej platformie |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Nowy terminal, gdy terminal ma fokus |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Zamyka aktywny terminal; zamknięcie ostatniego ukrywa panel |
| <kbd>Ctrl+Shift+C</kbd> | Kopiuje zaznaczenie; samo <kbd>Ctrl+C</kbd> też kopiuje, dopóki jest zaznaczenie, a bez niego pozostaje SIGINT |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Wkleja ze schowka |
| Prawy przycisk | Kopiuje zaznaczenie albo wkleja, gdy nic nie jest zaznaczone |

Pierwsze dwa celowo działają tylko w terminalu: poza nim nadal otwierają i
zamykają [karty obszaru roboczego](workspaces.md). Na macOS Kopiuj/Wklej z menu
Edycja działają tak samo.

## Podpowiedzi skryptów

Wpisz `npm run ` (albo `pnpm`, `yarn`, `bun run`), a przy kursorze pojawi się
lista skryptów projektu, filtrowana w trakcie pisania: `npm run loc` znajduje
`LOCAL_SERVER`. Każda nazwa pokazuje polecenie, które uruchamia.

| Klawisz | Działanie |
|---------|-----------|
| **Tab** | Uzupełnia wybrany skrypt |
| **↑ / ↓** | Wybór innego |
| **Esc** | Zamyka listę do następnego wpisania |

Inne polecenia mają własną listę:

| Wpisane | Pokazuje | Czytane z |
|-------|--------|---------|
| `composer run ` | Skrypty Composera | najbliższego `composer.json` |
| `make ` | Cele Makefile, z `## tekstem` po celu jako opisem | `Makefile` bieżącego katalogu, tak jak czyta go `make` |
| `git checkout `, `switch`, `merge`, `rebase` | Gałęzie lokalne, potem zdalne po krótkiej nazwie | repozytorium, w którym jest powłoka |

Cel Makefile zbudowany ze zmiennych lub wzorca (`%.o`) się nie pojawia, a
`git checkout -b` nie dostaje listy: nadaje nazwę nowej gałęzi.

Skrypty pochodzą z `package.json` najbliższego **bieżącemu** katalogowi powłoki,
więc po `cd frontend` dostajesz skrypty frontendu. Najpierw nazwy zaczynające się
od wpisanego tekstu, potem te, które go zawierają.

Lista zna tylko klawisze wpisane od ostatniego Entera. Przywołanie polecenia
strzałką ↑, przesunięcie kursora albo użycie Taba samej powłoki zmienia wiersz
poza jej wzrokiem, więc milczy aż do następnego Entera, zamiast uzupełnić coś
błędnie. W Windows bieżącego katalogu nie da się odczytać, więc lista trzyma się
folderu, w którym otwarto terminal.

## Twój PATH

Powłoka startuje jako **powłoka logowania**, tak samo jak w Terminal.app czy
iTermie, więc `~/.zprofile`, `~/.zlogin` i `~/.bash_profile` są wczytywane. To
istotne, bo menedżery wersji i `brew shellenv` zwykle wpisują się właśnie tam —
narzędzie takie jak `fvm`, `nvm` czy `pyenv`, które działa w twoim terminalu,
zadziała też tutaj.

Gitcito przy starcie pyta też twoją powłokę logowania o prawdziwy `PATH` i
scala go we wszystkim, co uruchamia, bo aplikacja graficzna otwarta z Docka nie
dziedziczy prawie niczego. Jeśli mimo to polecenia nie widać, sprawdź, czy jest
w `PATH` powłoki logowania, a nie tylko interaktywnej.

Wszystko, co tutaj uruchomisz, jest niewidoczne dla własnego blokowania
Gitcito, więc długi `git rebase` wpisany ręcznie i kliknięcie w interfejsie
wciąż mogą się zderzyć — aplikacja odświeża się z dysku, gdy terminal coś
zmieni.

## Powłoka, motyw i Oh My Posh

W Windows Ustawienia → Układ wybierają powłokę uruchamianą przez każdy nowy
terminal — PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL albo własny
plik wykonywalny. Wygląd terminala (motyw, rozmiar i rodzina czcionki) jest w
Ustawienia → Motywy → Motyw terminala i działa od razu we wszystkich sesjach.

Jeśli zainstalowano [Oh My Posh](https://ohmyposh.dev), sekcja wymienia też każdy
`*.omp.json` z `%POSH_THEMES_PATH%` z podglądem na żywo — wybrany trafia do
nowych terminali jako `POSH_THEME`, więc zwykłe `oh-my-posh init pwsh` w Twoim
profilu go użyje. Własna ścieżka `.omp.json` też działa; pole ustawione na
Domyślny zachowuje to, co już ustawia powłoka/profil albo globalne `POSH_THEME`.
Otwarte sesje zachowują swój motyw — zamknij i otwórz terminal ponownie, by
zastosować nowy. Glify promptu wymagają Nerd Font w rodzinie czcionki terminala
(np. `CaskaydiaMono Nerd Font`), inaczej ikony wyglądają jak kwadraty.

O szybkości: Oh My Posh uruchamia swój program raz na każdy prompt — w Windows
około 100–200 ms, więcej przy motywach z segmentem git w dużym repozytorium — co
odczuwa się jako krótką pauzę przed każdym promptem, a nie spowolnienie Gitcito.
Najszybsze są motywy bez segmentu git. Liczy się też styl podpowiedzi
PowerShella: `-PredictionViewStyle InlineView` przerysowuje mały obszar przy
każdym klawiszu, a `ListView` cały blok.

**Zobacz też:** [Uruchamianie i debugowanie](launch.md) · [Hooki](hooks.md)
