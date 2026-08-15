---
title: Assistant d'identifiants
category: Sécurité
order: 73
summary: Le magasin de mots de passe propre à git — le troisième — et pourquoi https vous redemande sans arrêt.
keywords: assistant d'identifiants credential helper mot de passe password https redemande osxkeychain wincred manager libsecret store cache git-credentials texte clair plaintext oublier forget révoqué revoked jeton token 401
---

# Assistant d'identifiants

Gitcito détient trois sortes de secrets différentes, et on suppose
raisonnablement qu'il s'agit d'une seule chose :

| | Détenu par |
|---|---|
| Les jetons d'API de l'hébergeur — PR, tickets, vérifications de CI | Gitcito, dans le [trousseau du système](security.md) |
| Le transport `git@…` | Votre [clé SSH](ssh-keys.md), via l'agent ssh du système |
| **Le transport `https://`** | **L'assistant d'identifiants propre à git** |

Le troisième n'est une fonctionnalité aux yeux de personne jusqu'à ce qu'il
déraille, et il produit alors les deux plaintes les plus courantes de git :
*pourquoi me redemande-t-il ?* et *pourquoi envoie-t-il encore le jeton que j'ai
révoqué ?*

`⌘K` → **Assistant d'identifiants**.

![L'assistant configuré, les règles par hôte, et l'avertissement sur le fichier en clair](../../screenshots/credentials.webp)

## Ce que vous regardez

Chaque `credential.helper` configuré, dans la portée d'où il vient — `system`,
`global`, puis ce dépôt. **Les assistants s'empilent** : git interroge chacun à
son tour, et un assistant au niveau du dépôt ne remplace pas un assistant global.

Chacun est confronté à votre machine :

| Indicateur | Signifie |
|------|-------|
| **prêt** | Le programme assistant existe et s'exécutera |
| **non installé** | Configuré, mais le programme est absent — chaque demande retombe sur une saisie manuelle |
| **mots de passe dans un fichier en clair** | L'assistant `store` (voir ci-dessous) |

**Règles pour des hôtes spécifiques** liste les sections `credential.<url>.*`.
Elles l'emportent sur le réglage simple pour les URL qu'elles couvrent, et sont
généralement la réponse à « pourquoi cet hôte-là se comporte-t-il
différemment ».

## En choisir un

| Assistant | Où va le mot de passe |
|--------|------------------------|
| `osxkeychain` | Le trousseau macOS — chiffré, par utilisateur |
| `manager` | Git Credential Manager (Windows, multiplateforme) |
| `wincred` | Le gestionnaire d'identifiants Windows |
| `libsecret` | Le service de secrets Linux (GNOME Keyring, KWallet) |
| `cache` | La mémoire, pendant 15 minutes. Rien sur le disque |
| `store` | **Un simple fichier dans votre répertoire personnel. Non chiffré** |

Gitcito propose ce qui est réellement installé sur cette machine, marque celui
qui correspond à votre système, et grise le reste.

**La portée compte.** *Pour tous les dépôts* écrit dans votre configuration
globale, ce que vous voulez presque toujours ; *pour ce dépôt uniquement* est
réservé au dépôt inhabituel qui s'authentifie contre autre chose.

## L'assistant `store`, et `~/.git-credentials`

`store` écrit des lignes `https://user:password@host` dans `~/.git-credentials`,
en texte clair, sans chiffrement d'aucune sorte. Tout ce qui s'exécute sous votre
identité peut le lire : un script, le postinstall d'une dépendance, n'importe
quoi.

Si ce fichier existe, cette page le dit et compte les entrées. Elle ne les
affiche jamais — le compteur est tout l'intérêt, et lire le contenu pour
l'afficher serait exactement la même erreur.

Si vous en trouvez un sans l'avoir voulu : choisissez ici un vrai assistant, puis
supprimez le fichier et réauthentifiez-vous une fois.

## Oublier un identifiant stocké

Quand un jeton est révoqué ou changé, l'assistant continue de tendre l'ancien et
chaque push échoue avec un 401 qui ne nomme rien. **Oublier** demande à
l'assistant configuré d'effacer son entrée pour cet hôte — `git credential
reject`, la voie documentée par git lui-même.

Rien n'est lu au passage : Gitcito n'appelle jamais `git credential fill`, la
commande qui imprimerait un mot de passe actif sur la sortie standard.

Le push suivant vous demande une fois, et l'assistant stocke la nouvelle réponse.

## Limites qu'il vaut mieux connaître

- **C'est le magasin de git, pas celui de Gitcito.** Le modifier modifie aussi ce
  que fait votre terminal — c'est le but, et cela vaut la peine de le savoir
  avant de le modifier.
- **Les assistants au niveau système sont affichés, pas modifiables.** Ils vivent
  dans une configuration que seul un administrateur peut écrire.
- **Gitcito ne peut pas lister ce qu'un assistant détient.** Aucune API
  d'identifiants ne l'expose sans livrer les secrets : la boîte de dialogue
  rapporte donc la configuration et efface sur demande, rien de plus.
- **Un jeton que vous avez confié à Gitcito est séparé.** En révoquer un ne
  touche pas à l'autre ; voir [sécurité](security.md) pour le côté trousseau.

Voir aussi : [Sécurité](security.md) · [Clés SSH](ssh-keys.md) ·
[Synchronisation](syncing.md)
