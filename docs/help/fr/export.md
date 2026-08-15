---
title: Bundles et archives
category: Synchronisation et multi-dépôts
order: 58
summary: Un dépôt sous forme d'un seul fichier depuis lequel git peut cloner, ou une arborescence en zip que personne n'a besoin de git pour ouvrir.
keywords: bundle git bundle archive zip tarball tar gz export exporter air gap coupure réseau hors ligne offline usb courriel email transfert export-ignore gitattributes cloner depuis un fichier plage range
---

# Bundles et archives

Deux façons de mettre un dépôt dans un seul fichier. Elles paraissent
interchangeables et ne le sont pas, et choisir la mauvaise est toute la raison
d'être de cette page.

| | Un **bundle** | Une **archive** |
|---|---|---|
| Contient | L'histoire : commits, branches, étiquettes | Les fichiers à un commit |
| Ouvert par | `git clone` / `git fetch` — c'*est* un distant | N'importe quel outil de décompression |
| Ensuite | Vous pouvez le récupérer à nouveau, fusionner, continuer à travailler | Rien. C'est un instantané |
| À utiliser pour | Déplacer du travail vers une machine sans réseau | « Envoie-moi les sources en v2.1 » |

`⌘K` → **Faire un bundle du dépôt** ou **Exporter une archive**.

![Mise en bundle d'un dépôt dans un fichier unique, avec l'option de plage prête](../../screenshots/export.webp)

## Bundles

Un bundle est la réponse de git à un fossé qu'aucun réseau ne franchit : une
machine isolée, une clé USB, une pièce jointe, un portable dans un avion. À
l'arrivée, on lance `git clone work.bundle myrepo` et on obtient un vrai dépôt,
avec votre historique et vos branches, qui récupère depuis ce fichier comme s'il
s'agissait d'un serveur.

Trois portées :

| Portée | Ce qui voyage | Taille |
|-------|--------------|------|
| **Tout** | Chaque branche et chaque étiquette, historique complet | Le dépôt entier |
| **Une branche ou une étiquette** | Cette référence et tout ce qu'elle atteint | Généralement l'essentiel |
| **Une plage de commits** | Uniquement ce qui se trouve entre les deux bouts | Petit |

**Un bundle de plage est un patch d'histoire, pas un dépôt.** Il enregistre
l'extrémité lointaine comme un *prérequis* : git refuse de l'ouvrir dans un dépôt
qui ne possède pas déjà ce commit, parce qu'il n'y aurait rien où attacher les
nouveaux commits. C'est le bon comportement, et une surprise la première fois.
Utilisez une plage quand l'autre côté a déjà votre travail jusqu'à un certain
point — l'étiquette qu'il a reçue en dernier, le commit à partir duquel vous avez
tous les deux branché.

### En recevoir un

**Importer un bundle…** lit le fichier, liste ce qu'il contient, et dit d'emblée
si ce dépôt peut s'en servir — si des prérequis manquent, il vous dit combien
plutôt que d'échouer plus tard avec les mots de git.

Les références importées atterrissent sous **`bundle/…`**, dans l'espace de noms
de suivi distant. Rien de local ne bouge : aucune branche n'est avancée
rapidement, aucun travail n'est écrasé. Vous fusionnez, rebasez ou extrayez
ensuite `bundle/main` à vos conditions, exactement comme vous le feriez pour une
branche de n'importe quel autre distant.

Pour démarrer un *nouveau* dépôt depuis un bundle, clonez plutôt depuis le
fichier dans un terminal : `git clone work.bundle myrepo`. Gitcito importe dans
un dépôt ouvert ; il ne clone pas depuis un fichier.

## Archives

`git archive` écrit l'arborescence d'un commit sous forme de zip ou de tarball.
Pas de `.git`, pas d'historique, aucun moyen d'en récupérer quoi que ce soit — ce
qui est précisément le but quand le destinataire doit recevoir du code source et
non un dépôt.

| Option | Ce qu'elle fait |
|--------|-------------|
| Référence | Branche, étiquette ou commit à exporter. Une étiquette est la réponse habituelle |
| Format | `zip`, `tar.gz` ou `tar` |
| Envelopper dans un répertoire | Ajoute un dossier de premier niveau, pour qu'un dépaquetage n'éparpille jamais de fichiers partout |
| Seulement ce chemin | Exporter un sous-répertoire au lieu de l'arborescence entière |

### export-ignore est la raison de s'en servir

Un dépôt peut marquer des chemins dans `.gitattributes` :

```
.github/     export-ignore
test/        export-ignore
*.psd        export-ignore
```

Ces chemins sont **laissés en dehors de chaque archive** tout en restant dans le
dépôt. C'est ainsi qu'un projet livre un tarball de release sans sa configuration
de CI, ses fixtures et ses 200 Mo de fichiers de design, avec la règle qui vit
dans le dépôt plutôt que dans le script de release de quelqu'un.

## Limites qu'il vaut mieux connaître

- **Un bundle est une copie complète** sauf si vous utilisez une plage. Mettre en
  bundle un dépôt de 2 Go écrit un fichier de 2 Go, et cela prend autant de temps
  qu'un clone.
- **Les bundles vides sont refusés** par git, pas par Gitcito : une plage sans
  rien entre ses deux bouts produit une erreur plutôt qu'un fichier inutile.
- **L'import ne fusionne pas.** Les références arrivent sous `bundle/…` et y
  restent tant que vous n'en faites rien.
- **Une archive n'a pas d'historique** : elle ne peut donc pas être retransformée
  en dépôt. Si le destinataire devra faire des commits, envoyez un bundle.
- **`export-ignore` n'affecte que les archives.** Il ne cache rien à un clone, à
  un bundle ni à l'historique — pour cela, voir [retirer un fichier de
  l'historique](history-purge.md).

Voir aussi : [Synchronisation](syncing.md) · [Partage sécurisé](secure-share.md) ·
[Retirer un fichier de l'historique](history-purge.md)
