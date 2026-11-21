---
title: Licences open source
category: Personnalisation
order: 104
summary: Lire la licence de chaque paquet tiers livré avec cette version de Gitcito.
keywords: licences licenses attribution mentions open source MIT Apache BSD tiers dépendances crédits à propos
---

# Licences open source

Gitcito repose sur quatre-vingt-dix et quelques paquets open source, et presque
tous demandent la même chose en retour : que leur mention accompagne le binaire.
MIT, BSD et Apache le disent dans leur texte même. Cette page est l’endroit où
vit cette mention, pour que l’obligation soit remplie par l’app et non par un
fichier qu’il faudrait penser à copier.

C’est aussi la réponse honnête à « qu’est-ce qui tourne vraiment sur ma
machine ».

## L’ouvrir

Cliquez sur le **numéro de version** dans la barre d’état — cela ouvre
**Nouveautés** — puis sur **Licences** dans son en-tête. Ou ouvrez la palette de
commandes et cherchez *Licences open source*. Elle s’ouvre dans son propre onglet,
comme Nouveautés.

![L’onglet des licences](../../screenshots/licenses.webp)

| Colonne | Ce que c’est |
|---------|--------------|
| Nom | Le paquet tel que publié sur npm |
| Version | La version exacte résolue par cette build |
| Badge | L’identifiant SPDX du manifeste du paquet |

Sélectionnez une ligne pour lire le texte complet de la licence livrée avec le
paquet. L’icône de lien ouvre la page du projet dans le navigateur. Le filtre
porte sur le nom du paquet et l’identifiant de licence : taper `Apache` réduit la
liste aux paquets sous licence Apache.

## Ce qu’elle couvre, et ce qu’elle ne couvre pas

La liste est générée à la build à partir de l’**arbre des dépendances de
production** — tout ce qui finit dans l’app empaquetée, y compris les dépendances
transitives que vous n’avez jamais demandées directement — plus Electron
lui-même. Les outils de build jamais livrés sont volontairement exclus.

Deux limites à connaître :

- **Quelques paquets ne livrent aucun fichier de licence.** Ils déclarent un
  identifiant dans leur manifeste, rien de plus. Ces lignes le disent au lieu
  d’inventer un texte, car une licence qu’on ne peut pas lire n’est pas une
  licence sur laquelle on peut compter.
- **L’identifiant est ce que le paquet affirme.** Gitcito l’affiche ; il ne
  l’audite pas. Si le manifeste d’un paquet est faux, cette page l’est aussi.

La licence de Gitcito lui-même est MIT, et le badge en haut à droite l’ouvre sur
GitHub.

**Voir aussi :** [Langues et droite-à-gauche](languages.md) · [Thèmes et apparence](themes.md)
