---
title: Sécurité et secrets
category: Sécurité
order: 70
summary: Le masquage, les garde-fous, le trousseau — et ce que Gitcito refuse de faire.
keywords: sécurité security secrets masquage masking trousseau keychain safeStorage jetons tokens branche protégée protected branch gros fichier large file garde-fou guard confidentialité privacy
---

# Sécurité et secrets

Gitcito n'a **aucun backend**. Les seuls appels réseau vont vers votre hébergeur
Git et, si vous l'activez, vers votre fournisseur d'IA.

![Les réglages de sécurité](../../screenshots/settings-security.webp)

## Masquage des secrets

Les valeurs contenues dans `.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.*`
et consorts s'affichent en `KEY=••••••` dans les vues diff, fichier et blame :
un partage d'écran ou une capture ne peut donc pas les faire fuiter.
Le matériel de signature Apple en fait partie : `*.mobileprovision`,
`*.provisionprofile`, `*.p12` et les clés `*.p8` d'App Store Connect. Pas un
`*.cer` — un certificat est public par nature.

C'est **uniquement de l'affichage** : cela ne modifie jamais le fichier et ne
modifie jamais ce que vous indexez. Une bascule en forme d'œil les révèle vue par
vue. `.env.example`, `.sample` et `.template` sont traités comme des modèles, pas
comme des secrets.

![Un .env rendu avec toutes ses valeurs masquées, et la bascule de révélation](../../screenshots/secret-masking.webp)

## Des garde-fous avant les dégâts

| Garde-fou | Quand |
|---|---|
| **Fichier secret** | Vous validez quelque chose qui ressemble à un identifiant — avec un *Ignorer et ne plus suivre* en un clic |
| **Gros fichier** | Vous validez un blob surdimensionné (seuil dans Réglages → Sécurité) |
| **Bruit de compilation** | Committer `xcuserdata/`, `DerivedData/` ou un `.DS_Store` — avec le même *Ignorer et cesser de suivre* en un clic |
| **Branche protégée** | Vous validez directement sur `main`/`master`, ou vous en poussez une en force |
| **Secrets suivis** | Vous poussez un dépôt qui *suit* un fichier secret — averti une fois par session |

## Le trousseau du système

Les jetons et les entrées du [coffre](vault.md) sont chiffrés avec le trousseau
de votre système (le `safeStorage` d'Electron), jamais avec une clé rangée dans
le fichier de réglages.

**Rien ne touche au trousseau tant que vous ne l'avez pas dit.** Avant même que
la boîte de dialogue d'autorisation du système ne puisse apparaître, Gitcito
explique ce qui va être stocké, ce qu'il ne peut pas faire (une application ne
relit jamais que l'entrée qu'elle a créée — vos autres mots de passe sont
inatteignables), et que dire non ne pose aucun problème : les jetons vivent alors
en mémoire pour la durée de la session seulement, le coffre reste fermé, et vous
pouvez activer tout cela plus tard dans **Réglages → Sécurité → Trousseau du
système**.

Une installation neuve fait **zéro** appel au trousseau tant que rien n'a
réellement besoin d'être stocké.

## Partager sans risque

Le [partage sécurisé](secure-share.md) exporte les réglages, les entrées du
coffre ou des espaces de travail entiers sous forme de **bundle chiffré** — les
secrets ne sont inclus que si vous cochez la case.

**Voir aussi :** [Coffre](vault.md) · [Partage sécurisé](secure-share.md)
