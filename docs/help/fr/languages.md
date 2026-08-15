---
title: Langues et droite-à-gauche
category: Personnalisation
order: 102
summary: Choisissez votre langue d'interface par drapeau et par endonyme, avec une mise en page en miroir pour l'arabe et l'hébreu.
keywords: langue langues language languages locale locales i18n internationalisation internationalization traduction translation rtl droite à gauche right-to-left arabe hebreu hébreu miroir direction drapeau endonyme anglais espagnol allemand français portugais italien néerlandais polonais turc russe ukrainien chinois japonais coréen
---

# Langues et droite-à-gauche

L'interface de Gitcito est traduite. La langue est un réglage de
Gitcito, pas du système — un développeur sur un macOS en anglais qui préfère lire
le japonais le règle ici, et un développeur sur un système en hébreu qui préfère
l'application en anglais n'est pas contredit.

**Réglages → Général → Langue.**

![Le sélecteur de langue](../../screenshots/languages.webp)

## Ce qui est livré

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Chaque ligne du sélecteur est écrite dans sa propre langue. Quelqu'un qui cherche
le coréen balaie la liste à la recherche de 한국어, pas du mot « coréen » dans une
langue qu'il essaie justement de quitter.

### À propos des drapeaux

Un drapeau nomme un pays ; une locale nomme une langue. Les deux ne coïncident
sincèrement pas — l'arabe est langue officielle dans plus de vingt États, et le
portugais est sur deux continents. Les icônes suivent la même convention que le
sélecteur de locale de n'importe quel système d'exploitation : la région
principale de la locale. Elles sont là pour être *reconnues d'un coup d'œil*, pas
pour affirmer quoi que ce soit sur l'appartenance d'une langue.

Elles sont dessinées en vectoriel plutôt qu'en emoji, à dessein. Windows ne livre
aucun emoji de drapeau — `🇩🇪` s'y affiche comme une boîte contenant les lettres
« DE ».

## Droite à gauche

L'arabe et l'hébreu mettent toute l'interface en miroir : la barre latérale passe
à droite, les panneaux et les barres d'outils s'inversent, les icônes qui
pointent quelque part pointent dans l'autre sens.

Le changement est immédiat et ne demande aucun redémarrage.

![Gitcito en arabe, avec la mise en page en miroir](../../screenshots/rtl.webp)

### Ce qui, délibérément, ne passe pas en miroir

Certains contenus sont de gauche à droite quelle que soit la langue que vous
lisez. Les inverser serait franchement faux, et ils restent donc tels quels :

| Reste de gauche à droite | Pourquoi |
|-----------|-----|
| Le graphe des commits | Les positions des couloirs sont calculées en pixels ; un conteneur en miroir contredirait les traits dessinés |
| Les diffs et le contenu des fichiers | Le code se lit de gauche à droite, et un diff en miroir est illisible |
| Le blame et la sortie du résolveur de conflits | Même raison — ce texte est du code source, pas de la prose |
| Le terminal intégré | Il dessine sa propre grille ; la sortie de git est de gauche à droite |
| Les chemins, les SHA, les références et les commandes | `refs/heads/main` ne se lit que dans un seul sens |

Chacun de ces éléments est isolé, pour qu'une portion d'arabe *à l'intérieur* de
l'un d'eux — un nom de branche, un message de commit, un nom de fichier — ne
puisse pas réordonner le texte autour d'elle.

### Les limites

Voici où cela s'arrête, honnêtement :

- **Les messages de commit, les noms de branche et le contenu des fichiers ne
  sont jamais réorientés par Gitcito.** Ils sont affichés tels que leur auteur les
  a écrits. Un message de commit en hébreu dans une liste isolée en
  gauche-à-droite s'affiche en hébreu, mais la ligne qui l'entoure ne bascule pas
  pour lui faire de la place.
- **Les surfaces tierces gardent leur propre direction** — le terminal, c'est
  xterm, et les aperçus Markdown rendent le document tel qu'il est écrit.
- **Les noms de fichiers à direction mixte sont difficiles.** Un chemin
  comportant un dossier en arabe à l'intérieur d'une arborescence en anglais est
  isolé plutôt que réordonné, ce qui est correct mais peut malgré tout surprendre
  la première fois.

## Ce manuel aussi est traduit

Pas seulement les boutons. Chaque page que vous lisez existe dans toutes les
langues de la liste ci-dessus — les explications, les tableaux de ce que fait
chaque option, les sections qui disent ce qu'une fonctionnalité refuse de faire.
Changer la langue de l'interface change le manuel avec elle, dans l'application
comme sur le site.

Une traduction a le droit d'être incomplète. Si une page n'est pas encore
traduite, vous obtenez l'anglaise plutôt qu'une page manquante, et la barre
latérale garde la même forme dans toutes les langues, si bien qu'une capture
d'écran ou une consigne correspond toujours à ce que vous avez sous les yeux.

Sur le site, chaque page porte un sélecteur de langue qui vous laisse sur la
page que vous étiez en train de lire, parce que changer de langue n'est pas la
même chose que tout recommencer.

**Ce qui est traduit par une machine, et ce que cela coûte.** L'anglais et
l'espagnol ont été écrits à la main. Le reste a été traduit par un modèle à
partir d'un glossaire, puis vérifié par script : chaque page, chaque lien,
chaque chemin d'image, chaque bloc de code octet par octet face à l'anglais.
Cela attrape une structure cassée. Cela n'attrape pas une phrase correcte mais
raide. Si une page se lit mal dans votre langue, c'est un bug qui vaut la peine
d'être signalé.

## Ajouter une langue

Les dictionnaires sont un fichier par locale sous `src/renderer/src/i18n/`, et le
fichier anglais est la référence contre laquelle tous les autres sont vérifiés au
typage — une clé manquante est une erreur de compilation, pas un repli silencieux
vers l'anglais. La suite de tests vérifie aussi que chaque `{placeholder}` qu'une
chaîne interpole survit à la traduction : une phrase ne peut donc pas perdre son
sha de commit en passant dans une autre langue.

Le manuel fonctionne de la même façon : `docs/help/` contient les pages
anglaises et `docs/help/<locale>/` contient chaque traduction, un fichier par
page portant le même nom. `npm run lint:docs` vérifie que chaque page traduite a
bien un original anglais, que son front matter est complet, et que ses liens et
ses images se résolvent depuis un répertoire plus bas.

Les contributions sont les bienvenues — une page à la fois convient très bien,
et corriger une traduction maladroite est aussi utile qu'en ajouter une qui
manque.

**Voir aussi :** [Thèmes et apparence](themes.md) · [Profils](profiles.md)
