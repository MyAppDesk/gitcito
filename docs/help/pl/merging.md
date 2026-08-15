---
title: Merge i rebase
category: Gałęzie i operacje na historii
order: 41
summary: Merge, rebase, porównywanie referencji i przeciąganie jednej referencji na drugą — w panelu bocznym albo w grafie.
keywords: merge rebase fast-forward porównaj referencje przeciągnij upuść graf plakietka tag zdalne revert reset cherry-pick compare refs drag drop
---

# Merge i rebase

## Z panelu bocznego

Kliknij gałąź prawym przyciskiem, żeby dostać **Zmerguj do bieżącej** albo
**Zrebase'uj na** — bądź **Merge z opcjami…**, gdy to właśnie zwykły merge
raz po raz zawodzi; zobacz [opcje merge'a](merge-options.md).

## Przeciągnij jedną referencję na drugą

Najszybszy gest w aplikacji: podnieś gałąź i upuść ją na inną. Gitcito otwiera
małe menu z tym, co to upuszczenie mogłoby oznaczać, i nie robi nic, dopóki nie
wybierzesz.

![Przeciągnięcie jednej gałęzi na drugą otwiera menu z tym, co upuszczenie mogłoby oznaczać](../../screenshots/clip-branch-drop.webp)

Działa w **obu** miejscach, gdzie pokazywane są referencje — na wierszach
gałęzi, zdalnych i tagów w panelu bocznym oraz na kolorowych **plakietkach
referencji w samym grafie**. Przeciągaj między nimi w dowolnej kombinacji; cel
upuszczenia podświetla się, gdy nad nim wisisz.

| Upuszczenie | Oznacza |
|------|-------|
| **Zmerguj {source} → {target}** | Przełącza na cel i wmerguje w niego źródło |
| **Zrebase'uj {source} na {target}** | Odtwarza commity źródła na wierzchu celu |
| **Porównaj** | Otwiera [porównanie](#porównanie-dowolnych-dwóch-referencji) — nic nie zmienia |

**Menu proponuje tylko to, co git potrafi.** Merge commituje na cel, więc cel
musi być lokalną gałęzią — nie da się zmergować do taga ani do referencji
śledzącej zdalną. Rebase przepisuje źródło, więc źródło musi być lokalną
gałęzią. Upuść tag na gałąź zdalną, a jedyne, co dostaniesz, to *Porównaj*, bo
naprawdę tylko tyle da się zrobić.

Rebase najpierw prosi o potwierdzenie: nadaje każdemu odtworzonemu commitowi
nowy hash, co oznacza force push, jeśli gałąź jest już opublikowana. Merge nie
pyta — on tylko dokłada. Tak czy inaczej jedno **Cofnij** przywraca cię na
miejsce.

## Merge

Fast-forward, kiedy się da, albo wymuszony commit scalający, kiedy chcesz mieć
zapisaną topologię. Jeśli wejdzie w konflikt, lądujesz
[w edytorze konfliktów](conflicts.md).

## Porównanie dowolnych dwóch referencji

Wybierz bazę i referencję do porównania — gałąź, tag albo surowy SHA, z
przyciskiem zamiany miejscami — a dostaniesz liczniki przed/za, commity unikalne
dla każdej ze stron, pełny zbiorczy diff i przekazanie jednym kliknięciem do
**otwarcia PR-a**.

![Porównanie dwóch gałęzi: co jest unikalne dla każdej strony i zbiorczy diff](../../screenshots/branch-compare.webp)

Dostępne z panelu bocznego (porównanie z bieżącą gałęzią), z menu Narzędzia albo
przez <kbd>⌘K</kbd>.

## Cherry-pick, revert, reset

Wszystkie trzy z menu kontekstowego grafu. Reset oferuje **soft / mixed / hard**
i wypisuje wprost, co każdy z nich zrobi z twoim drzewem roboczym, zanim
wybierzesz.

Zaznacz najpierw wiele commitów, a cherry-pick zastosuje całe zaznaczenie, po
kolei.

## Zanim cokolwiek zmergujesz

[Radar konfliktów](conflict-radar.md) skanuje każdą gałąź względem bazy i mówi
ci, które będą się biły, nie przełączając się na żadną z nich.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Gałęzie w stosie](stacks.md) · [Radar konfliktów](conflict-radar.md)
