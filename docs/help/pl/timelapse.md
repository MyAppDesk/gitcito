---
title: Timelapse
category: Repozytorium i historia
order: 14
summary: Odtwórz całe życie repozytorium jako animację i wyeksportuj je.
keywords: timelapse wideo animacja historia odtworzenie gource eksport webm film podsumowanie roku video replay export movie year in review
---

# Timelapse

Popatrz, jak repozytorium rośnie.

Każdy plik jest kropką, umieszczoną według swojego katalogu najwyższego poziomu:
rodzi się, gdy zostaje dodany, pulsuje, gdy dotknie go commit, puchnie, gdy jest
edytowany raz za razem, i gaśnie, gdy zostaje skasowany. Data, autor, temat oraz
bieżące liczniki commitów, plików i autorów siedzą na wierzchu, a pasek postępu
biegnie wzdłuż dołu.

![Timelapse w trakcie odtwarzania](../../screenshots/timelapse.webp)

![Całe życie repozytorium, odtworzone](../../screenshots/clip-timelapse.webp)

## Sterowanie

- **Odtwarzaj / pauza**, prędkości od **4× do 32×** oraz restart.
- Suwak przewija przez **odtworzenie od początku**, więc cofnięcie ląduje
  dokładnie we właściwym świecie, a nie w jego przybliżeniu.

## Eksport wideo

**Eksportuj wideo** nagrywa płótno od początku do końca i pyta, gdzie zapisać
`.webm`.

Nagrywanie dzieje się na samej stronie (`MediaRecorder`) — nie ma enkodera do
instalowania, nie ma ffmpega i nic nigdzie nie jest wysyłane. Nic nie trafia na
dysk, dopóki nie wskażesz ścieżki.

> Repozytorium o prawdziwym kształcie robi lepszy film niż repozytorium
> wymuskane. To zmiany nazw, usunięcia i katalog, który nagle wybucha, sprawiają,
> że warto to oglądać.

**Zobacz też:** [Wehikuł czasu](time-machine.md) · [Statystyki](insights.md)
