---
title: Étiquettes et releases
category: Synchronisation et multi-dépôts
order: 53
summary: Étiquettes légères, annotées ou signées — locales et distantes.
keywords: étiquette étiquettes tag tags annotée annotated signée signed release publier push supprimer delete distant remote
---

# Étiquettes et releases

Créez une étiquette depuis n'importe quel commit :

| Type | Quand |
|---|---|
| **Légère** | Un pointeur. Suffisant pour un repère personnel |
| **Annotée** | Porte un message, un auteur et une date — ce que devrait être une release |
| **Signée** | Annotée, plus une signature GPG/SSH |

![Créer une étiquette : nom, message optionnel, et faut-il la signer](../../screenshots/create-tag.webp)

Supprimez des étiquettes en local, publiez-les, ou supprimez-les sur le distant.
Les étiquettes distantes se parcourent sans avoir à toutes les récupérer d'abord.

Sur GitHub, les **releases** publiées sont listées dans la barre latérale avec
une page de changelog — voir [Hébergement](hosting.md). Pour rédiger les notes,
utilisez le [générateur de changelog](changelog.md).

**Voir aussi :** [Commits signés](signing.md) · [Générateur de changelog](changelog.md)
