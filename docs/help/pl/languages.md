---
title: Języki i pisanie od prawej do lewej
category: Dostosuj do siebie
order: 102
summary: Wybierz język interfejsu po fladze i własnej nazwie, z lustrzanym układem dla arabskiego i hebrajskiego.
keywords: język języki lokalizacja tłumaczenie od prawej do lewej arabski hebrajski flaga polski language languages locale i18n internationalization translation rtl right-to-left arabic hebrew mirror direction endonym
---

# Języki i pisanie od prawej do lewej

Interfejs Gitcito jest przetłumaczony. Język jest ustawieniem Gitcito, a nie
systemu — deweloper na anglojęzycznym macOS, który woli czytać po japońsku,
ustawia to tutaj, a deweloperowi na hebrajskim systemie, który woli aplikację po
angielsku, nikt tego nie narzuca.

**Ustawienia → Ogólne → Język.**

![Wybór języka](../../screenshots/languages.webp)

## Co jest w zestawie

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Każdy wiersz na liście jest zapisany we własnym języku. Ktoś, kto szuka
koreańskiego, wypatruje 한국어, a nie słowa „koreański" w języku, z którego
właśnie próbuje wyjść.

### O flagach

Flaga nazywa kraj; lokalizacja nazywa język. Te dwie rzeczy naprawdę się nie
pokrywają — arabski jest językiem urzędowym w ponad dwudziestu państwach,
a portugalski leży na dwóch kontynentach. Ikony trzymają się tej samej
konwencji, której używa wybór lokalizacji w każdym systemie operacyjnym:
głównego regionu danej lokalizacji. Są tam po to, żeby dało się je
*rozpoznać na pierwszy rzut oka*, a nie po to, żeby rościć sobie prawo do tego,
do kogo język należy.

Są rysowane jako grafika wektorowa, a nie emoji, i to celowo. Windows nie
dostarcza żadnych emoji z flagami — `🇩🇪` renderuje się tam jako prostokąt
z literami „DE".

## Pisanie od prawej do lewej

Arabski i hebrajski odbijają lustrzanie cały interfejs: panel boczny przenosi
się na prawo, panele i paski narzędzi się odwracają, a ikony, które gdzieś
wskazują, wskazują w drugą stronę.

Przełączenie jest natychmiastowe i nie wymaga restartu.

![Gitcito po arabsku, z lustrzanie odbitym układem](../../screenshots/rtl.webp)

### Co celowo się nie odbija

Część treści jest od lewej do prawej niezależnie od tego, w jakim języku
czytasz. Odbicie jej byłoby czynnie błędne, więc te rzeczy zostają, jak są:

| Zostaje LTR | Dlaczego |
|-----------|-----|
| Graf commitów | Pozycje torów są liczone w pikselach; odbity kontener nie zgadzałby się z narysowanymi liniami |
| Diffy i zawartość plików | Kod jest LTR, a odbity diff jest nieczytelny |
| Blame i wynik rozwiązywania konfliktów | Ten sam powód — ten tekst to źródło, a nie proza |
| Wbudowany terminal | Renderuje własną siatkę; wyjście gita jest LTR |
| Ścieżki, SHA, referencje i polecenia | `refs/heads/main` czyta się tylko w jedną stronę |

Każde z nich jest izolowane, więc fragment arabskiego *wewnątrz* jednego z nich
— nazwa gałęzi, wiadomość commita, nazwa pliku — nie może przestawić tekstu
dookoła.

### Ograniczenia

Jesteśmy tu uczciwi co do tego, gdzie to się kończy:

- **Wiadomości commitów, nazwy gałęzi i zawartość plików nigdy nie są przez
  Gitcito przekierowywane.** Są pokazywane tak, jak napisał je autor. Hebrajska
  wiadomość commita na liście izolowanej jako LTR renderuje się po hebrajsku, ale
  otaczający ją wiersz nie odwraca się, żeby ją pomieścić.
- **Powierzchnie firm trzecich zachowują własny kierunek** — terminal to xterm,
  a podgląd Markdowna renderuje dokument tak, jak został napisany.
- **Nazwy plików o mieszanym kierunku są trudne.** Ścieżka z arabskim
  katalogiem wewnątrz angielskiego drzewa jest izolowana, a nie przestawiana —
  co jest poprawne, ale za pierwszym razem i tak potrafi zaskoczyć.

## Ten podręcznik też jest przetłumaczony

Nie tylko przyciski. Każda strona, którą czytasz, istnieje w każdym języku
z powyższej listy — objaśnienia, tabele z tym, co robi każda opcja, sekcje
mówiące, czego dana funkcja robić nie będzie. Zmiana języka interfejsu zmienia
razem z nim podręcznik, zarówno w aplikacji, jak i na stronie.

Tłumaczenie ma prawo być niekompletne. Jeśli strona nie została jeszcze
przetłumaczona, dostajesz angielską zamiast brakującej, a panel boczny zachowuje
w każdym języku ten sam kształt, więc zrzut ekranu albo instrukcja nadal zgadza
się z tym, co widzisz.

Na stronie każda strona ma przełącznik języka, który zostawia cię na tej samej
stronie, którą czytałeś, bo zmiana języka to nie to samo co zaczynanie od nowa.

**Co jest tłumaczone maszynowo i jaka jest tego cena.** Angielski i hiszpański
napisano ręcznie. Resztę przetłumaczył model według glosariusza, a potem
sprawdził skrypt: każda strona, każdy odnośnik, każda ścieżka obrazka, każdy blok
kodu bajt po bajcie względem angielskiego. To wyłapuje popsutą strukturę. Nie
wyłapuje zdania, które jest poprawne, ale drewniane. Jeśli strona czyta się źle w
twoim języku, to błąd wart zgłoszenia.

## Dodanie języka

Słowniki to jeden plik na lokalizację pod `src/renderer/src/i18n/`, a plik
angielski jest referencją, względem której każdy inny jest sprawdzany typami —
brakujący klucz to błąd kompilacji, a nie ciche zejście do angielskiego. Zestaw
testów sprawdza też, czy każdy `{placeholder}`, który dany napis interpoluje,
przeżywa tłumaczenie — więc zdanie nie może po drodze do innego języka zgubić
swojego sha commita.

Podręcznik działa tak samo: `docs/help/` zawiera strony po angielsku, a
`docs/help/<locale>/` każde tłumaczenie — jeden plik na stronę, o tej samej
nazwie. `npm run lint:docs` sprawdza, czy każda przetłumaczona strona ma
angielski oryginał, czy jej front matter jest kompletny i czy jej odnośniki oraz
obrazki rozwiązują się o katalog głębiej.

Wkład jest mile widziany — strona po stronie to całkiem dobre tempo, a
poprawienie niezgrabnego tłumaczenia jest tak samo cenne jak dodanie
brakującego.

**Zobacz też:** [Motywy i wygląd](themes.md) · [Profile](profiles.md)
