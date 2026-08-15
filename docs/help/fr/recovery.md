---
title: Récupération et le reflog
category: Récupération et sûreté
order: 60
summary: Le filet d'annulation : reflog, instantanés de travail en cours et bisect.
keywords: reflog récupération recovery annuler undo commits perdus lost commits instantanés snapshots wip travail en cours bisect bisect run automatisé script code de sortie exit code restaurer restore hard reset
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
Gitcito en prend donc des instantanés. Vos modifications suivies, plus l'index
indexé, capturés sous forme de commit `git stash create` épinglé sous
`refs/gitcito/wip`.

![Instantanés de travail en cours](../../screenshots/snapshots.webp)

- Cela **ne touche jamais à votre copie de travail** et **n'apparaît jamais dans
  votre liste de remisages** — c'est une référence cachée, pas un remisage.
- Prenez-en un à la main, ou laissez-le tourner toutes les **5 / 15 / 30
  minutes**.
- Restaurez ou supprimez n'importe quel instantané depuis la liste.

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
