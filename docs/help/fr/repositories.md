---
title: Dépôts
category: Synchronisation et multi-dépôts
order: 52
summary: Tous les dépôts que Gitcito connaît, ouverts ou non, dans une liste consultable.
keywords: dépôts registre tous les dépôts favoris étoilés récents parcourir dossier explorer trouver ouvrir gérer gestion de dépôts couleur section teinte surligner espaces de travail depuis dossiers arbre générer import groupé repositories registry favourites starred recent scan folder workspaces
---

# Dépôts

Le [centre de contrôle](mission-control.md) répond à "lequel de mes dépôts
ouverts a besoin de moi ?". Il ne connaît que les onglets de l'espace de
travail actif. Dépôts répond à une autre question : **où est ce dépôt, et est-il
même ouvert quelque part ?** Il couvre tout ce que Gitcito a jamais vu. Chaque
espace de travail, chaque onglet, plus ce qu'il trouve en parcourant les
dossiers que vous lui indiquez.

![La page Dépôts : sections colorées pour les dépôts ouverts, favoris, récents
et d'espaces de travail, chaque ligne montrant le nom, le propriétaire, la
branche et l'état de travail](../../screenshots/repositories.webp)

## Les sections

Un dépôt peut apparaître dans **plus d'une section**. Exprès : chaque section
est une réponse complète à sa propre question, pas une tranche d'une seule
liste.

| Section | Ce qu'elle contient |
|---|---|
| Dépôts ouverts | Chaque onglet de l'espace de travail actif en ce moment |
| Favoris | Dépôts étoilés, dans tous les espaces de travail |
| Récents | Tout ce que vous avez ouvert, le plus récent d'abord. **Sans plafond**, contrairement à la liste de 8 entrées du lanceur |
| Une par espace de travail enregistré | Les onglets de cet espace, pour y sauter sans y basculer d'abord |
| Tous les dépôts | Chaque dépôt que le registre connaît, ouvert ou non |

La barre au-dessus de la liste est une seule bande : **Tout replier** et
**Tout déplier**, puis un champ de recherche qui prend le reste de la largeur,
puis le bascule du résumé WIP.

La recherche filtre les lignes dans toutes les sections à la fois, et **cache
les sections qui ne correspondent à rien** pour que les résultats ne soient
pas enterrés sous une colonne de titres vides. Elle correspond au nom du
dépôt, à son alias, à son propriétaire ou à n'importe quelle partie de son
chemin. Quand rien ne correspond nulle part, la page le dit au lieu de
devenir blanche.

Le champ vide, chaque section est affichée même si elle ne contient rien :
"Favoris 0" vous dit que la section existe et est vide, et ça vaut le coup de
le savoir. Ce n'est du bruit que lorsque vous cherchez déjà.

### Couleurs de section

Les sections arrivent **déjà colorées**. Chaque en-tête reçoit sa propre
teinte de la palette standard, y compris un nouvel espace de travail dès qu'il
apparaît. Le but est de s'orienter, pas de décorer : avec une section par
projet et cinq sections intégrées au-dessus, une liste longue cesse de vous
dire où vous êtes, et une teinte rend un en-tête reconnaissable avant même de
l'avoir lu.

Pour en changer une, utilisez le **⋮** de son en-tête : **Changer la
couleur…** ouvre le même [sélecteur de couleur](workspaces.md) que pour les
onglets de groupe et les dossiers, dix pastilles prédéfinies plus une valeur
hex libre. **Réinitialiser la couleur** apparaît une fois que vous avez
remplacé une section, et la remet à sa valeur attribuée par défaut.

Trois choses à savoir :

- L'attribution est **stable, pas aléatoire**. Les mêmes sections reçoivent
  les mêmes couleurs à chaque lancement, et ajouter un espace de travail ne
  recolore jamais celles au-dessus. Seules les couleurs que vous changez sont
  enregistrées.
- La couleur est **locale à cette page**. Teindre ici la section d'un espace
  ne dit rien de cet espace ailleurs dans Gitcito. La couleur de son onglet
  est un réglage à part.
- La couleur est **diluée** à un faible pourcentage de la surface plutôt
  qu'appliquée à pleine force, pour qu'un choix saturé reste un fond lisible
  en thème clair comme en thème sombre. Une couleur très pâle aura donc l'air
  presque neutre.

Au-delà de dix sections, la palette se répète, deux en-têtes peuvent donc
partager une teinte.

## Ce qui rend un dépôt connu

Une ligne existe ici dès que Gitcito l'a **ouvert** à un moment, ou l'a
trouvé sous un **dossier à parcourir**. Rien n'est indexé juste parce que ça
existe sur le disque quelque part dont vous n'avez jamais parlé à Gitcito.

Ouvrir cette page indexe aussi ce que vous avez **ouvert dans un onglet**,
c'est ainsi que les dépôts restaurés au démarrage reçoivent une ligne sans
que vous ayez à les rouvrir. Ça ne couvre que les onglets ouverts, et ça se
produit à la première visite de chaque session, pas une fois pour toutes. Un
dépôt auquel vous faites **Forget** reste oublié, sauf si vous l'ouvrez à
nouveau.

Les dossiers à parcourir se règlent dans les Paramètres :

- **Profondeur** est le nombre de niveaux de répertoires que le parcours
  descend sous la racine (3 par défaut, plafonné à 10).
- Le parcours **s'arrête à un dépôt**. Un checkout embarqué ou un sous-module
  dans un dépôt n'est pas indexé comme une ligne à part.
- Il n'entre jamais dans les répertoires qui commencent par un point, et
  ignore `node_modules` et les dossiers de dépendances du même genre.
- Il **ne lit que les noms de dossiers** : trouver un répertoire `.git` est
  ce qui fait d'une chose un dépôt ici. Nom, propriétaire et branche viennent
  de fichiers dans `.git` (`HEAD`, la config), jamais en lançant `git`.

## Les lignes

Les lignes sont posées en colonnes : étoile, nom (tient compte de l'alias si
vous l'avez renommé), propriétaire (lu dans l'URL du remote origin), pastille
de branche, résumé WIP et actions. Les colonnes sont **partagées par toute
la page**, pas dimensionnées par section, pour qu'un nom dans la dernière
section s'aligne sous un nom de la première et que la liste se lise comme un
tableau, pas comme une pile.

Les actions de fin sont visibles au repos, pas révélées au survol : **ouvrir
dans un onglet**, et un **⋮** qui ouvre le même [menu contextuel du
dépôt](repo-menu.md) qu'un clic droit. C'est le menu utilisé partout ailleurs
dans Gitcito, étendu de deux entrées propres à cette page :

| Action | Ce qu'elle fait |
|---|---|
| Étoile / retirer l'étoile | Ajoute ou retire le dépôt des Favoris |
| Locate… | Réoriente un dossier déplacé ou renommé. L'alias, le profil et l'étoile suivent. Si la destination avait déjà ses propres réglages, **c'est la destination qui l'emporte** |
| Forget | Retire l'entrée de cette liste. **Ne touche jamais le dossier sur le disque** |

Un dépôt dont le dossier n'existe plus s'affiche comme **introuvable**, avec
**Locate…** et **Forget** en ligne à la place des actions habituelles.

L'étoile est un interrupteur de favori, pas une case de sélection groupée. Le
travail par lots se fait ici par section, pas par sélection. Voir plus bas.

## Transformer un arbre de dossiers en espaces de travail

Votre dossier de code encode déjà le groupement que vous voulez. Si `~/Code`
contient `client-a`, `client-b` et `personal`, ce sont des contextes entre
lesquels vous basculez, et un [espace de travail](workspaces.md) est
exactement ça, avec sa propre bande d'onglets.

**Ajouter un dossier à parcourir…** propose de les construire. Une fois le
parcours indexé, une boîte de dialogue liste les dossiers **directement
dans** celui que vous avez choisi, avec le nombre de dépôts de chacun. Cochez
ceux que vous voulez. Chacun devient un espace de travail contenant **un
onglet par dépôt**.

| Ligne | Signification |
|---|---|
| Un nom de dossier et un compte | Cochée par défaut. Devient un espace de travail |
| "{n} nouveaux, fusionne dans …" | Un espace pour ce dossier existe déjà. Seuls les nouveaux dépôts sont ajoutés |
| "Déjà dans un espace de travail" | Rien à faire, grisé plutôt que masqué |
| Le nom de la racine elle-même | Dépôts posés en vrac dans le dossier choisi, pas dans un sous-dossier. Décochée par défaut |

Un dépôt est classé sous le **premier dossier sous la racine**, quelle que
soit sa profondeur : `~/Code/client-a/nested/app` va dans `client-a`. Les
dossiers sans dépôts ne sont pas proposés.

**Rien n'est créé tant que vous n'avez pas confirmé**, et annuler laisse
l'indexation du parcours en place. Les dépôts sont connus de toute façon,
c'est ce que faisait déjà ce bouton.

### Parcourir à nouveau plus tard

Sans danger à répéter. Un second parcours **ajoute et ne retire jamais** :

- Les nouveaux dépôts sont ajoutés à l'espace de travail correspondant.
- Les dépôts que vous avez déplacés, renommés ou retirés à la main restent
  comme vous les avez laissés.
- Un espace que vous avez **renommé** est toujours reconnu. Gitcito se
  souvient du dossier d'où il vient, donc il fusionne au lieu de créer un
  doublon.
- Un dépôt supprimé du disque garde son onglet et s'affiche introuvable.

Les espaces générés sont des espaces ordinaires. Renommez-les, réordonnez-les,
recolorez-les ou supprimez-les comme n'importe quel autre. Rien en eux ne
reste spécial.

## Fermer tout ce qui est ouvert

L'en-tête **Dépôts ouverts** porte un bouton de fermeture. **Fermer le
dépôt** quand un seul est ouvert, **Fermer tous les onglets** quand il y en
a plusieurs. Il est désactivé quand rien n'est ouvert.

Il ferme les onglets qui tiennent des dépôts et **laisse les onglets de page
tranquilles**, pour que la page Dépôts sur laquelle vous êtes ne se ferme pas
toute seule. Rien n'est touché sur le disque, et rien n'est commité, remisé
ni jeté. Un onglet n'est qu'une vue.

Fermer plusieurs demande d'abord confirmation, et dit combien. Fermer un seul
ne le fait pas : c'est une erreur bon marché, annulée par le raccourci
habituel pour rouvrir l'onglet fermé. Les onglets fermés vont sur la même
pile de dix qu'une fermeture seule, et se rouvrent dans l'ordre où ils
étaient dans la bande. Plus de dix à la fois ne peuvent pas tous revenir.

## Fetch et pull d'une section entière

Chaque en-tête de section porte un bouton **fetch** et un bouton fendu
**pull**. Ils agissent sur chaque dépôt de cette section, en sautant ceux
dont le dossier est **introuvable**. Les dépôts n'ont pas besoin d'être
ouverts. Une section de dépôts que vous n'avez jamais ouverts cette session
fonctionne pareil.

Les deux s'exécutent **à la suite**, pas en parallèle, pour qu'une section de
quarante dépôts ne lance pas quarante processus git d'un coup. La barre
d'état montre quel dépôt est en cours et où vous en êtes dans le lot, et le
lot entier se termine par **un** toast, pas un par dépôt. Si certains
échouent, le toast dit combien ont réussi et combien non. Le parcours ne
s'arrête pas au premier échec.

Le chevron à côté de **pull** choisit ce que tirer signifie :

| Mode | Ce qu'il fait |
|---|---|
| Pull (fast-forward si possible) | Le défaut de Git. Fast-forward quand il peut, fusion quand il ne peut pas |
| Pull (fast-forward uniquement) | Refuse plutôt que de créer un commit de fusion |
| Pull (rebase) | Rejoue vos commits locaux au-dessus de l'amont |

Ce choix est une **préférence globale unique**, pas une par section : il
décrit comment vous tirez, et le régler depuis le chevron d'une section le
change partout. Chaque pull **multi-dépôts** le respecte. Les boutons de
section ici, le fetch/pull d'un [onglet de groupe](workspaces.md) et le pull
groupé du [centre de contrôle](mission-control.md). Tirer un **seul** dépôt
depuis la barre d'outils n'est pas concerné, parce que ce menu vous demande
déjà quel type de pull vous voulez.

## La barre d'actions

**Ouvrir un dossier…**, **Cloner…** et **Ajouter un dossier à parcourir…**.
Trois façons de faire entrer un dépôt dans le registre de Gitcito, depuis la
même page où vous en cherchez un qui est déjà là.

## Résumé WIP

Une case à cocher optionnelle. Activée, chaque ligne **dépliée** lance un
vrai `git status` et montre le travail non validé et l'état de sync.
Désactivée, les lignes ne coûtent rien de plus que de lire des fichiers dans
`.git`.

C'est optionnel exprès : un résumé coûte à peu près cinq processus git par
dépôt, par lots de huit, pour qu'un grand registre ne fige pas l'interface.
L'activer, c'est un "regarde tout ce que je vois en ce moment" délibéré, pas
un coût permanent.

## Limites

- **Rien sur cette page ne se rafraîchit sur minuterie.** Rouvrez la page, ou
  basculez le résumé WIP off puis on, pour voir l'état actuel.
- **Le résumé WIP ne couvre que les sections dépliées.** Une section repliée
  n'affiche aucun état, case cochée ou non.
- **Un dépôt n'est connu que lorsque vous l'avez ouvert, ou parcouru un
  dossier qui le contient.** Il n'y a aucun moyen de chercher dans le système
  de fichiers depuis ici.
- **Construire des espaces de travail ne s'annule pas en une étape.** Annuler
  la boîte de dialogue ne crée rien, mais un plan que vous avez confirmé puis
  regretté se défait en supprimant les espaces à la main.
- **Un seul niveau de profondeur.** Les dossiers sous le premier niveau sont
  aplatis dans la bande d'onglets de l'espace. `client-a/nested/app` devient
  un onglet de `client-a`, pas un dossier dedans.
- **"Parcourir maintenant" des Paramètres n'offre pas ceci.** Il reparcourt
  toutes les racines configurées d'un coup, là où une boîte par dossier n'a
  pas de sens, et n'indexe que.
- **Fermer tous rouvre un onglet à la fois, jusqu'à dix.** Fermer plus de dix
  dépôts d'un coup veut dire que les plus anciens ne peuvent pas être
  rouverts depuis la pile, même s'ils sont tous encore dans **Récents**.
- **Le pull n'est pas filtré par ce qui est en retard.** Il tire chaque dépôt
  de la section, parce que savoir lesquels sont en retard impliquerait de
  faire fetch d'abord. Tirer un dépôt déjà à jour est un no-op, ça coûte du
  temps, pas de la sûreté.
- **Un fetch ou un pull de section ne s'annule pas depuis la pile d'annulation.**
  Fetch ne change rien de ce que vous aviez. Un pull qui fusionne ou rebase
  se reverse dépôt par dépôt depuis l'historique de ce dépôt, pas depuis ici.
- **Les couleurs de section sont cosmétiques.** Elles ne filtrent, ne
  trient, ne groupent ni ne synchronisent nulle part, et une couleur posée
  sur la section d'un espace n'est pas la couleur de cet espace.
- **Forget retire l'entrée de la liste, jamais du disque.** Si le dossier
  est encore là, parcourir la même racine (ou le rouvrir) le ramène tout de
  suite.

**Voir aussi :** [Centre de contrôle](mission-control.md) · [Espaces de travail, onglets et groupes](workspaces.md)
