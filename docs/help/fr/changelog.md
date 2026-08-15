---
title: Générateur de changelog
category: Travailler sur les changements
order: 34
summary: Transformer les commits conventionnels entre deux références en un changelog groupé.
keywords: changelog journal des modifications notes de version release notes conventional commits générer generate CHANGELOG
---

# Générateur de changelog

Donnez-lui deux références — par défaut **dernière étiquette → HEAD** — et il
transforme les commits qui les séparent en un changelog, groupé par type de
Conventional Commit.

![Le générateur de changelog](../../screenshots/changelog-gen.webp)

- Les **changements cassants** remontent en premier, quel que soit le type dont
  ils viennent.
- Puis les fonctionnalités, les correctifs, les performances, et ainsi de suite.
- Les commits qui ne suivent aucune convention atterrissent sous **Autres**
  plutôt que d'être jetés — un changelog qui perd des commits en silence est pire
  qu'un changelog en désordre.

Copiez le résultat, ou **ajoutez-le directement en tête de `CHANGELOG.md`**.

> C'est le fait d'écrire vos messages dans le [style
> Conventional](committing.md) qui rend tout ceci utile. Le générateur ne vaut
> que ce que valent les sujets qu'il lit.

**Voir aussi :** [Commits](committing.md) · [Hébergement et pull requests](hosting.md)
