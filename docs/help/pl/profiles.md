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

## Każdy profil ze swoimi kontami

Oprócz tokenu profil może **powiązać** logowanie, które już jest na komputerze —
z credential helpera gita albo z GitHub CLI — w Ustawienia → Integracje.
Powiązanie należy do jednego profilu: nowy profil zaczyna niepołączony, a konto,
które ma już inny profil, zostaje odrzucone, więc dwa profile mogą mieć obok
siebie dwa konta GitHub (lub Azure DevOps). Zobacz [Hosting](hosting.md).

## Powiązanie z repozytorium

Repozytorium da się **przypiąć do profilu**, dzięki czemu fetch w tle zawsze
uwierzytelnia się na właściwym koncie — nawet gdy właśnie patrzysz na
repozytorium należące do tego drugiego.

Tokeny mieszkają w twoim [pęku kluczy systemu](security.md), nigdy w pliku
ustawień.

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md) · [Hosting](hosting.md)
