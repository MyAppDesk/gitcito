---
title: Coffre
category: Sécurité
order: 71
summary: Un magasin local et chiffré pour les secrets dont un dépôt a besoin — jamais validés.
keywords: coffre vault secrets env trousseau keychain chiffré encrypted local par dépôt per-repo global copier copy
---

# Coffre

Les valeurs `.env` dont un projet a besoin doivent bien vivre quelque part. Le
coffre est ce quelque part, sans qu'elles finissent dans le dépôt.

![Le coffre](../../screenshots/vault.webp)

- **Chiffré au repos** avec le trousseau de votre système.
- **Deux portées** : des entrées rattachées à un dépôt, et un jeu **global** que
  vous pouvez référencer de partout.
- **Ce n'est pas un fichier, et cela n'a rien à voir avec votre `.env`.** Les
  entrées sont *associées* à un dépôt mais jamais écrites dedans, jamais
  validées, jamais poussées.
- **Rien ne quitte jamais votre machine.** Pas de synchronisation, pas de cloud.

## S'en servir

Ouvrez-le avec <kbd>⌘⇧V</kbd>, depuis le menu Outils, depuis les réglages, ou
depuis la palette de commandes. Passez d'un dépôt connu à l'autre, révélez ou
copiez une valeur, ou faites **Copier comme .env** d'un jeu entier directement
dans le presse-papiers.

## Le déplacer entre machines

Le [partage sécurisé](secure-share.md) peut emballer le coffre dans un bundle
chiffré — et uniquement quand vous demandez explicitement que les secrets y
soient inclus.

**Voir aussi :** [Sécurité et secrets](security.md) · [Partage sécurisé](secure-share.md)
