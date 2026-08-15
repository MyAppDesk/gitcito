---
title: Commits signés
category: Récupération et sûreté
order: 61
summary: Signature GPG, SSH ou X.509, avec un badge de vérification par commit.
keywords: signer sign signature signing gpg ssh x509 vérifié verified badge confiance trust
---

# Commits signés

Activez la signature par dépôt (**Réglages → roue dentée du dépôt**) : GPG, SSH
ou X.509, avec la clé de votre choix. Gitcito écrit `commit.gpgsign`,
`gpg.format` et `user.signingkey` pour ce dépôt — la même configuration que lit
n'importe quel autre outil.

| | |
|---|---|
| ![Colonne de signature, thème clair](../../screenshots/signed-commits-light.webp) | ![Colonne de signature, thème sombre](../../screenshots/signed-commits-dark.webp) |

Le graphe gagne une **colonne de signature** dédiée et réordonnable :

| Badge | Signifie |
|---|---|
| **Vérifiée** | Bonne signature, avec une clé à laquelle git fait confiance |
| **Non vérifiée** | Signée, mais la clé est inconnue ou non validée |
| **Expirée** | La signature ou sa clé a expiré |
| *(rien)* | Non signé |

Les étiquettes peuvent aussi être signées — voir [Étiquettes](tags.md).

**Voir aussi :** [Sécurité et secrets](security.md)
