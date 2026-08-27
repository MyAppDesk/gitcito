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

Przyciski tutaj robią jedno i drugie naraz. Dla Worda, Excela, JSON-a i `.strings`-a Gitcito
**dostarcza konwerter samodzielnie** — to samo parsowanie dokumentów, którego
używają jego podglądy, wystawione jako małe polecenie `gitcito-textconv`
wewnątrz aplikacji — więc te cztery działają bez instalowania czegokolwiek.
Reszta wciąż potrzebuje prawdziwego narzędzia w twoim PATH: Gitcito to sprawdza
i wyszarza to, czego brakuje, zamiast pisać sterownik, który zawiedzie przy
pierwszym diffie.

| Sterownik | Potrzebuje | Daje ci |
|--------|-------|-----------|
| `word` | niczego — dostarczany z Gitcito | Diffy prozy w `.docx` |
| `excel` | niczego — dostarczany z Gitcito | Diffy wierszy (CSV na arkusz) w `.xlsx`/`.xls` |
| `json` | niczego — dostarczany z Gitcito | Stabilne diffy JSON-a z posortowanymi kluczami |
| `strings` | nic — dostarczane z Gitcito | Diffy wierszowe pliku `.strings` w UTF-16, który git uznaje za binarny |
| `pdf` | `pdftotext` (poppler) | Diffy tekstu w `.pdf` |
| `exif` | `exiftool` | Co zmieniło się w obrazie, gdy piksele są nieprzeniknione |

### Ten, który gryzie projekty iOS

`Localizable.strings` przez niemal całą historię Xcode jest w UTF-16, a UTF-16
jest pełen bajtów NUL — więc git uznaje go za binarny i nie pokazuje **nic**:

```
diff --git a/Localizable.strings b/Localizable.strings
Binary files a/Localizable.strings and b/Localizable.strings differ
```

A to właśnie ten plik, w którym najbardziej zależy nam na tym, by zobaczyć, kto
którą frazę ruszył. Sterownik `strings` dekoduje go wyłącznie na potrzeby diffa
— czytając znacznik kolejności bajtów zamiast go zakładać, dzięki czemu
współczesny `.strings` w UTF-8 przechodzi nietknięty, a nie zamienia się w
krzaki.

String Catalogs (`.xcstrings`, Xcode 15 i nowsze) to JSON, a sterownik `json` je
obsługuje: sortuje klucze, więc tłumaczenie dodane na górze przestaje
przepisywać w diffie cały plik.

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

## Filtry clean/smudge — najpierw próba na sucho

**Filtr** przepisuje zawartość w drodze do repozytorium i z powrotem: `clean`
uruchamia się przy stage'owaniu (drzewo robocze → repo), `smudge` przy
wypakowaniu (repo → drzewo robocze). Tak działa git-lfs i tak zespoły wycinają
dane dostępowe albo wygenerowany szum z tego, co trafia do commita.

To zarazem najniebezpieczniejsza rzecz, na jaką `.gitattributes` może wskazać:
filtr uruchamia się przy **każdym wypakowaniu każdego pasującego pliku**, a zły
po cichu psuje twoje drzewo robocze. Dlatego Gitcito odmawia bycia tu zwykłym
polem tekstowym. Konfiguracja filtra przechodzi przez **próbę na sucho** na
prawdziwych pasujących plikach w twoim repozytorium:

1. Polecenie `clean` uruchamia się na kopii każdego pasującego pliku (do
   pięciu) — nic w repozytorium ani jego konfiguracji nie zostaje tknięte.
2. Jeśli podano polecenie `smudge`, uruchamia się ono na oczyszczonym wyniku,
   a rezultat jest porównywany bajt po bajcie z oryginałem — to **kontrola
   roundtripu**. Filtr, który nie przechodzi roundtripu, znaczy tyle:
   wypakowanie nie przywróci tego, co było.
3. Dopiero po próbie na sucho na dokładnie tych wartościach, które zapisujesz,
   przycisk zapisu się uzbraja. Nieudaną próbę — błąd polecenia, brak
   pasujących plików albo rozjeżdżający się roundtrip — nadal można zapisać,
   ale tylko przez wyraźne ostrzeżenie mówiące, co można stracić.

Zapis wpisuje `filter.<name>.clean/smudge` do twojej **lokalnej** konfiguracji
gita, a regułę `filter=<name>` do pliku atrybutów, i zostawia wpis cofania,
który przywraca to, co konfiguracja zawierała wcześniej. Przełącznik
**required** ustawia `filter.<name>.required`, przez co git przerywa operację
błędem, zamiast po cichu przepuszczać pliki, gdy filtr się psuje.

Granice, powiedziane wprost: próba na sucho bierze próbkę do pięciu pasujących
plików, każdy najwyżej 5 MB, z limitem 10 sekund na polecenie — filtr, który
zachowuje się dobrze na próbce, wciąż może zawieść na pliku, którego próbka
nie objęła. Polecenia mieszkają w *twojej* konfiguracji, więc kolega
z zespołu, który sklonuje, dostanie regułę `filter=<name>`, ale nie polecenia;
bez nich (i bez `required`) jego pliki przechodzą bez zmian.

## Ograniczenia warte wiedzy

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
