---
title: Flutter DevTools
category: Narzędzia przestrzeni roboczej
order: 93
summary: Widok sieci, oś czasu, inspektor i profiler pamięci w karcie Gitcito.
keywords: devtools flutter dart sieć network oś czasu inspektor pamięć profiler webview panel osadzony vm service
---

# Flutter DevTools

DevTools ma już widok sieci, oś czasu, inspektor widgetów i profiler pamięci — a
przy tym jest aplikacją Flutter web serwowaną na twojej własnej maszynie. Gitcito
niczego z tego nie odtwarza i sam nie rozmawia z Dart VM Service: zauważa adres i
osadza go.

![DevTools otwarte w karcie Gitcito](../../screenshots/devtools.webp)

`flutter run` wypisuje tę linię, gdy tylko usługa VM wstanie:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

Sesja uruchomienia pilnuje własnego wyjścia w jej poszukiwaniu, a na pasku
debugowania pojawia się przycisk. Kliknięcie otwiera DevTools we własnej karcie,
po jednej na sesję — dwie działające aplikacje to dwa DevTools.

**Hot restart publikuje nowy adres**, a karta podąża za nim, dopóki żyje jej
sesja. Gdy sesja zniknie, karta zachowa ostatni adres, zwykle już martwy: zamknij
ją i otwórz DevTools z nowego uruchomienia.

## Które narzędzia

Narzędzie trafia tutaj, jeśli robi dwie rzeczy: serwuje interfejs webowy na tej
maszynie i wypisuje swój adres.

| Narzędzie | Wypisywana linia |
|---|---|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| wszystko inne, co wymienia DevTools i adres | wpada w dopasowanie ogólne |

**Czego nie da się osadzić i dlaczego.** Inspektor Node wypisuje endpoint `ws://`,
do którego podpina się debugger, a nie stronę — a towarzyszący mu front Chrome
DevTools mieszka za adresem `devtools://`, którego żaden osadzony widok nie może
załadować. Samodzielna wersja React DevTools to własne okno pulpitu, nie
serwowana strona. Żadne z nich nie może tu być kartą; oba wymagałyby klienta
protokołu debugowania, nie adresu.

**Serwer deweloperski to nie narzędzie deweloperskie.** Vite na `:5173` to twoja
aplikacja; osadzenie jej byłoby panelem podglądu — inną funkcją, świadomie nie tą.

## Co wolno osadzonej stronie

Osadzony widok chodzi na krótkiej smyczy, bo ta aplikacja przechowuje
poświadczenia:

- **Tylko loopback.** `127.0.0.1`, `localhost`, `::1`. Podpięcie innego adresu
  jest odrzucane, przekierowanie do niego również.
- **Bez preloadu, bez node integration, z izolacją kontekstu.** Strona nie ma
  żadnego mostu do Gitcito.
- **Odnośniki otwierają się w prawdziwej przeglądarce**, w zwykłym oknie, nie w
  panelu.

## Ograniczenia

- **To DevTools, nie nasze dzieło.** Co potrafi tamta wersja, potrafi panel;
  czego nie potrafi, nie potrafimy i my. Nie ma widoku sieci w wersji Gitcito.
- **Tylko Flutter ogłasza się w ten sposób.** Zwykły program w Darcie wypisuje URL
  usługi VM, ale żadnego adresu DevTools — więc przycisk się nie pojawia.
- **Pusty panel znaczy, że aplikacja się zatrzymała.** DevTools serwuje *działająca
  aplikacja*; gdy się kończy, adres przestaje odpowiadać.

**Zobacz też:** [Uruchamianie i debugowanie](launch.md)
