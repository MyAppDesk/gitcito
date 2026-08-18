---
title: Discussion du dépôt
category: IA
order: 82
summary: Posez des questions sur ce dépôt, avec les fichiers et les commits que vous épinglez comme contexte — et laissez-la proposer des actions git que vous approuvez avant leur exécution.
keywords: discussion chat question assistant contexte épingler joindre glisser déposer commit fichier preuve ancré ia panneau actions exécuter approuver approbation automatique autoriser corriger erreur notification
---

# Discussion du dépôt

Certaines questions sont plus rapides à poser qu’à chercher. *Où se fait
réellement le rafraîchissement du jeton ? Qu’a changé ce commit, en une phrase ?
Pourquoi ce fichier existe-t-il ?* La discussion du dépôt répond sur le dépôt
ouvert et montre les lignes sur lesquelles elle s’est appuyée.

Elle partage la colonne de droite avec **Détails** : les onglets du haut passent
de l’un à l’autre, sans que le graphe perde sa sélection.

![La discussion du dépôt avec du contexte épinglé](../../screenshots/repo-chat.webp)

## Ce qu’elle lit

Chaque réponse se construit en deux passes. La première choisit un petit
ensemble de chemins et de recherches littérales dans la liste des fichiers
suivis du dépôt. La seconde répond en n’utilisant que les extraits rapportés, et
ne peut citer qu’eux : un fichier ou une ligne inventés sont une erreur de
validation, pas une réponse plausible.

| Inclus | Exclu |
|---|---|
| Les fichiers suivis, tels qu’ils sont dans votre copie de travail | Les fichiers non suivis |
| Les diffs indexés et non indexés des fichiers suivis | Tout ce qui correspond à une règle d’exclusion, même suivi |
| Branche, avance/retard et liste des chemins modifiés | [Fichiers ressemblant à des secrets](security.md), binaires, chemins générés |

Lire la copie de travail permet de parler de modifications non validées. Cela
signifie aussi qu’elles quittent votre machine : le fournisseur configuré dans
[Fonctions d’IA](ai.md) les reçoit.

Une nuance : avec les [propositions d’actions](#exécuter-des-actions-depuis-la-discussion)
activées, les **noms** des fichiers non suivis sont inclus dans l’état du
dépôt — « indexe le nouveau fichier » en a besoin — mais leur contenu n’est
toujours jamais lu.

## Épingler du contexte

Le modèle décide de ce qu’il lit. Épingler, c’est passer outre : ce qui est
épinglé est lu **en premier** et prend la plus grande part du budget de contexte.

Quatre façons d’épingler, toutes vers la même rangée de pastilles au-dessus du
champ de saisie :

| Faites ceci | Vous obtenez |
|---|---|
| Cliquez une pastille suggérée | Le fichier ouvert dans la visionneuse, ou le commit sélectionné dans le graphe |
| Glissez une ligne de l’onglet **Fichiers** | Ce fichier |
| Glissez une ligne du **graphe des commits** | Ce commit — son message et son diff par blocs |
| **+** → *Choisir un fichier…*, ou glissez depuis le Finder/l’Explorateur | N’importe quel fichier du disque, y compris hors du dépôt |

Les pastilles restent épinglées pour les questions suivantes ; le `×` en retire
une, et effacer la conversation les retire toutes. Huit au maximum.

Un commit épinglé apporte son message et jusqu’à douze blocs de diff. Les blocs
touchant un chemin exclu sont retirés de ce diff, pas le commit entier.

## Réglages

**Réglages → IA → Discussion du dépôt** :

| Réglage | Effet |
|---|---|
| **Poser des questions sur le dépôt** | Désactivé, l’onglet, le bouton et la cible du raccourci disparaissent. Le reste de l’IA continue |
| **Modèle de la discussion** | Un modèle réservé à la discussion. Vide : celui du profil — poser une question coûte moins qu’une relecture, un modèle plus petit suffit souvent |
| **Contenu validé uniquement** | Répond depuis le dernier commit plutôt que la copie de travail : les modifications non validées ne quittent jamais la machine |
| **Proposer des actions git dans la discussion** | Désactivé, la discussion redevient purement en lecture seule : plus de cartes d’actions ni de menu d’approbation |
| **Comment s’exécutent les actions proposées** | Le mode d’approbation — voir [Modes d’approbation](#modes-dapprobation). Les actions destructrices confirment quoi qu’il arrive |

Avec l’IA entièrement désactivée, la discussion disparaît avec elle : plus de
panneau proposant une réponse que rien ne peut produire.

Le modèle de la discussion se change aussi depuis l’en-tête du panneau, à côté
du nom du fournisseur : même réglage, sans ouvrir les Réglages.

![Réglages de la discussion du dépôt](../../screenshots/settings-repo-chat.webp)

## Travailler avec les messages

Les messages sont du texte ordinaire. Sélectionnez n'importe quelle partie et
copiez-la, ou faites un clic droit sur une bulle : **Copier** prend la
sélection, **Copier le message** le message entier — une réponse est copiée
sous sa forme Markdown — et, si le clic a atterri sur un lien, **Copier le
lien** prend son adresse.

Les liens s'ouvrent dans votre navigateur par défaut, jamais dans Gitcito —
qu'il s'agisse des liens Markdown des réponses ou des adresses `https://`
écrites dans vos propres messages.

Quand un message mentionne une image — un chemin du dépôt comme
`docs/logo.png`, ou une URL se terminant par une extension d'image — survoler
la mention affiche un petit aperçu. Les chemins du dépôt sont lus depuis votre
arbre de travail ; une mention qui ne correspond pas à une image lisible
n'affiche simplement rien.

![Aperçu d'image au survol](../../screenshots/repo-chat-image-hover.webp)

## Exécuter des actions depuis la discussion

Demandez un changement plutôt qu’un fait — *indexe les fichiers markdown,
valide ceci comme un correctif, mets la sortie du build dans les exclusions* —
et la réponse arrive avec une **carte d’actions** : les étapes concrètes que
l’assistant veut effectuer, une ligne par action, avec les boutons **Exécuter**
et **Ignorer**. Rien de ce que contient la carte n’a encore eu lieu ; le modèle
ne peut que proposer, et chaque proposition est vérifiée contre la copie de
travail avant même que vous la voyiez — une action nommant un fichier qui
n’existe pas est rejetée, pas affichée.

![Actions proposées dans la discussion](../../screenshots/repo-chat-actions.webp)

L’ensemble d’actions est le même que celui de l’assistant **Exécuter** de la
barre d’outils : motifs d’exclusion, indexer, désindexer, valider, remiser,
abandonner, créer une branche, basculer de branche, étiqueter. Tout ce qui
dépasse — push, pull, reset, rebase, opérations forcées — est refusé par
conception ; la discussion vous dira d’utiliser l’interface dédiée à la place.

### Modes d’approbation

Le menu au bouclier sous le champ de saisie (aussi dans **Réglages → IA →
Discussion du dépôt**) décide de la façon dont une carte s’exécute :

| Mode | Exécute |
|---|---|
| **Toujours demander** | Rien tant que vous n’avez pas pressé **Exécuter** sur la carte |
| **Exécuter automatiquement les actions sûres** | Les propositions faites uniquement d’opérations réversibles — indexer, désindexer, exclure, branche, étiquette — s’exécutent à l’arrivée ; le reste attend le bouton |
| **Exécuter automatiquement toutes les actions** | Chaque proposition s’exécute à l’arrivée, sauf les destructrices |

Une proposition qui **abandonnerait des modifications non validées demande
toujours d’abord**, dans tous les modes, et la confirmation nomme les fichiers
qui seraient perdus. La carte rapporte ce qui s’est réellement passé — combien
d’actions ont été exécutées, ou l’erreur qui les a arrêtées — et l’assistant est
informé du résultat : une question de suivi sait si son plan a été exécuté ou
ignoré.

### Corriger les erreurs avec l’assistant

Quand une opération git échoue et que la discussion IA est disponible, la
notification d’erreur gagne un bouton étincelle : il ouvre la discussion avec
l’échec collé dans le champ de saisie — « pourquoi cela a-t-il échoué et que
faire » tient en un clic. Le brouillon est modifiable ; rien n’est envoyé avant
que vous pressiez Envoyer.

## Ce qu’elle refuse

- **Les fichiers qui ressemblent à des secrets ne sont jamais lus**, épinglés ou
  non : la pastille revient marquée comme ignorée, avec la raison. Épingler ne
  contourne pas le [masquage des secrets](security.md).
- **Les binaires et les fichiers de plus de 512 Ko** venus de l’extérieur du
  dépôt sont ignorés de la même façon. À l’intérieur, les règles habituelles
  s’appliquent.
- **Elle n’écrit jamais d’elle-même.** Le modèle n’a aucun outil, seulement du
  texte : un changement arrive comme carte de proposition, ne s’exécute que
  selon [vos règles d’approbation](#modes-dapprobation), et une étape
  destructrice confirme toujours. Avec **Proposer des actions git dans la
  discussion** désactivé, elle ne propose même pas.
- **Les conversations ne vivent qu’en mémoire.** Chaque dépôt garde son fil ;
  quitter Gitcito les efface.

## L’ouvrir

| Touches | Effet |
|---|---|
| Le bouton bulle dans la barre d’outils | Affiche ou masque l’onglet Discussion |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Affiche ou masque tout le panneau droit |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Entrée</kbd> | Envoie le message |

Voir [Clavier et raccourcis](keyboard.md) pour le reste, y compris comment
réassigner les bascules de panneau.

**Voir aussi :** [Fonctions d’IA](ai.md) · [Sécurité et secrets](security.md) ·
[Wiki du dépôt](repo-wiki.md)
