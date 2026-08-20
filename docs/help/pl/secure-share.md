---
title: Bezpieczne udostępnianie
category: Bezpieczeństwo
order: 72
summary: Przenieś sekrety, notatki albo całą przestrzeń roboczą między maszynami — albo do współpracowników — jako jeden zaszyfrowany plik.
keywords: bezpieczne udostępnianie eksport import paczka zaszyfrowana przestrzeń robocza przeniesienie zespół notatki struktura bez backendu secure share export import bundle encrypted workspace transfer machine team notes structure no backend
---

# Bezpieczne udostępnianie

Postawienie nowej maszyny — albo wdrożenie nowej osoby w zespole — zwykle
oznacza wpisywanie wszystkiego od nowa. Bezpieczne udostępnianie pakuje to
zamiast tego w jeden zaszyfrowany plik `.gitcito`: funkcje zespołowe Gitcito
**nie mają backendu**, więc plik *jest* transportem. Wyślij go tak, jak i tak
wysyłasz pliki; hasło podróżuje osobno.

![Eksport ustawień jednego repozytorium jako zaszyfrowanej paczki](../../screenshots/secure-share.webp)

![Ten sam eksport dla całej przestrzeni roboczej](../../screenshots/secure-workspace.webp)

## Co może wejść do środka

| Sekcja | Zawartość |
|---|---|
| **Sejf** | Sekrety globalnego sejfu (wpisy sejfu przypisane do repozytoriów zostają na miejscu) |
| **Pliki repozytorium** | Nieśledzone pliki konfiguracji i sekretów, przy imporcie odtwarzane pod tymi samymi ścieżkami względnymi |
| **Struktura przestrzeni roboczej** | Sam układ kart — grupy, kolory, kolejność — z repozytoriami wskazywanymi po adresie zdalnego, nigdy po twoich lokalnych ścieżkach |
| **Notatki do commitów** | `refs/notes/commits` repozytorium, stosowane przy imporcie bez potrzeby prawa zapisu do jakiegokolwiek zdalnego repozytorium |

Sekrety trafiają do paczki wyłącznie wtedy, gdy **zaznaczysz checkbox**. Paczka
bez tego zaznaczenia nie zawiera żadnych poświadczeń. Ustawienia aplikacji nie
podróżują w paczce — mają własny eksport do zwykłego JSON-a w Ustawieniach.

## Importowanie

Ekran importu pokazuje, co jest w środku, **zanim** cokolwiek zastosuje, sekcja
po sekcji — a repozytoria są dopasowywane do tego, co już masz: najpierw po
adresie zdalnego, potem po katalogu — więc import nie klonuje świata od nowa.

Sekcja **struktury przestrzeni roboczej** odtwarza przestrzeń z repozytoriów,
które już masz; te, których nie masz, są wypisane wraz z ich zdalnym adresem,
żebyś mógł je najpierw sklonować i zaimportować ponownie — Gitcito nigdy nie
klonuje tu za ciebie. Sekcja **notatek do commitów** pokazuje zawczasu, co by
wylądowało — nowe, identyczne, rozbieżne albo przypięte do commitów, których
nie masz — a rozbieżne notatki są zastępowane tylko wtedy, gdy zaznaczysz
**nadpisanie**; scalania rozbieżnych notatek nie ma.

**Zobacz też:** [Sejf](vault.md) · [Bezpieczeństwo i sekrety](security.md) ·
[Notatki do commitów](notes.md) · [Przestrzenie, karty i grupy](workspaces.md)
