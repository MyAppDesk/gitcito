---
title: Sprawdzenie środowiska
category: Zacznij tutaj
order: 6
summary: Na czym Gitcito polega poza własną instalacją — git, LFS, natywny terminal, credential helper gita, GitHub CLI i obserwowanie plików — sprawdzone w jednym miejscu.
keywords: środowisko environment doktor diagnostyka sprawdzenie git wersja lfs node-pty terminal podstawowa powłoka credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Sprawdzenie środowiska

Niektóre awarie w ogóle nie dotyczą repozytorium. Pochodzą z maszyny: git zbyt
stary na logowanie przez profil, terminal, który po cichu przeszedł w tryb
podstawowy, logowanie GitHub CLI, które nie może pushować plików workflow. Każda
z nich wychodzi później jako niejasny błąd, w środku czegoś innego.
**Ustawienia → Środowisko** (także *Settings: Environment* w palecie poleceń)
sprawdza je zawczasu.

[Doktor repozytorium](repo-settings.md) odpowiada na inne pytanie: czy *to
repozytorium* da się tu zbudować, według tego, czego wymaga jego `.gitcito.json`.
Sprawdzenie środowiska dotyczy samej aplikacji i jest takie samo dla każdego
repozytorium.

![Sprawdzenia środowiska w Ustawieniach](../../screenshots/settings-environment.webp)

## Co sprawdza

| Wiersz | Zielony oznacza | Żółty lub czerwony oznacza |
|--------|-----------------|----------------------------|
| **Git** | git 2.31 lub nowszy jest w `PATH` | Starszy niż 2.31: konto [profilu](profiles.md) nie może się zalogować do fetch i push. Brak: nic nie działa, dopóki git nie zostanie zainstalowany |
| **Git LFS** | `git lfs` jest zainstalowany | Nie jest zainstalowany. Potrzebują go tylko repozytoria trzymające pliki w LFS |
| **Terminal** | Natywny terminal się wczytał | [Terminal](terminal.md) działa w trybie podstawowym: bez kolorów, bez zmiany rozmiaru, bez programów pełnoekranowych |
| **Credential helper** | git ma helper dla haseł HTTPS — globalnie lub dla wybranych hostów (to, co ustawia `gh auth setup-git`) | Brak helpera, więc git poza Gitcito pyta za każdym razem. Albo `store`, który trzyma je jawnym tekstem. Zobacz [Credential helper](credentials.md) |
| **GitHub CLI** | `gh` jest zalogowany ze scope `workflow` | Zalogowany bez niego: GitHub odrzuca każdy push zmieniający `.github/workflows` |
| **Obserwowanie plików** (Linux) | Limit inotify to co najmniej 65 536 | Niższy limit wyczerpuje się przy kilku dużych otwartych repozytoriach, a nowe foldery przestają odświeżać status |

Wiersz, który nie dotyczy, jest pomijany: GitHub CLI, gdy nie jest zainstalowany
lub zalogowany, oraz obserwowanie plików w macOS i Windows.

## Naprawianie tego, co znajdzie

Gdzie jest poprawka, wiersz pokazuje ją jako polecenie z przyciskiem kopiowania.
Na przykład `gh auth refresh -h github.com -s workflow` dodaje brakujący scope, a
linia `sysctl` podnosi limit inotify. **Strona nigdy niczego sama nie
uruchamia.** Niektóre poprawki wymagają `sudo` lub zmieniają globalną
konfigurację i to Ty powinieneś je przeczytać przed uruchomieniem. Potem naciśnij
**Sprawdź ponownie**.

## Ograniczenia

- Sprawdza to, co aplikacja widzi z własnego procesu. Profil powłoki, który
  zmienia `PATH` tylko w Twoim terminalu, może sprawić, że obie strony się
  rozjadą.
- Wiersz GitHub CLI odzwierciedla własne logowanie `gh`, a nie konta połączone w
  **Ustawienia → Integracje**. To osobne dane logowania. Brak scope `workflow`
  tam objawia się raczej odrzuconym pushem.
- Raportuje, co jest zainstalowane. Niczego nie instaluje ani nie aktualizuje.
