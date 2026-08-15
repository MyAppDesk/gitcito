---
title: Klucze SSH
category: Synchronizacja i wiele repozytoriów
order: 57
summary: Dlaczego twój token nic nie daje przy zdalnym git@ i jak zobaczyć, który klucz zawodzi.
keywords: ssh klucz klucze agent odcisk hasło do klucza wgraj ssh-add ssh-keygen ed25519 publickey permission denied fingerprint passphrase upload github known_hosts
---

# Klucze SSH

**Ustawienia → Bezpieczeństwo → Klucze SSH.**

## Dlaczego to siedzi obok tokenów

Gitcito uwierzytelnia dwie różne rzeczy, a ludzie całkiem rozsądnie zakładają,
że to jedna:

| | Uwierzytelniane przez |
|---|---|
| **API hostingu** — repozytoria, PR-y, zgłoszenia, sprawdzenia CI | Twój [token](hosting.md) |
| Transport gita po `https://` | Twój token, wstrzyknięty do adresu |
| Transport gita po **`git@…`** | **Twój klucz SSH, przez systemowe ssh** |

Zdalne repozytorium takie jak `git@github.com:me/api.git` nigdy nie dotyka
tokenu. Git przekazuje połączenie do `ssh`, które o osobistym tokenie dostępu
nigdy nie słyszało. To nie jest przypadek brzegowy — to jest to, co dostajesz,
gdy repozytorium założył kolega, gdy `.gitmodules` używa adresów `git@`, gdy
twoja firma wyłącza uwierzytelnianie po HTTPS albo gdy hostingiem jest
samodzielnie utrzymywany GitLab.

Kiedy to się psuje, ssh mówi `Permission denied (publickey)` i nic więcej.
Technicznie prawda, bezużyteczne jako porada.

![Każdy klucz w ~/.ssh ze swoim typem, odciskiem i informacją, czy trzyma go agent](../../screenshots/ssh-keys.webp)

## Co mówi ci ta sekcja

Każdy klucz znaleziony w `~/.ssh` pokazuje swój typ, rozmiar, odcisk i komentarz
— plus ten jeden fakt, który tłumaczy większość nagłych awarii:

**w agencie** / **nie w agencie**. Klucz, którego agent nie trzyma, nie
uwierzytelni niczego, a agent zapomina swoją zawartość przy restarcie, chyba że
systemowi powiedziano inaczej. „Wczoraj działało" to zwykle właśnie to.

## Co możesz tutaj zrobić

| Akcja | Co uruchamia |
|--------|--------------|
| **Skopiuj klucz publiczny** | Wrzuca linię `.pub` do schowka, gotową do wklejenia na dowolnym hostingu |
| **Dodaj do agenta** | `ssh-add` (z `--apple-use-keychain` na macOS, żeby przeżył restart) |
| **Wgraj na GitHuba** | `POST /user/keys` z tokenem tego profilu |
| **Wygeneruj klucz** | `ssh-keygen -t ed25519`, z komentarzem z twojego adresu e-mail w gicie |
| **Przetestuj połączenie** | `ssh -T git@<host>`, przetłumaczone na zdanie |

**Przetestuj połączenie** istnieje, bo własna odpowiedź ssh wprowadza w błąd:
GitHub uwierzytelnia cię pomyślnie, a *potem* wychodzi z kodem błędu, bo nie
oferuje powłoki. Gitcito czyta komunikat zamiast kodu wyjścia i pokazuje pod
spodem surowe wyjście, żebyś mógł sprawdzić tę interpretację.

## Ograniczenia, powiedziane wprost

- **Wgrywanie działa tylko na GitHubie.** GitLab, Bitbucket i Azure DevOps
  dostają *Skopiuj klucz publiczny* i link prosto do swojej strony ustawień
  kluczy. Rejestrowanie kluczy na tamtych trzech nie jest zaimplementowane
  i przycisk nie udaje, że jest inaczej.
- **Generowanie nigdy nie nadpisuje.** Nazwa już obecna w `~/.ssh` zostaje
  odrzucona. Nadpisanie klucza prywatnego po cichu odbiera ci dostęp do
  wszystkiego, co mu ufa, a żadne okno potwierdzenia tego nie odkręci.
- **Gitcito nie przechowuje haseł do kluczy.** Wpisujesz je przy generowaniu
  albo przy dodawaniu do agenta; są przekazywane do `ssh-keygen`/`ssh-add`
  i porzucane. Utrzymanie ich między restartami to robota pęku kluczy systemu,
  przez `ssh-add`.
- **Brak edycji `~/.ssh/config`**, brak aliasów hostów, brak wyboru klucza per
  repozytorium. To mieszka w twojej konfiguracji ssh, a Gitcito nie rusza tego
  pliku.

## Co nigdy nie opuszcza twojej maszyny

**Gitcito nigdy nie czyta, nie wyświetla i nie przesyła klucza prywatnego.** Ta
sekcja wypisuje publiczne połówki i odciski. Jedyne, co kiedykolwiek gdziekolwiek
wychodzi, to klucz publiczny, na którym jawnie naciśniesz **Wgraj** — i idzie on
na GitHuba, pod twoim własnym tokenem, po potwierdzeniu, które nazywa odcisk.

Zobacz też: [Bezpieczeństwo i sekrety](security.md) · [Hosting i pull requesty](hosting.md)
