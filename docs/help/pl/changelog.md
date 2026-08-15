---
title: Generator changelogu
category: Praca ze zmianami
order: 34
summary: Zamień commity w stylu conventional pomiędzy dwiema referencjami w pogrupowany changelog.
keywords: changelog lista zmian notatki wydania conventional commits generuj release notes generate CHANGELOG
---

# Generator changelogu

Podaj mu dwie referencje — domyślnie **ostatni tag → HEAD** — a zamieni commity
pomiędzy nimi w changelog, pogrupowany według typu Conventional Commit.

![Generator changelogu](../../screenshots/changelog-gen.webp)

- **Zmiany łamiące zgodność** trafiają na samą górę, niezależnie od tego,
  z jakiego typu pochodzą.
- Potem Funkcje, Poprawki, Wydajność i tak dalej.
- Commity, które nie trzymają się żadnej konwencji, lądują pod **Inne**, zamiast
  zostać porzucone — changelog, który po cichu gubi commity, jest gorszy od
  bałaganiarskiego.

Skopiuj wynik albo **dopisz go prosto na początek `CHANGELOG.md`**.

> To pisanie wiadomości w [stylu Conventional](committing.md) czyni to
> użytecznym. Generator jest tak dobry, jak tematy, które czyta.

**Zobacz też:** [Commitowanie](committing.md) · [Hosting i pull requesty](hosting.md)
