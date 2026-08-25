---
title: Zasady repozytorium (.gitcito.json)
category: Narzędzia środowiska pracy
order: 98
summary: Zasady domu, które podróżują z repozytorium — chronione gałęzie, zakresy commitów, czego potrzebuje klon i lista przed pushem.
keywords: gitcito.json konfiguracja repozytorium zasady doctor wymagania chronione gałęzie zakresy scopes trailers ticket linki do trackera lista kontrolna onboarding hooksPath node submoduły lfs env example
---

# Zasady repozytorium (`.gitcito.json`)

Każdy projekt niesie zasady, których nie da się wywnioskować z kodu. *Nigdy nie
pushuj wprost na `release/*`.* *Zakresy commitów to `api`, `web` i `infra`, i nic
poza tym.* *Potrzebujesz Node 20, pobranych submodułów i pliku `.env` skopiowanego
z `.env.example`, zanim cokolwiek ruszy.* Takie zasady mieszkają w README,
którego nikt nie czyta ponownie, w błędzie CI albo w głowie osoby, która jest tu
najdłużej.

`.gitcito.json` to miejsce, w którym repozytorium je zapisuje, żeby narzędzie
mogło z nich skorzystać. Leży w katalogu głównym repozytorium, jest wersjonowany
jak każdy inny plik i dlatego podróżuje z klonem: każdy, kto otworzy projekt,
dostaje te same zasady, a nowa osoba dostaje je pierwszego dnia, a nie przy
pierwszym odrzuconym pushu.

Plik jest całkowicie opcjonalny. Repozytorium bez niego zachowuje się dokładnie
tak jak zawsze.

![Zakładka Config repozytorium z wierszami doctora i sekcjami zasad](../../screenshots/repo-config.webp)

## Gdzie się go edytuje

Zębatka obok narzędzi na pasku → **Config**. Ten edytor zapisuje plik do twojego
drzewa roboczego; nie jest przechowywany nigdzie indziej, więc **zacommituj go**,
żeby podzielić się zasadami z zespołem.

Jeśli repozytorium go nie ma, **Przeczytaj repozytorium** proponuje plik na
podstawie tego, co już jest: `.nvmrc` lub `engines.node`, `.gitmodules`,
`filter=lfs` w `.gitattributes`, `.env.example` bez `.env` obok, gałęzie, które
już chronisz lokalnie, oraz zakresy używane w ostatnich 500 tematach commitów.
Nic nie zostaje zapisane, dopóki nie zapiszesz. W terminalu to samo robi
`gitcito config init` (zobacz [wiersz poleceń](cli.md)).

## Co plik może powiedzieć

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "Bazowy adres API i token deweloperski" }]
  },
  "checklist": {
    "push": ["Uruchom testy integracyjne na środowisku staging"]
  }
}
```

| Pole | Co robi |
|---|---|
| `version` | Musi być `1`. Plik z nowszego schematu jest ignorowany w całości, zamiast zgadywany. |
| `protect` | Nazwy gałęzi, gdzie `*` pasuje do dowolnego ciągu znaków. **Dodawane** do gałęzi chronionych lokalnie — zobacz [chronione gałęzie](repo-settings.md). |
| `links.tickets` | Wyrażenie regularne i szablon adresu. `$0` to całe dopasowanie, `$1`…`$9` jego grupy. Dopasowania w tematach i treściach commitów stają się linkami. |
| `commit.scopes` | Zakresy, które proponuje kompozytor, zamiast pola tekstowego. Zadeklarowanie ich sprawia też, że nieznany zakres w `gitcito commit-check` staje się błędem, a nie poradą stylistyczną. |
| `commit.ticketFromBranch` | Wypełnia klucz zgłoszenia z nazwy gałęzi (`feature/ABC-123-cos` → `ABC-123`) — ale tylko w pustym kompozytorze, nigdy na tym, co właśnie piszesz. |
| `commit.trailers` | Linie dopisywane do treści commita. `{ticket}` i `{branch}` są wypełniane; linia, której symbol nie ma czym się wypełnić, jest pomijana, a nie zapisywana w połowie. |
| `requires.*` | Czego potrzebuje działający klon. Każdy wpis staje się wierszem doctora, poniżej. |
| `checklist.push` | Dowolny tekst pokazywany raz na sesję, przed pierwszym pushem. |

## Doctor

`requires` to część odpowiadająca na *„sklonowałem i nie działa"*. Gitcito
sprawdza je przy otwarciu repozytorium i pokazuje plakietkę ze stetoskopem na
pasku stanu, gdy coś się nie zgadza. Kliknięcie otwiera zakładkę Config na
wierszach doctora; **Sprawdź ponownie** uruchamia je jeszcze raz.

| Sprawdzenie | Przechodzi, gdy | Naprawa przez |
|---|---|---|
| `node` | `node` z twojego PATH spełnia specyfikację | — |
| `submodules` | Żaden submoduł nie jest niepobrany | `git submodule update --init --recursive` |
| `lfs` | git-lfs jest zainstalowany, a śledzone pliki to prawdziwa treść, a nie tekst wskaźnika | `git lfs pull` |
| `hooksPath` | `core.hooksPath` zgadza się z zadeklarowaną ścieżką | ustawienie `core.hooksPath` |
| `files` | Plik istnieje | skopiowanie go z `from`, jeśli istnieje |

Dwa świadome ograniczenia. **Ostrzeżenie** nigdy nie znaczy „zepsute" — znaczy, że
doctor nie mógł czegoś ustalić (nieczytelna specyfikacja Node przechodzi, zamiast
wymyślać błąd, z którym nic nie zrobisz), a ostrzeżenia nie wywracają
`gitcito doctor` w CI. I naprawa nigdy nie pochodzi z pliku: zbiór powyżej to
cały zbiór, zamknięty na etapie kompilacji. Konfiguracja podaje mu wartość —
ścieżkę do skopiowania, wartość dla `core.hooksPath` — a nigdy polecenia.

Kopiowanie nigdy nie nadpisuje: brak pliku to dokładnie powód, dla którego ten
wiersz się pojawił.

## Commity

Gdy `commit.scopes` są zadeklarowane, przycisk zakresu w kompozytorze proponuje
tę listę zamiast pola tekstowego — różnica między `feat(renderer)` a
`feat(rendererr)`. `ticketFromBranch` i `trailers` wypełniają mechaniczne części
wiadomości, a `links.tickets` zamienia klucze z powrotem w linki wszędzie tam,
gdzie commit jest wyświetlany.

Te same zasady działają poza oknem: `gitcito commit-check` czyta ten plik, więc
hook `commit-msg` i CI egzekwują dokładnie to, co podpowiada kompozytor. Zobacz
[wiersz poleceń](cli.md) i [commitowanie](committing.md).

## Lista przed pushem

`checklist.push` pojawia się jako potwierdzenie przed pierwszym pushem w sesji,
po jednej linii na pozycję. To miejsce na to, co naprawdę jest kwestią oceny —
*czy ktoś uprzedził wsparcie?* — bo Gitcito **nigdy tego za ciebie nie sprawdza**.
To przypomnienia, nie bramki: przeczytaj i pushuj albo anuluj. Pokazywane raz na
repozytorium na sesję, bo okno przy każdym pushu to okno, którego nikt nie czyta.

## Dlaczego nie może ci zaszkodzić

Plik przychodzi razem z repozytorium, czyli od tego, kto repozytorium napisał.
Jest traktowany jak treść niezaufana, dokładnie tak jak wiadomość commita:

- **Nic w nim się nie wykonuje.** Nie ma pola, które trzymałoby polecenie, a
  naprawy doctora to stała lista.
- **Może tylko dokładać ograniczenia.** `protect` to suma z twoją listą lokalną —
  repozytorium może chronić więcej, niż wybrałeś, ale nigdy nie odwiedzie cię od
  ochrony czegoś. Żadne pole nie wyłącza zabezpieczenia.
- **Ścieżki nie mogą opuścić repozytorium.** Ścieżki bezwzględne, `..`, `~`,
  litery dysków i wszystko, co dotyka `.git`, są odrzucane — i sprawdzane
  ponownie tam, gdzie tekst staje się prawdziwą ścieżką.
- **Linki muszą być `http(s)`.** Nic innego nie trafia do systemowego otwierania
  adresów.
- **Wszystko ma limity** — długość list, tekstów i wzorców — żeby wrogie
  repozytorium nie wkleiło ściany tekstu w okno ani tysiąca plakietek w panel.

Błędne pole jest pomijane, nie jest fatalne. Reszta pliku dalej obowiązuje, a to,
co pominięto, jest wypisane pod **Zignorowane przez Gitcito** w zakładce Config
wraz z powodem. Jedyny wyjątek to nieprawidłowy JSON albo nieznana `version` —
tam nie ma czego ratować.

## Czego celowo nie robi

- **Żadnych poleceń, skryptów ani hooków.** Od tego są [hooki](hooks.md), a to
  decyzja podejmowana dla każdego klonu osobno.
- **Żadnych zasad per gałąź czy per osoba.** Jeden plik, jeden zestaw zasad.
- **Nie zastępuje CI.** Lista to tekst; doctor sprawdza środowisko, a nie twoją
  pracę.
- **Nie może niczego osłabić.** Każde zabezpieczenie Gitcito pozostaje twoje.

**Zobacz też:** [Ustawienia repozytorium](repo-settings.md) ·
[Wiersz poleceń](cli.md) · [Commitowanie](committing.md) ·
[Hooki i .gitignore](hooks.md)
