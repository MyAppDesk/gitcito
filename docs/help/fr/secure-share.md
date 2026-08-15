---
title: Partage sécurisé
category: Sécurité
order: 72
summary: Déplacer des réglages, des entrées de coffre ou un espace de travail entier d'une machine à l'autre.
keywords: partage sécurisé secure share export exporter import importer bundle chiffré encrypted réglages settings espace de travail workspace transfert machine
---

# Partage sécurisé

Mettre en route une nouvelle machine veut d'habitude dire tout ressaisir. Le
partage sécurisé emballe tout dans un seul bundle chiffré à la place.

![Export des réglages d'un dépôt sous forme de bundle chiffré](../../screenshots/secure-share.webp)

![Le même export pour un espace de travail entier](../../screenshots/secure-workspace.webp)

## Ce qui peut y entrer

| Section | Contenu |
|---|---|
| **Réglages** | Thèmes, disposition, raccourcis, préférences |
| **Coffre** | Secrets globaux et par dépôt |
| **Dépôts** | Les dépôts d'un espace de travail, appariés à l'import par distant ou par dossier |

Les secrets ne sont inclus que si vous **cochez la case**. Un bundle sans cette
case ne contient aucun identifiant.

## Importer

L'écran d'import montre ce qu'il y a dedans **avant** d'appliquer quoi que ce
soit, section par section, et les dépôts sont appariés à ce que vous possédez
déjà — d'abord par URL de distant, puis par dossier — de sorte qu'importer ne
reclone pas le monde entier.

**Voir aussi :** [Coffre](vault.md) · [Sécurité et secrets](security.md)
