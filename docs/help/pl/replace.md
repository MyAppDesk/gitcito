---
title: Replace i graft
category: Repozytorium i historia
order: 17
summary: Skróć historię klonu bez jej przepisywania — git replace, grafty i sposób na przywrócenie historii.
keywords: replace git replace graft refs/replace płytki obetnij historia archiwum rodzice przepisanie mniejszy klon shallow truncate archive parents rewrite filter-branch useReplaceRefs no-replace-objects
---

# Replace i graft

`git replace` mówi gitowi: *gdziekolwiek zamierzałeś przeczytać obiekt A,
przeczytaj zamiast niego B*. Nic nie jest przepisywane. Żadne sha się nie
zmienia. Każdy commit zostaje dokładnie tam, gdzie był — git po prostu patrzy po
drodze gdzie indziej.

Brzmi to jak ciekawostka, dopóki nie zechcesz mniejszego klonu. Wtedy staje się
uczciwą alternatywą dla przepisania historii: **przeszczep commit na brak
rodziców**, a wszystko przed nim wypada z logu, z grafu i z każdego klonu
zrobionego stamtąd — będąc wciąż przechowywanym, wciąż pobieralnym i o jedną
usuniętą referencję od powrotu.

`⌘K` → **Replace i graft**.

![Istniejące podmiany i formularz graftu pod nimi](../../screenshots/replace.webp)

## Graftowanie

| Podaj mu | A dostaniesz |
|---------|-------------|
| Commit, **bez rodziców** | Ten commit staje się początkiem historii |
| Commit, **z jednym lub kilkoma rodzicami** | Podczepia się tam, zamiast tam, gdzie naprawdę siedzi |

Ta druga forma jest ciekawsza. Trzymaj pełną historię w repozytorium
archiwalnym, obetnij to robocze, a graft wskazujący na czubek archiwum połączy
oba z powrotem — tą samą sztuczką GitHub serwuje płytki klon, który wciąż da się
pogłębić.

**Graftowanie na brak rodziców najpierw pyta**, bo „historia zniknęła"
i „historia jest ukryta" wyglądają z poziomu logu identycznie, a wcale nie są
tym samym. Obiekty przeżywają, dopóki nie przytnie ich `gc`; zobacz
[konserwację](maintenance.md).

## Życie z tym

**Podmiany są referencjami**, pod `refs/replace/`. Ma to trzy konsekwencje warte
wiedzy:

- Są **lokalne, dopóki ich nie wypchniesz**: `git push origin "refs/replace/*"`
  je udostępnia, a każdy, kto sklonuje bez nich, widzi nietkniętą historię.
- **Cofnij działa** — usunięcie referencji natychmiast przywraca prawdziwe
  pochodzenie, a Gitcito zapisuje graft jako akcję odwracalną, jak wszystko inne.
- `core.useReplaceRefs=false` sprawia, że git ignoruje je wszystkie naraz.
  Przełącznik tutaj zapisuje dokładnie to, a okno mówi o tym wprost, gdy jest
  wyłączony, bo repozytorium po cichu ignorujące własne podmiany to mylące
  miejsce.

Z wiersza poleceń `git --no-replace-objects log` pokazuje prawdziwą historię, nie
zmieniając żadnego ustawienia.

## Kiedy sięgnąć po to zamiast po przepisanie

| Cel | Narzędzie |
|------|------|
| Klon jest za duży, historia w porządku | **Graft** — nic nie przepisane, odwracalne |
| Sekret albo ogromny blob musi *zniknąć* | [Usuwanie pliku z historii](history-purge.md) — prawdziwe przepisanie |
| Chodzi tylko o mniej do ściągnięcia raz | `git clone --depth` — płytki, bez referencji do pilnowania |

Graft niczego nie usuwa. Jeśli powodem, dla którego chcesz się pozbyć starych
commitów, jest to, że zawierają coś, co nigdy nie powinno było zostać
zacommitowane, to jest zła strona: obiekty wciąż tam są, wciąż da się je pobrać
po sha i wciąż siedzą w każdym istniejącym klonie.

## Ograniczenia warte wiedzy

- **To, co widzisz, przestaje odpowiadać temu, co jest przechowywane.** To
  jednocześnie funkcja i zagrożenie. Ktokolwiek debuguje klon z podmianami, musi
  wiedzieć, że one istnieją.
- **Podmiany domyślnie nie podróżują**, więc `git log` kolegi i twój mogą się
  całkiem zasadnie nie zgadzać.
- **Podmiana potrafi ukryć commit przed narzędziami, nie przed gitem.**
  `git cat-file` i [eksplorator obiektów](objects.md) nadal otworzą oryginał po
  sha.
- **Gitcito nie oferuje `git replace --edit`** (ręcznego przepisania treści
  obiektu). To robota dla edytora tekstu na surowym obiekcie i strzał w stopę
  z interfejsem dookoła.

Zobacz też: [Eksplorator obiektów](objects.md) ·
[Usuwanie pliku z historii](history-purge.md) ·
[Konserwacja repozytorium](maintenance.md)
