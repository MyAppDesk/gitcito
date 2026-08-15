---
title: Funkcje AI
category: AI
order: 80
summary: Opcjonalne, niezależne od dostawcy i osadzone w twoim prawdziwym kodzie.
keywords: ai openai anthropic ollama lokalny llm wiadomość commita wyjaśnij recenzja wiki osadzone commit message explain review grounded
---

# Funkcje AI

Każda funkcja AI jest **opcjonalna** i wyłączona, dopóki nie skonfigurujesz
dostawcy. Nic nigdzie nie jest wysyłane, dopóki o coś konkretnego nie
poprosisz.

![Ustawienia AI](../../screenshots/settings-ai.webp)

## Dostawcy

Gotowce dla **OpenAI, Anthropic, OpenRouter, Groq, Mistral i Ollama**
(całkowicie lokalna) albo dowolny endpoint zgodny z OpenAI. Modele są pobierane
na żywo, a ty możesz dodać własne instrukcje.

> Porządnie przetestowany bojowo jest wyłącznie OpenAI. Pozostali używają
> kształtu wywołania zgodnego z OpenAI i powinni działać — ale są
> niezweryfikowani.

## Co potrafi

| Funkcja | Co dostajesz |
|---|---|
| **Wiadomość commita** | Podsumowanie (i opcjonalną treść) z twojego diffa z przechowalni, w wybranym przez ciebie stylu |
| **Wyjaśnij ten plik** | Wyjaśnienie zwykłym językiem w panelu bocznym — Normalne, Zwięzłe, ELI5… a nawet Pirackie |
| **Najedź, żeby wyjaśnić** | Przytrzymaj <kbd>⇧</kbd> i wskaż identyfikator, żeby dostać jednolinijkowe wyjaśnienie plus linie, na których się opiera |
| **Rozwiązywanie konfliktów** | Proponuje scalenie w edytowalnym wyniku — nigdy nie stosuje go samo |
| **Recenzja PR-a** | Streszcza diff i wskazuje ryzyka, każde zakotwiczone w prawdziwym `plik:linia` |
| **Opis PR-a** · **nazwy gałęzi** | Naszkicowane z commitów i diffa gałęzi |
| **Motywy** · **palety grafu** | Generowane z promptu |
| **Sprytna przechowalnia** | Sugestie, co należy do tego commita |

## Osadzone, nie zgadywane

Recenzja widzi diff jako **oznaczone hunki** i wolno jej cytować wyłącznie te
oznaczenia; Gitcito następnie rozwiązuje każde z nich na prawdziwy plik i linię.
Model, który wymyśli lokalizację, zostaje **odrzucony i zapytany ponownie** —
więc ustalenia zawsze wskazują na kod, który istnieje.

Wyjaśnianie po najechaniu czyta wyłącznie ponumerowane okno wokół tokenu —
a w diffie jedynie hunki widoczne na ekranie — więc gdy definicja mieszka gdzie
indziej, mówi o tym, zamiast to zmyślać. Odpowiedzi są cache'owane dla każdej
wersji pliku.

**Zamaskowane pliki z sekretami nigdy nie są wysyłane.** Tak samo pliki objęte
regułami maskowania sekretów.

**Zobacz też:** [Wiki repozytorium](repo-wiki.md) · [Bezpieczeństwo i sekrety](security.md)
