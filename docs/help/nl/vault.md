---
title: Kluis
category: Beveiliging
order: 71
summary: Een lokale, versleutelde opslag voor de geheimen die een repo nodig heeft — nooit gecommit.
keywords: kluis vault geheimen secrets env sleutelhanger keychain versleuteld lokaal per repo globaal kopiëren
---

# Kluis

De `.env`-waarden die een project nodig heeft moeten ergens wonen. De kluis is
dat ergens, zonder dat ze in de repository belanden.

![De kluis](../../screenshots/vault.webp)

- **Versleuteld in rust** met je OS-sleutelhanger.
- **Twee bereiken**: regels die aan een repository hangen, en een **globale** set
  die je overal vandaan kunt aanhalen.
- **Geen bestand, en het heeft niets met je `.env` te maken.** Regels zijn
  *gekoppeld* aan een repository maar worden er nooit in geschreven, nooit
  gecommit, nooit gepusht.
- **Er verlaat nooit iets je machine.** Geen synchronisatie, geen cloud.

## Gebruik

Open hem met <kbd>⌘⇧V</kbd>, via het toolsmenu, via de instellingen, of via het
commandopalet. Wissel tussen alle bekende repository's, onthul of kopieer een
waarde, of **Kopieer als .env** een hele set rechtstreeks naar het klembord.

## Hem tussen machines verplaatsen

[Veilig delen](secure-share.md) kan de kluis in een versleutelde bundel
inpakken — en alleen wanneer je uitdrukkelijk vraagt om geheimen mee te nemen.

**Zie ook:** [Beveiliging & geheimen](security.md) · [Veilig delen](secure-share.md)
