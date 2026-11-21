---
title: Vérification de l’environnement
category: Pour commencer
order: 6
summary: Ce dont Gitcito dépend hors de sa propre installation — git, LFS, le terminal natif, le credential helper de git, la CLI GitHub et la surveillance des fichiers — vérifié en un seul endroit.
keywords: environnement environment docteur diagnostic vérification git version lfs node-pty terminal shell basique credential helper store gh github cli scopes workflow inotify max_user_watches
---

# Vérification de l’environnement

Certaines pannes ne viennent pas du dépôt du tout, mais de la machine : un git
trop ancien pour la connexion par profil, un terminal retombé en silence en mode
basique, une connexion de la CLI GitHub incapable de pousser des fichiers de
workflow. Chacune réapparaît plus tard sous forme d’erreur vague, au milieu d’autre
chose. **Réglages → Environnement** (aussi *Settings: Environment* dans la palette
de commandes) les vérifie d’avance.

Le [docteur du dépôt](repo-settings.md) répond à une autre question : si *ce dépôt*
peut être construit ici, d’après ce que demande son `.gitcito.json`. La
vérification de l’environnement concerne l’app elle-même et est la même pour tous
les dépôts.

![Vérifications de l’environnement dans les Réglages](../../screenshots/settings-environment.webp)

## Ce qui est vérifié

| Ligne | Vert signifie | Jaune ou rouge signifie |
|-------|---------------|-------------------------|
| **Git** | git 2.31 ou plus récent est dans le `PATH` | Antérieur à 2.31 : le compte d’un [profil](profiles.md) ne peut pas s’authentifier pour fetch et push. Absent : rien ne fonctionne tant que git n’est pas installé |
| **Git LFS** | `git lfs` est installé | Non installé. Seuls les dépôts qui stockent des fichiers dans LFS en ont besoin |
| **Terminal** | Le terminal natif s’est chargé | Le [terminal](terminal.md) tourne en mode basique : pas de couleurs, pas de redimensionnement, pas de programmes plein écran |
| **Credential helper** | git a un helper pour les mots de passe HTTPS — global, ou pour certains hôtes (ce que configure `gh auth setup-git`) | Pas de helper, donc git hors de Gitcito redemande à chaque fois. Ou `store`, qui les garde en clair. Voir [Credential helper](credentials.md) |
| **CLI GitHub** | `gh` est connecté avec le scope `workflow` | Connecté sans lui : GitHub refuse tout push qui modifie `.github/workflows` |
| **Surveillance des fichiers** (Linux) | La limite inotify vaut au moins 65 536 | Une limite plus basse s’épuise avec quelques gros dépôts ouverts, et les nouveaux dossiers ne rafraîchissent plus le statut |

Une ligne sans objet est omise : la CLI GitHub quand elle n’est pas installée ou
pas connectée, la surveillance des fichiers sous macOS et Windows.

## Corriger ce qu’elle trouve

Quand il existe une correction, la ligne l’affiche sous forme de commande avec un
bouton de copie. Par exemple, `gh auth refresh -h github.com -s workflow` ajoute
le scope manquant, et une ligne `sysctl` relève la limite inotify. **La page
n’exécute jamais rien elle-même.** Certaines corrections exigent `sudo` ou
modifient la configuration globale : à vous de les lire avant de les lancer.
Ensuite, cliquez sur **Vérifier à nouveau**.

## Limites

- Elle vérifie ce que l’app voit depuis son propre processus. Un profil de shell
  qui modifie le `PATH` seulement dans votre terminal peut faire diverger les deux.
- La ligne de la CLI GitHub reflète la connexion propre à `gh`, pas les comptes
  connectés dans **Réglages → Intégrations**. Ce sont des identités distinctes. Un
  scope `workflow` manquant là-bas se manifeste plutôt par un push refusé.
- Elle signale ce qui est installé. Elle n’installe ni ne met à jour quoi que ce
  soit.
