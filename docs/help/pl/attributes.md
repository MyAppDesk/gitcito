---
title: Atrybuty plików
category: Narzędzia środowiska pracy
order: 96
summary: .gitattributes z interfejsem — końce linii, pliki binarne, changelogi scalane unią, export-ignore i czytelne diffy dla Worda i PDF-a.
keywords: gitattributes atrybuty sterownik diff textconv merge union binary export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr końce linii
---

# Atrybuty plików

`.gitattributes` to plik o najwyższej wartości w gicie, którego prawie nikt nie
pisze. To sposób, w jaki repozytorium **uczy gita o własnej zawartości**: które
pliki są binarne, które mają się skleić zamiast wchodzić w konflikt, które nigdy
nie wychodzą w archiwum, jakie końce linii dostają wszyscy.

Rzecz najważniejsza: to jest commitowane. Reguła, którą dodasz, naprawia problem
u każdego, kto sklonuje, na każdym systemie, na zawsze — inaczej niż ustawienie
w twojej własnej konfiguracji, które naprawia go tobie, a twoim kolegom zostawia
odkrycie go na własnej skórze.

`⌘K` → **Atrybuty plików**.

![Reguły, które repozytorium już niesie, gotowce, sprawdzarka ścieżek i sterowniki diffa](../../screenshots/attributes.webp)

## Co robią te reguły

| Atrybut | Naprawia |
|-----------|-------|
| `text=auto eol=lf` | Końce linii, które przeskakują zależnie od tego, kto wypakował plik |
| `binary` | Próby gita, żeby zdiffować albo trójstronnie zmergować PSD, DOCX, skompilowany zasób |
| `merge=union` | Changelog, do którego wszyscy dopisują i na którym wszyscy wchodzą w konflikt |
| `-merge` | Pliki, dla których trójstronny merge produkuje bzdury — lockfile'e, generowany kod |
| `export-ignore` | Konfigurację CI i fixture'y wysyłane w tarballu wydania |
| `diff=<driver>` | Nieczytelne diffy formatów, które *są* czytelne, o ile ma się konwerter |
| `filter=lfs` | Duże pliki przechowywane przez [LFS](lfs-sparse.md) |
| `linguist-vendored` | Wciągnięty kod liczony w statystykach języków jako twój |

`binary` to skrót od `-diff -merge -text`, czyli trzy odpowiedzi na „przestań
zgadywać przy tym pliku" w jednym słowie.

## Edytowanie

Gotowce wypełniają wzorzec i jego atrybuty; popraw wzorzec przed dodaniem —
`CHANGELOG.md` to sugestia, a nie prawda o twoim projekcie.

**Zmiany są chirurgiczne.** Dodanie reguły dla wzorca, który już jakąś ma,
przepisuje tamtą linię tam, gdzie stoi, zamiast dopisywać drugą regułę wygrywającą
tym, że jest później. Komentarze w pliku przeżywają nietknięte, bo „dlaczego"
obok reguły zwykle jest warte więcej niż sama reguła.

Każdy zapis jest zwykłą akcją Gitcito: pokazuje toast, a **Cofnij** przywraca
plik dokładnie takim, jaki był.

**Repozytorium może mieć kilka plików atrybutów.** Jeden w korzeniu, jeden
w dowolnym podkatalogu i prywatny `.git/info/attributes`, który nigdy nie jest
commitowany i obowiązuje wyłącznie na twojej maszynie — właściwe miejsce dla
reguły, która dotyczy ciebie, a nie projektu. Gitcito wypisuje je wszystkie
i mówi, który jest który.

## Co obowiązuje dla ścieżki?

Reguły przychodzą z kilku plików, bardziej konkretna wygrywa, a czytanie ich po
to, żeby wyliczyć odpowiedź, to zgadywanka. **Co obowiązuje dla ścieżki?**
uruchamia `git check-attr` i pokazuje, co sam git z tego wnioskuje — a to
jedyna odpowiedź, która się liczy.

## Sterowniki diffa: jak uczynić dokument Worda czytelnym

`.docx` to zip. `.pdf` to skompresowany graf obiektów. Git diffuje je jako to,
czym są — jako szum — więc historia dokumentu jest nieczytelna, mimo że sam
dokument nie jest.

**Sterownik diffa** naprawia to przez `textconv`: polecenie, które zamienia plik
w tekst *wyłącznie na potrzeby diffowania*. Plik w twoim drzewie roboczym
zostaje nietknięty; git po prostu porównuje przekonwertowany tekst.

Dwie połowy, i obie są potrzebne:

1. `diff.<name>.textconv` w konfiguracji gita — polecenie konwertera.
2. `*.docx diff=<name>` w `.gitattributes` — do jakich plików się stosuje.

Przyciski tutaj robią jedno i drugie naraz. Dla Worda, Excela i JSON-a Gitcito
**dostarcza konwerter samodzielnie** — to samo parsowanie dokumentów, którego
używają jego podglądy, wystawione jako małe polecenie `gitcito-textconv`
wewnątrz aplikacji — więc te trzy działają bez instalowania czegokolwiek.
Reszta wciąż potrzebuje prawdziwego narzędzia w twoim PATH: Gitcito to sprawdza
i wyszarza to, czego brakuje, zamiast pisać sterownik, który zawiedzie przy
pierwszym diffie.

| Sterownik | Potrzebuje | Daje ci |
|--------|-------|-----------|
| `word` | niczego — dostarczany z Gitcito | Diffy prozy w `.docx` |
| `excel` | niczego — dostarczany z Gitcito | Diffy wierszy (CSV na arkusz) w `.xlsx`/`.xls` |
| `json` | niczego — dostarczany z Gitcito | Stabilne diffy JSON-a z posortowanymi kluczami |
| `pdf` | `pdftotext` (poppler) | Diffy tekstu w `.pdf` |
| `exif` | `exiftool` | Co zmieniło się w obrazie, gdy piksele są nieprzeniknione |

Granice dołączonego konwertera, powiedziane wprost: `.doc` (stary, binarny
format Worda) nie jest rozumiany — tylko `.docx`; PDF nie jest objęty —
Gitcito podgląda PDF-y podglądem przeglądarki i nie ma ekstraktora tekstu,
którego mógłby użyć ponownie; a każdy diff dokumentu płaci krótki koszt
uruchomienia konwertera. Ustawienie `git config diff.<name>.cachetextconv true`
sprawia, że git cache'uje wynik dla każdego bloba.

Połowa konwerterowa mieszka w **twojej** konfiguracji, a nie w repozytorium —
git nie uruchomi poleceń, które podsuwa ci klon, i jest to własność
bezpieczeństwa warta zachowania. Dołączone sterowniki wskazują też na *twoją*
ścieżkę instalacji Gitcito, więc kolega z zespołu, który sklonuje, dostanie
regułę `diff=word` i — dopóki nie podłączy własnego konwertera (Gitcito lub
innego) — stary, nieczytelny diff. Napisz o tym w swoim README.

## Ograniczenia warte wiedzy

- **Filtry clean/smudge nie są tutaj oferowane.** Reguły `filter=<name>` da się
  napisać ręcznie, ale Gitcito nie skonfiguruje poleceń: filtr uruchamia się przy
  każdym wypakowaniu każdego pasującego pliku, a zły po cichu psuje twoje drzewo
  robocze.
- **`text=auto` zmienia to, co trafia do commita**, normalizując końce linii po
  drodze. W istniejącym repozytorium dodaj to, a potem świadomie uruchom
  `git add --renormalize .`, we własnym, osobnym commicie.
- **Atrybuty nie działają wstecz.** Oznaczenie pliku jako `binary` dzisiaj nie
  zmienia tego, jak zapisano jego dawne diffy; zmienia to, jak git traktuje go
  od teraz.
- **Reguły obowiązują tylko tam, gdzie plik jest widoczny.** Reguła
  w `design/.gitattributes` nie mówi nic o `src/`.
- Gitcito zapisuje całe pliki, więc plik sformatowany ręcznie wraca ze swoim
  formatowaniem — ale reguła, którą Gitcito przepisuje, zostaje sformatowana do
  kanonicznego odstępowania gita `wzorzec atrybut atrybut`.

Zobacz też: [LFS i sparse-checkout](lfs-sparse.md) ·
[Bundle i archiwa](export.md) · [Opcje merge'a](merge-options.md) ·
[Hooki](hooks.md)
