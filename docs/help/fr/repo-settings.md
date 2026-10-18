---
title: Réglages par dépôt
category: Outils de l'espace de travail
order: 94
summary: Branches protégées, informations, statistiques d'usage, historique et journal des opérations.
keywords: réglages du dépôt repo settings branches protégées protected branches analytics journal des opérations operation log historique history info roue dentée gear image de l’onglet tab image icône logo
---

# Réglages par dépôt

La roue dentée à côté des outils de la barre d'outils ouvre les réglages qui
appartiennent à **ce** dépôt, pas à l'application.

![Les réglages par dépôt](../../screenshots/repo-settings.webp)

| Onglet | Ce qu'il contient |
|---|---|
| **Général** | Branches protégées (une sélection multiple de branches, stockée dans la configuration git), signature, l’image de l’onglet |
| **Config** | Les [règles que ce dépôt emporte](repo-config.md) dans `.gitcito.json`, et le doctor qui les vérifie |
| **Infos** | Notes et champs libres à propos de ce dépôt, conservés localement |
| **Coffre** | Les entrées de [coffre](vault.md) de ce dépôt |
| **Analyses** | Le [tableau de bord d'historique](insights.md) |
| **Statistiques d'usage** | Ce que vous avez fait dans ce dépôt, compté localement |
| **Historique** · **Journaux** | Le journal des opérations : chaque commande git que Gitcito a exécutée, avec sa sortie |

Le journal des opérations est celui qui est honnête : quand quelque chose se
comporte bizarrement, il montre la commande exacte et l'erreur exacte, pour qu'un
rapport de bug puisse porter des faits plutôt que des adjectifs.

## Image de l’onglet

Avec dix onglets ouverts, des noms qui commencent pareil — `api`,
`api-gateway`, `api-docs` — se distinguent mal. Une petite image sur l’onglet
se repère plus vite qu’un texte.

Dans **Général**, cliquez dans le champ de l’image. Il liste les images du dépôt
lui-même — PNG, JPEG, GIF, WebP, SVG, ICO, BMP et AVIF —, chacune avec sa
miniature, en commençant par les fichiers nommés comme un logo ou une icône.
Tapez pour filtrer (`logo dark` trouve `assets/logo-dark.png`), déplacez-vous
avec les flèches et validez avec Entrée ; ou saisissez un chemin à la main. Le
chemin est enregistré **relativement à la racine du dépôt** : l’image suit le
dépôt, où que se trouve son dossier.

Ce que montre l’onglet est un choix global, dans **Paramètres → Général → Les
onglets de dépôt affichent** :

| Option | L’onglet affiche |
|---|---|
| **Image et nom** (par défaut) | L’image à la place de l’icône de dossier, puis le nom |
| **Nom seul** | L’icône de dossier et le nom, comme sans image |
| **Image seule** | Seulement l’image ; le nom passe dans l’infobulle |

Les limites à connaître :

- La liste contient les fichiers que git voit — suivis et non suivis, pas les
  ignorés — et 40 au plus à la fois ; tapez pour atteindre les autres. Une image
  ignorée peut toujours être saisie à la main.
- Les images de plus de 1 Mo, ou illisibles, apparaissent grisées et ne peuvent
  pas être choisies : une icône de 20 pixels n’a pas besoin de plus.
- Un dépôt **sans** image affiche toujours son nom, quelle que soit l’option :
  un onglet vide serait impossible à identifier.
- Si le chemin est **cassé** — fichier supprimé, renommé, qui n’est pas une
  image ou trop lourd —, l’onglet revient discrètement au nom, et cet onglet de
  réglages affiche un avertissement sous le chemin. Rien d’autre ne se plaint.
- L’image est lue une fois par session. Si vous remplacez le fichier sous le
  même nom, rouvrez cet onglet de réglages pour la recharger.
- Le réglage vit dans les paramètres de Gitcito sur cette machine, pas dans le
  dépôt : vos coéquipiers n’en héritent pas.

**Voir aussi :** [Sécurité et secrets](security.md) · [Analyses](insights.md)
