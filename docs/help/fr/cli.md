---
title: La ligne de commande
category: Outils de l’espace de travail
order: 93
summary: `gitcito .` ouvre un dépôt — et `gitcito doctor` répond sans rien ouvrir.
keywords: cli ligne de commande terminal shim path installer ouvrir dossier instance unique doctor status repos commit-check config editor completions wait core.editor blame show search verbes code de sortie ci hook
---

# La ligne de commande

Deux sortes de questions se posent depuis un terminal, et `gitcito` répond aux
deux.

La première est *« montre-moi ça »* — vous êtes dans un clone, quelque chose
mérite un coup d’œil, et l’application est le bon endroit pour le regarder. Ces
invocations ouvrent une fenêtre, au plus près de ce que vous avez demandé.

La seconde est *« dis-le-moi maintenant »* — un hook, un job de CI, ou vous, au
milieu d’un tube, qui voulez une réponse et un code de sortie plutôt qu’une
fenêtre. Celles-là ne lancent jamais l’application : elles écrivent sur stdout
et s’effacent.

```sh
gitcito .                        # ouvre ce dossier
gitcito blame src/api.ts -l 84   # …sur le blame de cette ligne
gitcito doctor                   # sans fenêtre : vérifie le dépôt, sort en 1 si ça échoue
```

## L’installer

Palette de commandes (<kbd>⌘K</kbd>) → **Installer la commande 'gitcito' dans le
PATH**. Sur macOS, un petit shim est lié symboliquement dans `/usr/local/bin` ou
`/opt/homebrew/bin`, et les droits administrateur ne sont demandés que si aucun
des deux ne vous est accessible en écriture. Sur Linux, il va dans
`~/.local/bin`, qui ne demande aucun droit. Relancez la même commande pour
désinstaller. Windows n’est pas encore pris en charge.

Puis, si vous voulez :

```sh
gitcito completions zsh >> ~/.zshrc     # ou bash, ou fish
```

## Ouvrir des choses

| Commande | Ouvre |
|----------|-------|
| `gitcito [chemin]` | Le dépôt (par défaut : le dossier courant) |
| `gitcito open <nom>` | Un dépôt par le **nom de son onglet** — `gitcito open api` |
| `gitcito diff` | Les modifications en cours |
| `gitcito graph` | Le graphe des commits |
| `gitcito show <ref>` | Un commit — `HEAD~2`, une étiquette, un hash court |
| `gitcito blame <fichier>` | Le blame d’un fichier ; ajoutez `-l 84` pour tomber sur une ligne |
| `gitcito search <requête>` | La recherche de code, requête déjà saisie |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | Ce panneau |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …et ainsi de suite |

`gitcito help verbs` affiche la liste complète. Trois options valent pour toutes :
`-n <nom>` fixe le nom affiché de l’onglet, `-g <groupe>` le place dans un onglet
de groupe (créé au besoin), et `-l <n>` choisit une ligne.

Gitcito est en **instance unique** : lancer `gitcito` alors que l’application est
ouverte transmet la demande à cette fenêtre au lieu de démarrer une seconde
copie. Un chemin déjà ouvert — en onglet ou dans un groupe — reçoit **le
focus**, il n’est pas dupliqué. Un dossier qui n’est pas encore un dépôt s’ouvre
quand même, en proposant « initialiser un dépôt ici ».

## Répondre dans le terminal

Ces commandes écrivent puis se terminent. Aucune fenêtre ne s’ouvre, et
l’application n’a même pas besoin de tourner.

### `gitcito status`

Branche, suivi, avance/retard, copie de travail, remises, et — si le dépôt en
fournit une — la [liste de vérification avant push de
`.gitcito.json`](repo-settings.md). Sort en 1 quand la copie de travail est en
conflit, donc `gitcito status || echo bloqué` fonctionne.

### `gitcito doctor [--fix]`

Exécute les mêmes contrôles que le panneau de [configuration du
dépôt](repo-settings.md) : version de Node, sous-modules, LFS, `core.hooksPath`,
fichiers requis. **Sort en 1 si un contrôle échoue**, et c’est tout l’intérêt —
les règles qu’un dépôt déclare ne valent pas grand-chose si seule la personne
ayant l’interface ouverte les voit :

```yaml
- run: gitcito doctor          # en CI, avant tout ce qui coûte cher
```

`--fix` applique les réparations que le docteur sait faire (initialiser les
sous-modules, `lfs pull`, régler `core.hooksPath`, copier un fichier depuis son
exemple) puis recommence. Il n’exécute jamais une commande fournie par la
configuration : l’ensemble des réparations est fermé.

Les avertissements ne font pas échouer l’exécution. Un avertissement signifie que
le docteur n’a pas pu déterminer quelque chose, pas que quelque chose ne va pas,
et faire échouer des builds là-dessus rendrait le fichier trop coûteux à adopter.

### `gitcito commit-check [fichier]`

Analyse un message de commit. Sans argument, il lit `.git/COMMIT_EDITMSG` ;
`-m "…"` analyse une chaîne. Il sait ce que le dépôt a déclaré : une portée
inconnue est une **erreur** quand `.gitcito.json` liste des portées, et un simple
conseil de style sinon. À brancher dans un hook :

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` lit le dépôt et propose un `.gitcito.json` à partir de ce qui existe déjà
— `.nvmrc`, `.gitmodules`, un `.env.example` sans `.env`, les portées de commit
que l’historique utilise. `--dry-run` affiche au lieu d’écrire. `show` affiche le
fichier actuel ; `check` le valide et liste les champs qui seraient écartés.

### `gitcito repos [filtre]`

Tous les dépôts que Gitcito connaît — les onglets ouverts d’abord, puis les
récents — avec leur groupe. `--paths` affiche des chemins bruts, un par ligne,
pour les scripts :

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito comme éditeur de git

```sh
gitcito editor install
```

règle `core.editor` et `sequence.editor` sur `gitcito --wait`. Dès lors,
`git commit` (sans `-m`), `git commit --amend`, `git tag -a` et `git rebase -i`
ouvrent leur fichier dans Gitcito plutôt que dans vim, avec un compteur de
caractères et les mêmes conseils de message que le compositeur.

![L’éditeur que Gitcito ouvre quand git en demande un](../../screenshots/cli-edit.webp)

L’essentiel tient dans le mot **attend** : git est bloqué sur cette boîte de
dialogue. Donc

- **Enregistrer et continuer** réécrit le fichier et git poursuit.
- **Annuler** écrit un fichier vide, que git lit comme *abandon*.
- Fermer la boîte autrement — Échap, l’arrière-plan, quitter Gitcito — compte
  comme Annuler. Un terminal qui attend indéfiniment serait bien pire qu’un
  message à retaper.

Ajoutez `--local` pour n’agir que sur un dépôt, et défaites-le avec
`gitcito editor uninstall`.

## Ce qu’elle ne fera pas

- **Aucun verbe de terminal ne modifie le dépôt.** `doctor --fix` est la seule
  exception, et ses réparations forment une liste fixe qu’un fichier de
  configuration ne peut pas étendre.
- **`repos` est en lecture seule.** L’application en cours possède son fichier de
  réglages ; la CLI le lit et ne l’écrit jamais.
- **Un verbe que l’application installée ne connaît pas est ignoré**, pas
  refusé : un shim plus récent face à une application plus ancienne ouvre quand
  même le dépôt.
- **Windows n’a pas encore de shim.** Les verbes sont tous implémentés ; seul le
  chemin d’installation manque.

**Voir aussi :** [Espaces de travail, onglets et groupes](workspaces.md) ·
[Configuration du dépôt](repo-settings.md) · [Commiter](committing.md)
