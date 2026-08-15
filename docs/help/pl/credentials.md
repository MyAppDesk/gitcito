---
title: Credential helper
category: Bezpieczeństwo
order: 73
summary: Własny magazyn haseł gita — ten trzeci — i dlaczego https ciągle pyta cię od nowa.
keywords: credential helper hasło https pyta znowu osxkeychain wincred manager libsecret store cache git-credentials plaintext zapomnij unieważniony token 401
---

# Credential helper

Gitcito trzyma trzy różne rodzaje sekretów, a ludzie całkiem rozsądnie zakładają,
że to jedno:

| | Trzymane przez |
|---|---|
| Tokeny API hostingu — PR-y, zgłoszenia, sprawdzenia CI | Gitcito, w twoim [pęku kluczy systemu](security.md) |
| Transport `git@…` | Twój [klucz SSH](ssh-keys.md), przez systemowego agenta ssh |
| **Transport `https://`** | **Własny credential helper gita** |

Ten trzeci nie jest w niczyim odczuciu funkcją, dopóki się nie zepsuje — a wtedy
produkuje dwie najczęstsze skargi w gicie: *dlaczego znowu mnie pyta?* i
*dlaczego wciąż wysyła token, który unieważniłem?*

`⌘K` → **Credential helper**.

![Skonfigurowany helper, reguły dla poszczególnych hostów i ostrzeżenie o pliku z hasłami jawnym tekstem](../../screenshots/credentials.webp)

## Na co patrzysz

Każdy skonfigurowany `credential.helper`, w zasięgu, z którego pochodzi —
`system`, `global`, a potem to repozytorium. **Helpery się nakładają**: git pyta
każdy po kolei, a ten na poziomie repozytorium nie zastępuje globalnego.

Każdy jest sprawdzany na twojej maszynie:

| Oznaczenie | Oznacza |
|------|-------|
| **gotowy** | Program helpera istnieje i się uruchomi |
| **niezainstalowany** | Skonfigurowany, ale programu brakuje — każde pytanie kończy się ponownym wpisywaniem |
| **hasła w jawnym pliku** | Helper `store` (patrz niżej) |

**Reguły dla konkretnych hostów** wypisuje sekcje `credential.<url>.*`. Biją one
zwykłe ustawienie dla adresów, do których pasują, i są zwykle odpowiedzią na
„dlaczego akurat ten host zachowuje się inaczej".

## Wybieranie

| Helper | Dokąd trafia hasło |
|--------|------------------------|
| `osxkeychain` | Pęk kluczy macOS — zaszyfrowany, per użytkownik |
| `manager` | Git Credential Manager (Windows, wieloplatformowy) |
| `wincred` | Menedżer poświadczeń Windows |
| `libsecret` | Linuksowa usługa sekretów (GNOME Keyring, KWallet) |
| `cache` | Pamięć, na 15 minut. Nic na dysku |
| `store` | **Zwykły plik w twoim katalogu domowym. Bez szyfrowania** |

Gitcito oferuje to, co faktycznie jest na tej maszynie zainstalowane, zaznacza
ten pasujący do twojego systemu i wyszarza resztę.

**Zasięg ma znaczenie.** *Dla każdego repozytorium* zapisuje do twojej globalnej
konfiguracji, i tego prawie zawsze chcesz; *tylko dla tego repozytorium* jest
dla tego jednego dziwnego repozytorium, które uwierzytelnia się gdzie indziej.

## Helper `store` i `~/.git-credentials`

`store` zapisuje linie `https://user:password@host` do `~/.git-credentials`,
jawnym tekstem, bez jakiegokolwiek szyfrowania. Odczyta to wszystko, co działa
z twoimi uprawnieniami: skrypt, postinstall jakiejś zależności, cokolwiek.

Jeśli ten plik istnieje, ta strona mówi o tym i liczy wpisy. Nigdy ich nie
pokazuje — liczba jest tu całym sensem, a odczytanie zawartości po to, żeby ją
wyświetlić, byłoby dokładnie tym samym błędem.

Jeśli taki plik znajdziesz, a nie było to zamierzone: wybierz tutaj prawdziwy
helper, a potem skasuj plik i uwierzytelnij się raz od nowa.

## Zapominanie zapisanego poświadczenia

Kiedy token zostaje unieważniony albo zrotowany, helper dalej podaje stary,
a każdy push wysypuje się z 401, które nic nie nazywa. **Zapomnij** prosi
skonfigurowany helper o wymazanie swojego wpisu dla tego hosta —
`git credential reject`, czyli udokumentowana droga samego gita.

Nic po drodze nie jest odczytywane: Gitcito nigdy nie wywołuje
`git credential fill`, polecenia, które wypisałoby żywe hasło na standardowe
wyjście.

Następny push zapyta cię raz, a helper zapamięta nową odpowiedź.

## Ograniczenia warte wiedzy

- **To magazyn gita, nie Gitcito.** Zmiana tutaj zmienia też to, co robi twój
  terminal — i o to chodzi, ale warto o tym wiedzieć, zanim się coś zmieni.
- **Helpery z poziomu systemu są pokazywane, ale nieedytowalne.** Mieszkają
  w konfiguracji, do której zapisać może tylko administrator.
- **Gitcito nie potrafi wypisać tego, co helper trzyma.** Żadne API poświadczeń
  nie wystawia tego bez oddania samych sekretów, więc to okno raportuje
  konfigurację, wymazuje na żądanie i nic poza tym.
- **Token, który dałeś Gitcito, jest osobny.** Unieważnienie jednego nie rusza
  drugiego; stronę pęku kluczy opisuje [bezpieczeństwo](security.md).

Zobacz też: [Bezpieczeństwo](security.md) · [Klucze SSH](ssh-keys.md) ·
[Synchronizacja](syncing.md)
