---
title: Podpisane commity
category: Odzyskiwanie i ochrona
order: 61
summary: Podpisywanie GPG, SSH albo X.509, z plakietką weryfikacji przy każdym commicie.
keywords: podpis podpisywanie gpg ssh x509 zweryfikowany plakietka zaufanie sign signing verified signature badge trust
---

# Podpisane commity

Włącz podpisywanie dla każdego repozytorium osobno (**Ustawienia → koło zębate
repozytorium**): GPG, SSH albo X.509, kluczem, który wybierzesz. Gitcito
zapisuje dla tego repozytorium `commit.gpgsign`, `gpg.format`
i `user.signingkey` — tę samą konfigurację, którą czyta każde inne narzędzie.

| | |
|---|---|
| ![Kolumna podpisu, jasna](../../screenshots/signed-commits-light.webp) | ![Kolumna podpisu, ciemna](../../screenshots/signed-commits-dark.webp) |

Graf zyskuje dedykowaną, przestawialną **kolumnę podpisu**:

| Plakietka | Oznacza |
|---|---|
| **Zweryfikowany** | Dobry podpis kluczem, któremu git ufa |
| **Niezweryfikowany** | Podpisany, ale klucz jest nieznany albo niezwalidowany |
| **Wygasły** | Podpis albo jego klucz wygasły |
| *(nic)* | Niepodpisany |

Tagi też da się podpisywać — zobacz [Tagi](tags.md).

**Zobacz też:** [Bezpieczeństwo i sekrety](security.md)
