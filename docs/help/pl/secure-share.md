---
title: Bezpieczne udostępnianie
category: Bezpieczeństwo
order: 72
summary: Przenieś ustawienia, wpisy sejfu albo całą przestrzeń roboczą między maszynami.
keywords: bezpieczne udostępnianie eksport import paczka zaszyfrowana ustawienia przestrzeń robocza przeniesienie secure share export bundle encrypted settings workspace transfer machine
---

# Bezpieczne udostępnianie

Postawienie nowej maszyny zwykle oznacza wpisywanie wszystkiego od nowa.
Bezpieczne udostępnianie pakuje to zamiast tego w jedną zaszyfrowaną paczkę.

![Eksport ustawień jednego repozytorium jako zaszyfrowanej paczki](../../screenshots/secure-share.webp)

![Ten sam eksport dla całej przestrzeni roboczej](../../screenshots/secure-workspace.webp)

## Co może wejść do środka

| Sekcja | Zawartość |
|---|---|
| **Ustawienia** | Motywy, układ, skróty, preferencje |
| **Sejf** | Sekrety globalne i te przypisane do repozytoriów |
| **Repozytoria** | Repozytoria przestrzeni roboczej, dopasowywane przy imporcie po zdalnym adresie albo katalogu |

Sekrety trafiają do paczki wyłącznie wtedy, gdy **zaznaczysz checkbox**. Paczka
bez tego zaznaczenia nie zawiera żadnych poświadczeń.

## Importowanie

Ekran importu pokazuje, co jest w środku, **zanim** cokolwiek zastosuje, sekcja
po sekcji — a repozytoria są dopasowywane do tego, co już masz: najpierw po
adresie zdalnego, potem po katalogu — więc import nie klonuje świata od nowa.

**Zobacz też:** [Sejf](vault.md) · [Bezpieczeństwo i sekrety](security.md)
