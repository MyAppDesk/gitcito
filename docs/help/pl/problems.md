---
title: Problemy
category: Narzędzia przestrzeni roboczej
order: 92
summary: Co mówią analizatory twojego projektu i którą część spowodował twój diff.
keywords: problemy analizator diagnostyka błędy ostrzeżenia lint tsc typescript eslint dart analyze clippy cargo go vet ruff panel zmienione pliki
---

# Problemy

Każdy projekt ma już narzędzie, które powie, co jest z nim nie tak — `tsc`,
`dart analyze`, ESLint, Clippy, `go vet`, Ruff. Żadne z nich nie powie, czy to
**twój** diff dołożył czterdzieści ostrzeżeń, które właśnie wypisało. Gitcito
wie, które pliki są brudne, więc ta sama lista odpowiada na to jednym
przełącznikiem.

![Panel Problemy i licznik na pasku stanu](../../screenshots/problems.webp)

Pasek stanu niesie licznik — błędy, ostrzeżenia, informacje: trzy liczby, których
czytania VS Code nauczył wszystkich. Kliknij (albo **Problemy** w palecie
poleceń), a panel otworzy się na dole, pogrupowany po plikach. Kliknięcie wiersza
otwiera plik w tym miejscu. Przed pierwszym przebiegiem pokazuje myślniki zamiast zer: nikt jeszcze nie patrzył, a trzy zera twierdziłyby co innego.

## Co uruchamia

| Jeśli repozytorium ma | Gitcito uruchamia |
|-----------------------|-------------------|
| `pubspec.yaml` | `dart analyze --format=machine` |
| `tsconfig.json` | `tsc --noEmit` |
| konfigurację ESLint | `eslint -f json` |
| `Cargo.toml` | `cargo clippy --message-format=short` |
| `go.mod` | `go vet ./...` |
| `pyproject.toml` lub `ruff.toml` | `ruff check --output-format=json` |

**Flutter mieści się w wierszu Darta:** aplikacja Flutter to projekt Dart, a
`flutter analyze` woła ten sam analizator co `dart analyze`.

**Projekt nie musi leżeć w katalogu głównym.** Te znaczniki są szukane także
kilka poziomów niżej, więc aplikacja Flutter w `mobile/` albo pakiet w
`apps/web` zostanie znaleziony, a każdy analizator uruchomi się w katalogu
własnego projektu. Zagnieżdżony projekt tego samego rodzaju jest pomijany, gdy
przodek już go obejmuje — dokładnie to mówi `tsconfig.json` w katalogu głównym —
a przebieg zatrzymuje się na dwunastu projektach, bo monorepo nie powinno
uruchamiać pięćdziesięciu kompilatorów.

Binarka z `node_modules/.bin` wygrywa z tą z PATH — dokładnie tak, jak rozwiązują
to skrypty projektu. Wszystko biegnie równolegle, a wyjście każdego narzędzia
trafia do jednej postaci, bez duplikatów i posortowane: dwa analizatory
zgłaszające ten sam wiersz dają jeden wiersz.

**Nic nie startuje samo.** `tsc --noEmit` w dużym repozytorium to dziesiątki
sekund, a te polecenia to łańcuch narzędzi repozytorium, nie Gitcito. Ruszają,
gdy otworzysz panel albo naciśniesz odświeżenie — nigdy z własnej woli. Dlatego
lista jest zdjęciem chwili: zmień plik, a będzie nieaktualna do kolejnego
uruchomienia.

**Wynik builda odpada.** Narzędzie wycelowane w katalog główny projektu sprawdza
wszystko, co znajdzie, a znajduje też `.next/build/chunks`, spakowany `dist`,
wciągniętą kopię — setki uwag o kodzie napisanym przez maszynę, które zasypują tę
garstkę o twoim. Gitcito pyta gita, które pliki są ignorowane, i te odrzuca, ale
nigdy pliku *śledzonego*: commitowanie wyniku builda to decyzja, którą
`git check-ignore` szanuje. `node_modules` leci tak czy siak.

## Tylko to, co zmieniłeś

Przełącznik w nagłówku odrzuca każdy problem w pliku, którego nie tknąłeś. To
widok, który warto trzymać otwarty: płaska lista wszystkich ostrzeżeń w kodzie w
tydzień staje się tapetą, a "czy dołożył je ten diff" to pytanie, na które warto
odpowiedzieć przed commitem.

Plakietki ważności też filtrują. Zgaszone znaczą *pokaż wszystko*; zapalenie
jednej zawęża do niej.

## Ograniczenia

- **Bez serwera języka.** To przebieg, nie demon: żadnych falek w trakcie
  pisania, żadnych wyników, zanim poprosisz.
- **Brakujące narzędzie jest nazwane, nie ukryte.** Stopka mówi, czego nie dało
  się uruchomić, bo pusta lista bez wyjaśnienia jest gorsza niż krótka z
  powodem.
- **Rozumiane jest tylko wyjście maszynowe.** Każdy analizator czytany jest z
  udokumentowanego formatu maszynowego; narzędzie ustawione na coś innego jest
  tu niewidoczne.
- **Pięć tysięcy problemów to limit.** Powyżej panel to mówi i przestaje —
  repozytorium w takim stanie ma większy problem niż pasek przewijania.

**Zobacz też:** [Lokalne CI](local-ci.md) · [Wbudowany terminal](terminal.md)
