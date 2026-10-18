---
title: Ustawienia repozytorium
category: Narzędzia środowiska pracy
order: 94
summary: Chronione gałęzie, informacje, analityka, historia i dziennik operacji.
keywords: ustawienia repozytorium chronione gałęzie analityka dziennik operacji historia koło zębate repo settings protected branches analytics operation log info gear obraz karty tab image ikona logo
---

# Ustawienia repozytorium

Koło zębate obok narzędzi na pasku otwiera ustawienia należące do **tego**
repozytorium, a nie do aplikacji.

![Ustawienia repozytorium](../../screenshots/repo-settings.webp)

| Zakładka | Co zawiera |
|---|---|
| **Ogólne** | Chronione gałęzie (wielokrotny wybór gałęzi, zapisany w konfiguracji gita), podpisywanie, obraz karty |
| **Config** | [Zasady, które niesie to repozytorium](repo-config.md) w `.gitcito.json`, oraz doctor, który je sprawdza |
| **Informacje** | Dowolne notatki i pola o tym repozytorium, trzymane lokalnie |
| **Sejf** | Wpisy [sejfu](vault.md) tego repozytorium |
| **Statystyki** | [Panel historii](insights.md) |
| **Analityka** | Co zrobiłeś w tym repozytorium, policzone lokalnie |
| **Historia** · **Logi** | Dziennik operacji: każde polecenie gita, które Gitcito uruchomiło, wraz z jego wyjściem |

Dziennik operacji jest tym uczciwym: gdy coś zachowuje się dziwnie, pokazuje
dokładne polecenie i dokładny błąd, więc zgłoszenie błędu może nieść fakty,
a nie przymiotniki.

## Obraz karty

Przy dziesięciu otwartych kartach nazwy zaczynające się tak samo — `api`,
`api-gateway`, `api-docs` — trudno odróżnić. Mały obrazek na karcie znajduje
się szybciej niż tekst.

W **Ogólne** kliknij pole obrazu. Wyświetla obrazy z samego repozytorium —
PNG, JPEG, GIF, WebP, SVG, ICO, BMP i AVIF — każdy z miniaturą, najpierw pliki
nazwane jak logo lub ikona. Pisz, aby zawęzić (`logo dark` znajduje
`assets/logo-dark.png`), poruszaj się strzałkami i wybierz Enterem; albo wpisz
ścieżkę ręcznie. Ścieżka jest zapisywana **względem katalogu głównego
repozytorium**, więc obraz podąża za repozytorium, gdziekolwiek leży jego
folder.

To, co pokazuje karta, ustawia się dla całej aplikacji w **Ustawienia → Ogólne
→ Karty repozytoriów pokazują**:

| Opcja | Karta pokazuje |
|---|---|
| **Obraz i nazwę** (domyślnie) | Obraz zamiast ikony folderu, potem nazwę |
| **Tylko nazwę** | Ikonę folderu i nazwę, jakby obrazu nie było |
| **Tylko obraz** | Sam obraz; nazwa trafia do podpowiedzi |

Ograniczenia, o których warto wiedzieć:

- Lista obejmuje pliki widoczne dla gita — śledzone i nieśledzone, bez
  ignorowanych — i najwyżej 40 naraz; pisz, aby dotrzeć do reszty. Ignorowany
  obraz nadal można wpisać ręcznie.
- Obrazy powyżej 1 MB lub nieczytelne są wyszarzone i nie da się ich wybrać:
  ikona 20-pikselowa nie potrzebuje więcej.
- Repozytorium **bez** obrazu zawsze pokazuje nazwę, niezależnie od opcji —
  pustej karty nie dałoby się rozpoznać.
- Jeśli ścieżka jest **zepsuta** — plik usunięty, przemianowany, nie jest
  obrazem albo jest za duży — karta po cichu wraca do nazwy, a ta karta
  ustawień pokazuje ostrzeżenie pod ścieżką. Nic poza tym nie protestuje.
- Obraz jest wczytywany raz na sesję. Jeśli podmienisz plik pod tą samą nazwą,
  otwórz ponownie tę kartę ustawień, aby go przeładować.
- Ustawienie żyje w ustawieniach Gitcito na tym komputerze, nie w repozytorium,
  więc współpracownicy go nie dziedziczą.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Statystyki](insights.md)
