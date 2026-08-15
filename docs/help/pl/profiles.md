---
title: Profile
category: Dostosuj do siebie
order: 101
summary: Osobne tożsamości i tokeny do pracy i do całej reszty.
keywords: profil profile tożsamość git użytkownik e-mail tokeny konta przełączanie identity user email accounts switch
---

# Profile

Profil wiąże **tożsamość Gita** (imię i adres e-mail) z jej **tokenami
integracji**. Przełącz profil, a zmieniają się oba naraz — commity są
podpisywane właściwym autorem, a wywołania API korzystają z właściwego konta.

Przydatne, gdy ta sama maszyna obsługuje repozytoria służbowe i prywatne albo
gdy masz dwa konta GitHub.

![Profil: tożsamość gita z jednej strony, jej tokeny integracji z drugiej](../../screenshots/settings-profiles.webp)

## Powiązanie z repozytorium

Repozytorium da się **przypiąć do profilu**, dzięki czemu fetch w tle zawsze
uwierzytelnia się na właściwym koncie — nawet gdy właśnie patrzysz na
repozytorium należące do tego drugiego.

Tokeny mieszkają w twoim [pęku kluczy systemu](security.md), nigdy w pliku
ustawień.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Hosting](hosting.md)
