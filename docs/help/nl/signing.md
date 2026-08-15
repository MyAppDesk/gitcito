---
title: Ondertekende commits
category: Herstel & veiligheid
order: 61
summary: Ondertekenen met GPG, SSH of X.509, met een verificatiebadge per commit.
keywords: ondertekenen sign signing gpg ssh x509 verified handtekening signature badge vertrouwen trust
---

# Ondertekende commits

Zet ondertekenen aan per repository (**Instellingen → repo-tandwiel**): GPG, SSH
of X.509, met de sleutel die jij kiest. Gitcito schrijft `commit.gpgsign`,
`gpg.format` en `user.signingkey` voor die repository — dezelfde config die elk
ander gereedschap leest.

| | |
|---|---|
| ![Handtekeningkolom, licht](../../screenshots/signed-commits-light.webp) | ![Handtekeningkolom, donker](../../screenshots/signed-commits-dark.webp) |

De grafiek krijgt een eigen, verplaatsbare **handtekeningkolom**:

| Badge | Betekent |
|---|---|
| **Geverifieerd** | Goede handtekening van een sleutel die git vertrouwt |
| **Niet geverifieerd** | Ondertekend, maar de sleutel is onbekend of niet gevalideerd |
| **Verlopen** | De handtekening of zijn sleutel is verlopen |
| *(niets)* | Niet ondertekend |

Tags kunnen ook ondertekend worden — zie [Tags](tags.md).

**Zie ook:** [Beveiliging & geheimen](security.md)
