---
title: Funkcje AI
category: AI
order: 80
summary: Opcjonalne, niezależne od dostawcy i osadzone w twoim prawdziwym kodzie.
keywords: ai openai anthropic ollama lokalny llm wiadomość commita wyjaśnij recenzja wiki osadzone commit message explain review grounded konta konto klucz api subskrypcja cli claude codex gemini modele
---

# Funkcje AI

Każda funkcja AI jest **opcjonalna** i wyłączona, dopóki nie skonfigurujesz
dostawcy. Nic nigdzie nie jest wysyłane, dopóki o coś konkretnego nie
poprosisz.

![Ustawienia AI](../../screenshots/settings-ai.webp)

## Konta

**Konto** to jeden sposób dotarcia do modelu: dostawca, adres, pod którym się z
nim łączysz, i sposób uwierzytelnienia. Można skonfigurować kilka i działają
obok siebie — klucz służbowy, prywatny, model lokalny, CLI, do którego już
jesteś zalogowany.

Gotowe ustawienia obejmują **OpenAI, Anthropic, Google Gemini, OpenRouter, Groq,
Mistral** oraz **Ollama** (w pełni lokalnie), a także dowolny endpoint zgodny z
OpenAI.

Anthropic używa własnego API `/v1/messages`, a nie wywołania w kształcie OpenAI,
więc modele Claude naprawdę działają, zamiast tylko na to wyglądać. Gemini jest
osiągane przez zgodny z OpenAI endpoint Google.

### Subskrypcja zamiast klucza API

Wybierz dostawcę **Lokalne CLI**, aby odpowiadało CLI agenta już zainstalowane i
zalogowane na tej maszynie — `claude`, `gemini` lub `codex`. Gitcito uruchamia
program z twoim zapytaniem i czyta odpowiedź; nie ma klucza API do wklejenia ani
tokenu do przechowania.

Gitcito uruchamia wyłącznie polecenie, które sam skonfigurowałeś jako konto, i
zawsze z listą argumentów zamiast powłoki — nic z diffa ani z nazwy gałęzi nie
może zostać wzięte za polecenie.

> **To nie jest bardziej prywatne niż klucz API.** Twoje zapytania i tak trafiają
> do tego samego dostawcy, na twoje własne konto, dokładnie tak jak z kluczem.
> Zmienia się rozliczenie i konfiguracja, a nie to, dokąd idzie tekst.

Jeśli polecenia nie ma w `PATH`, wpisz jego pełną ścieżkę przy koncie.

### Które konto za co odpowiada

W sekcji **Które konto za co odpowiada** każda funkcja — opisy commitów, czat,
wyjaśnianie kodu, recenzja PR, rozwiązywanie konfliktów, wiki, motywy — może
wskazywać własne konto i model. Zostaw wiersz na wartości domyślnej, aby szedł
za kontem domyślnym. Tani model do opisów commitów i mocny do czatu to typowy
podział.

### Powiadomienie o aktualizacji

Przy aktualizacji z wersji sprzed kont pojawia się to raz. Dotychczasowy dostawca i klucz stają się pierwszym kontem; niczego nie trzeba konfigurować ręcznie.

![Powiadomienie o aktualizacji](../../screenshots/ai-accounts-notice.webp)

## Modele

Listy modeli pochodzą od samego dostawcy i są zapisywane w pamięci podręcznej na
dobę; **Pobierz modele** odświeża jedną natychmiast. Pod listą Gitcito mówi,
skąd ona pochodzi — na żywo, z pamięci podręcznej (wraz z datą) albo z wbudowanej
listy zapasowej, i dlaczego.

Lista jest filtrowana do modeli zdolnych odpowiedzieć na zapytanie czatu, więc
modele embeddingów, mowy i obrazu zostają poza nią. Każde pole modelu przyjmuje
też dowolny tekst, więc model w wersji zapoznawczej, prywatne wdrożenie albo
świeżo pobrany tag Ollamy zawsze da się użyć, nawet jeśli dostawca go nie
wymienia.

Dostawca, któremu nie dałeś jeszcze klucza, albo nieosiągalny, cofa się do małej
listy wbudowanej zamiast pokazywać pustą listę rozwijaną.

Żaden dostawca nie publikuje listy uporządkowanej ani wyselekcjonowanej, więc porządkuje ją Gitcito: datowane migawki zwijają się do modelu, którego są migawką (`gpt-4o` obejmuje `gpt-4o-2024-08-06`), a reszta idzie od najnowszych, nie alfabetycznie. **Pokaż wszystkie modele** na dole listy przywraca wszystko, co przysłał dostawca.

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

## Ograniczenia

- Wbudowane listy zapasowe starzeją się między wydaniami. Po to właśnie jest
  pobieranie na żywo; zapas obejmuje tylko sytuację, gdy pobranie jest
  niemożliwe.
- Filtrowanie listy dostawcy do modeli czatowych działa po nazwie, więc model
  czatowy o nietypowej nazwie może wypaść. Wtedy wpisz go ręcznie.
- Konto CLI nie zgłosi zużycia tokenów, jeśli nie robi tego samo CLI — liczby
  zużycia i kosztu w ustawieniach będą zaniżać takie wywołania.
- Odpowiedzi przez CLI są wolniejsze niż bezpośrednie wywołanie API: program
  uruchamia całą sesję na każde zapytanie.
- Klucze są przechowywane osobno dla każdego konta w pęku kluczy systemu.
  Usunięcie konta usuwa jego klucz.

**Zobacz też:** [Wiki repozytorium](repo-wiki.md) · [Bezpieczeństwo i sekrety](security.md)
