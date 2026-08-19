---
title: Lokalne CI
category: Synchronizacja i wiele repozytoriów
order: 58
summary: Uruchamiaj GitHub Actions repozytorium lokalnie przez act — zanim cokolwiek zostanie wypchnięte.
keywords: lokalne ci local ci act actions workflow przepływ runner docker potok pipeline test przed pushem before push nektos werdykt plakietka notatki na commit verdict badge notes per-commit
---

# Lokalne CI

Pętla push–czekanie–czerwony krzyżyk–poprawka–push marnuje dziesięć minut na
każdą rundę. Z [act](https://nektosact.com) te same przepływy pracy działają w
kontenerach Docker na Twojej maszynie, a Gitcito nimi steruje: wybierz
workflow, naciśnij Uruchom i patrz na ten sam log, który wypisałoby CI — zanim
cokolwiek opuści Twój komputer.

![Lokalne CI](../../screenshots/local-ci.webp)

## Integracja, a nie dołączone środowisko uruchomieniowe

Gitcito celowo **nie** dostarcza act ani Dockera — aplikacja ciągnąca za sobą
środowisko kontenerów to przeciwieństwo klienta gita. To integracja opt-in:
włącz ją w **Ustawienia → Integracje** (albo w samym oknie dialogowym), a
Gitcito wykryje, co jest zainstalowane, i przeprowadzi Cię przez resztę —
`brew install act`, działający demon Dockera, gotowe. Nic się nie uruchomi,
dopóki nie są spełnione wszystkie trzy warunki: integracja włączona, act
zainstalowany, Docker osiągalny.

## Co to robi

- Wyświetla każdy workflow spod `.github/workflows`, według jego `name:`.
- **Uruchom** wykonuje workflow przez act na Twoim **drzewie roboczym** —
  łącznie z niezatwierdzonymi zmianami, i o to właśnie chodzi: testuj przed
  commitem, a nie po pushu.
- Wyjście strumieniuje się na żywo do okna dialogowego; **Zatrzymaj** przerywa
  uruchomienie. Kod wyjścia 0 pokazuje **Zaliczono**, wszystko inne —
  **Niepowodzenie** z kodem.

## Werdykty per commit na grafie

![Werdykty Local-CI na grafie](../../screenshots/local-ci-verdicts.webp)

Zakończone uruchomienie przypina swój wynik do przetestowanego commita: mała
kolba oznacza wiersz na grafie **zielenią lub czerwienią**, więc na pierwszy
rzut oka widać, które commity przeszły już CI lokalnie. Werdykt jest
przechowywany jako notatka gita pod `refs/notes/gitcito-ci` — lokalnie na
Twojej maszynie, domyślnie nigdy nie wypychany.

Zasada uczciwości: werdykt jest przypinany tylko wtedy, gdy Twoje drzewo
robocze było **czyste**. Uruchomienie na niezatwierdzonych zmianach
przetestowało coś, czego nie zawiera żaden commit, więc pokazuje swój wynik
w oknie dialogowym, ale niczego nie oznacza.

## Ograniczenia

- act to bardzo dobra imitacja runnerów GitHuba, ale nie idealna: akcje
  wymagające usług hostowanych przez GitHub, sekretów albo egzotycznych
  obrazów runnerów mogą zachowywać się inaczej. Lokalna zieleń to mocna
  poszlaka, nie gwarancja.
- Jedno uruchomienie naraz na repozytorium; wystartowanie kolejnego anuluje
  pierwsze.
- Tylko uruchomienia całych workflowów — wybieranie pojedynczych jobów,
  macierzy czy zdarzeń to domena act; gdy potrzebujesz flag, uruchom go w
  [terminalu](terminal.md).
- Pierwsze uruchomienie pobiera obrazy runnerów — ten jeden raz będzie wolne.

**Zobacz też:** [Hosting i pull requesty](hosting.md) · [Wbudowany terminal](terminal.md)
