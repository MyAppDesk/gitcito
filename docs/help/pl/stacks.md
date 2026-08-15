---
title: Gałęzie w stosie
category: Gałęzie i operacje na historii
order: 43
summary: Łańcuchy zależnych gałęzi, z kaskadowym restackiem.
keywords: stos stacked branches graphite restack zależne łańcuch rodzic PR na poziom stack dependent chain parent
---

# Gałęzie w stosie

Stos to łańcuch gałęzi, w którym każda buduje na tej pod spodem:
`main → api → ui`. Zrecenzowanie trzech małych PR-ów bije na głowę recenzję
jednego ogromnego.

![Stos gałęzi](../../screenshots/branch-stack.webp)

Gitcito pokazuje stos od dołu do góry, z liczbą commitów na każdym poziomie,
i pozwala **otworzyć PR na każdym poziomie** — każdy celujący w swojego rodzica,
a nie w `main`.

## Restack

Kiedy zmieni się niższa gałąź — poprawiłeś uwagi z recenzji na `api` — każda
gałąź nad nią stoi teraz na złej bazie. **Restack** kaskadowo rebase'uje cały
łańcuch przez `rebase --onto`, dzięki czemu przepisanie rodzica nie duplikuje
commitów do jego dzieci.

## Gdzie mieszkają powiązania

Powiązania z rodzicem są przechowywane w **konfiguracji gita**, więc podróżują
razem z repozytorium i przeżywają ponowne sklonowanie. Nic nie mieszka
w żadnym serwisie.

**Zobacz też:** [Rebase interaktywny](rebase.md) · [Hosting i pull requesty](hosting.md)
