---
title: Ustawienia repozytorium
category: Narzędzia środowiska pracy
order: 94
summary: Chronione gałęzie, informacje, analityka, historia i dziennik operacji.
keywords: ustawienia repozytorium chronione gałęzie analityka dziennik operacji historia koło zębate repo settings protected branches analytics operation log info gear
---

# Ustawienia repozytorium

Koło zębate obok narzędzi na pasku otwiera ustawienia należące do **tego**
repozytorium, a nie do aplikacji.

![Ustawienia repozytorium](../../screenshots/repo-settings.webp)

| Zakładka | Co zawiera |
|---|---|
| **Ogólne** | Chronione gałęzie (wielokrotny wybór gałęzi, zapisany w konfiguracji gita), podpisywanie |
| **Config** | [Zasady, które niesie to repozytorium](repo-config.md) w `.gitcito.json`, oraz doctor, który je sprawdza |
| **Informacje** | Dowolne notatki i pola o tym repozytorium, trzymane lokalnie |
| **Sejf** | Wpisy [sejfu](vault.md) tego repozytorium |
| **Statystyki** | [Panel historii](insights.md) |
| **Analityka** | Co zrobiłeś w tym repozytorium, policzone lokalnie |
| **Historia** · **Logi** | Dziennik operacji: każde polecenie gita, które Gitcito uruchomiło, wraz z jego wyjściem |

Dziennik operacji jest tym uczciwym: gdy coś zachowuje się dziwnie, pokazuje
dokładne polecenie i dokładny błąd, więc zgłoszenie błędu może nieść fakty,
a nie przymiotniki.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Statystyki](insights.md)
