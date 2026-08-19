---
title: Récupération et le reflog
category: Récupération et sûreté
order: 60
summary: Le filet d'annulation : reflog, instantanés de travail en cours et bisect.
keywords: reflog récupération recovery annuler undo commits perdus lost commits instantanés snapshots wip travail en cours garde-fou guard non suivi untracked abandonner discard nettoyer clean bisect bisect run automatisé script code de sortie exit code restaurer restore hard reset
---

# Récupération et le reflog

Git ne perd presque jamais rien. Le difficile, c'est de le retrouver.

## Reflog

Chaque mouvement de `HEAD` — et de chaque branche — avec ce qui l'a provoqué :
extraction, réinitialisation, rebase, amendement, un fetch forcé. Depuis
n'importe quelle entrée passée, vous pouvez l'**extraire**, en **créer une
branche**, ou y **faire un reset hard**.

![La visionneuse de reflog](../../screenshots/reflog.webp)

C'est le bouton « je viens de réinitialiser la mauvaise branche ».

## Instantanés de travail en cours

Le travail non validé est la seule chose que le reflog ne peut pas sauver :
Gitcito en prend donc des instantanés. La **copie de travail entière — fichiers
modifiés, indexés et non suivis** — validée via un index jetable et épinglée
sous `refs/gitcito/wip`. Ni votre index réel ni votre liste de remisages ne
sont touchés.

![Instantanés de travail en cours](../../screenshots/snapshots.webp)

Trois choses en prennent un :

| Déclencheur | Quand |
|---------|------|
| **Garde-fou** | Automatiquement, juste avant une action destructrice — abandon des modifications, nettoyage, reset hard, restauration depuis un commit. Activé par défaut ; à basculer dans la boîte de dialogue des instantanés. |
| **Minuteur** | Toutes les 5 / 15 / 30 minutes tant que le dépôt est ouvert. |
| **À la main** | Le bouton **Instantané maintenant**. |

Le garde-fou est celui qui compte : le moment où le travail se perd
généralement à jamais, c'est la seconde qui suit un abandon que vous ne vouliez
pas. Avec le garde-fou activé, cet état est un instantané — ouvrez la liste,
cliquez sur restaurer, respirez à nouveau.

Sélectionnez un instantané pour voir les fichiers qu'il a capturés,
prévisualiser le changement de n'importe quel fichier, et restaurer un **seul
fichier** ou toute la copie de travail. La restauration copie les fichiers de
l'instantané par-dessus les copies actuelles — un instantané de garde-fou est
pris d'abord, donc une restauration est elle-même annulable.

**Limites à connaître.** Un passage du minuteur ou du garde-fou qui ne trouve
rien de nouveau n'enregistre rien. La restauration écrase et recrée des
fichiers, mais ne supprime jamais un fichier créé après l'instantané. Les
fichiers ignorés ne sont pas capturés. Les instantanés sont des références
cachées locales : jamais poussées, à l'abri de `git gc`, les 50 plus récentes
conservées.

## Bisect guidé

Marquez les commits bons et mauvais, regardez la plage se resserrer, atterrissez
sur le premier commit défectueux. Gitcito suit combien d'étapes il reste, pour
que vous sachiez si vous êtes à deux questions de la réponse ou à dix.

![Bisect guidé](../../screenshots/bisect.webp)

### Laisser une commande décider

Une fois la plage amorcée, **Laisser une commande décider** confie toute la
recherche à `git bisect run`. Git extrait chaque candidat, exécute votre
commande, et lit son code de sortie :

| Code de sortie | Signifie |
|-----------|-------|
| `0` | Bon — le bug n'est pas là |
| `125` | Impossible de tester celui-ci ; le sauter |
| n'importe quoi d'autre | Mauvais |

Une suite de tests parle déjà cette langue, ce qui explique pourquoi `npm test`
est généralement toute la réponse. Gitcito propose les propres scripts de ce
projet en remplissage d'un clic, diffuse la sortie pendant l'exécution, et
atterrit sur le premier commit défectueux sans que vous répondiez à la moindre
question.

![Le champ de commande, prêt à confier la recherche à une suite de tests](../../screenshots/bisect-run.webp)

**Ce à quoi il faut faire attention.** La commande s'exécute sur *chaque* commit
que git teste : une commande qui déploie, publie ou écrit en dehors du dépôt le
fera donc plusieurs fois de suite. Tenez-vous-en à quelque chose qui ne fait que
lire et rapporter. **Arrêter** tue l'exécution et laisse la session ouverte, pour
que vous puissiez continuer à marquer à la main ; **Abandonner** met fin au
bisect entièrement.

Une commande qui échoue pour une raison sans rapport — une dépendance manquante à
ce point de l'histoire, par exemple — marque un bon commit comme mauvais et
envoie la recherche au mauvais endroit. Sortir avec `125` depuis un script
enveloppe est la porte de sortie que git prévoit pour cela.

## Annuler / rétablir

La plupart des opérations empilent une entrée sur une pile d'annulation :
<kbd>⌘Z</kbd> défait donc la dernière, là où git le permet.

**Voir aussi :** [Ce qui a changé depuis](range-diff.md) · [Remisages](stashes.md)
