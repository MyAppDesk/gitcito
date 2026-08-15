---
title: Hosting i pull requesty
category: Synchronizacja i wiele repozytoriów
order: 56
summary: Twórz PR-y wszędzie; recenzuj je i merguj na GitHubie.
keywords: pull request PR merge request GitHub GitLab Bitbucket Azure DevOps recenzja zatwierdź merge zgłoszenia review approve issues
---

# Hosting i pull requesty

## Tworzenie

Twórz pull (albo merge) requesty bez opuszczania aplikacji: listy gałęzi, tytuł
i treść wypełnione wstępnie z commitów gałęzi, przełącznik szkicu i — na
GitHubie — recenzenci, etykiety i przypisania nadawane od razu przy tworzeniu.

![Tworzenie pull requesta](../../screenshots/create-pr.webp)

Działa na **GitHubie, GitLabie, Bitbuckecie i Azure DevOps**. Otwarte PR-y/MR-y
dla wszystkich czterech są wypisane w panelu bocznym.

Zacznij od porównania gałęzi, z grafu, z `+` w panelu PR-ów albo ze zgłoszenia
(które wypełni `Closes #N`).

## Recenzowanie — GitHub

| | |
|---|---|
| **Rozmowa** | Komentarze i stan recenzji |
| **Sprawdzenia** | Przebiegi CI ze stanem zaliczony/niezaliczony/oczekujący i odnośnikami do logów |
| **Obejrzane pliki** | Lista kontrolna z ✓ przy każdym pliku i postępem |
| **Wątki liniowe** | Komentarze do linii pogrupowane po `plik:linia` razem z ich hunkiem diffa oraz odpowiedziami |
| **Akcje** | Skomentuj, zatwierdź, poproś o zmiany oraz merge / squash / rebase |

Jeśli ktoś zrobi force push w środku recenzji,
[co się zmieniło od](range-diff.md) pokaże ci dokładnie, co się ruszyło.

## Zgłoszenia, kamienie milowe, wydania — GitHub

Przeglądaj zgłoszenia i otwieraj pełną kartę zgłoszenia: treść, komentarze,
etykiety, przypisania, kamień milowy, pola Projects v2, zamknięcie/otwarcie
ponowne oraz **utwórz gałąź dla tego zgłoszenia** (z nazwą od AI). Kamienie
milowe pokazują postęp i swoje zgłoszenia. Wydania da się przeglądać razem ze
stroną changelogu.

## Powiadomienia — GitHub

Cała twoja skrzynka — prośby o recenzję, wzmianki, aktywność CI — ze wszystkich
repozytoriów, z filtrami nieprzeczytane/wszystkie i oznaczaniem jako
przeczytane. Dzwonek na pasku nosi plakietkę nieprzeczytanych, a opcjonalne
powiadomienia systemowe odpalają, gdy ktoś poprosi o recenzję albo gdy CI
skończy.

## Tokeny

Tokeny per profil dla wielu kont albo organizacji, przechowywane w pęku kluczy
twojego systemu. Gitcito potrafi też pożyczyć to, co już trzyma twój
**credential helper gita**, więc organizacja, do której już się
uwierzytelniłeś, często nie wymaga w ogóle żadnej konfiguracji. Zobacz
[Bezpieczeństwo i sekrety](security.md).

**Zobacz też:** [Gałęzie w stosie](stacks.md) · [Funkcje AI](ai.md)
