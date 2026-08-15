---
title: Cassaforte
category: Sicurezza
order: 71
summary: Un archivio locale e cifrato per i segreti di cui un repo ha bisogno — mai committati.
keywords: cassaforte vault segreti env portachiavi keychain cifrato locale per repo globale copia
---

# Cassaforte

I valori `.env` di cui un progetto ha bisogno devono pur stare da qualche parte.
La cassaforte è quel posto, senza che finiscano nel repository.

![La cassaforte](../../screenshots/vault.webp)

- **Cifrata a riposo** con il portachiavi del tuo sistema operativo.
- **Due ambiti**: voci legate a un repository, e un insieme **globale** a cui puoi
  fare riferimento da ovunque.
- **Non è un file, e non ha niente a che vedere con il tuo `.env`.** Le voci sono
  *associate* a un repository ma non ci vengono mai scritte dentro, mai
  committate, mai pubblicate.
- **Niente lascia mai la tua macchina.** Nessuna sincronizzazione, nessun cloud.

## Come si usa

Aprila con <kbd>⌘⇧V</kbd>, dal menu strumenti, dalle impostazioni o dalla
tavolozza dei comandi. Passa da un repository noto all'altro, rivela o copia un
valore, oppure fai **Copia come .env** di un intero insieme direttamente negli
appunti.

## Spostarla fra macchine

La [condivisione sicura](secure-share.md) può impacchettare la cassaforte in un
bundle cifrato — e solo quando chiedi esplicitamente di includere i segreti.

**Vedi anche:** [Sicurezza e segreti](security.md) · [Condivisione sicura](secure-share.md)
