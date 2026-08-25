---
title: Hosting i pull requesty
category: Synchronizacja i wiele repozytoriów
order: 56
summary: Twórz PR-y wszędzie; recenzuj je i merguj na GitHubie i GitLabie.
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

## Stosy na liście

Pull requesty stojące jeden na drugim zwijają się do jednego wiersza z ikoną
stosu, gałęzią, na której ląduje łańcuch, i liczbą elementów. Rozwiń go, aby
zobaczyć łańcuch w kolejności czytania — od liścia w dół do bazy — ze strzałką
pod każdym wierszem mówiącą, w co się scala; kierunek jest na ekranie, a nie do
wywnioskowania z czterech baz.

Grupę tworzą dwie rzeczy: własny numer stosu GitHuba, gdy PR-y należą do
[stosu natywnego](stacks.md), a poza tym same refy — pull request, którego bazą
jest głowa innego, stoi na nim. Ta druga reguła sprawia, że działa to również na
GitLabie, Bitbuckecie i Azure DevOps.

## Recenzowanie — GitHub i GitLab

| | |
|---|---|
| **Rozmowa** | Komentarze i stan recenzji |
| **Sprawdzenia** | Przebiegi CI (GitHub) albo zadania pipeline'u (GitLab) ze stanem zaliczony/niezaliczony/oczekujący i odnośnikami do logów |
| **Obejrzane pliki** | Lista kontrolna z ✓ przy każdym pliku i postępem |
| **Wątki liniowe** | Komentarze do linii pogrupowane po `plik:linia` oraz odpowiedzi |
| **Akcje** | Skomentuj, zatwierdź, poproś o zmiany oraz merge / squash |

Jeśli ktoś zrobi force push w środku recenzji,
[co się zmieniło od](range-diff.md) pokaże ci dokładnie, co się ruszyło.

Różnice GitLaba, powiedziane wprost: GitLab nie ma pojedynczego wywołania
"wyślij recenzję", więc **zatwierdź** korzysta z jego endpointu zatwierdzeń, a
**poproś o zmiany** cofa twoje zatwierdzenie i publikuje twój komentarz.
**Rebase-merge** nie jest oferowany — GitLab sam wybiera między merge-commitem
a fast-forwardem na podstawie ustawień projektu, więc menu merge'a pokazuje
tylko merge i squash. Wątki liniowe pokazują plik i linię, ale nie otaczający
hunk diffa, którego API GitLaba nie zwraca. Recenzja/merge działa dla projektów
na **gitlab.com**; instancje self-hosted nie są jeszcze obsługiwane. Bitbucket
i Azure DevOps do recenzji nadal otwierają się w przeglądarce.

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
