---
title: Credential helper
category: Sicurezza
order: 73
summary: L'archivio password di git — il terzo — e perché https continua a chiedertele.
keywords: credential helper password https chiede di nuovo osxkeychain wincred manager libsecret store cache git-credentials testo in chiaro dimentica revocato token 401
---

# Credential helper

Gitcito ha a che fare con tre tipi diversi di segreto, e le persone danno per
scontato — non a torto — che siano una cosa sola:

| | Custodito da |
|---|---|
| Token API dell'host — PR, issue, controlli CI | Gitcito, nel tuo [portachiavi di sistema](security.md) |
| Trasporto `git@…` | La tua [chiave SSH](ssh-keys.md), tramite l'agente ssh di sistema |
| **Trasporto `https://`** | **Il credential helper di git** |

Il terzo non sembra una funzionalità a nessuno finché non si rompe, e allora
produce i due lamenti più comuni di git: *perché me lo chiede di nuovo?* e
*perché sta ancora mandando il token che ho revocato?*

`⌘K` → **Credential helper**.

![L'helper configurato, le regole per host e l'avviso sul file in chiaro](../../screenshots/credentials.webp)

## Cosa stai guardando

Ogni `credential.helper` configurato, nell'ambito da cui proviene — `system`,
`global`, poi questo repository. **Gli helper si impilano**: git li interroga uno
dopo l'altro, e uno a livello di repository non sostituisce quello globale.

Ognuno viene verificato contro la tua macchina:

| Contrassegno | Significa |
|------|-------|
| **pronto** | Il programma helper esiste e verrà eseguito |
| **non installato** | Configurato, ma il programma manca — ogni richiesta ricade sul digitare di nuovo la password |
| **password in un file in chiaro** | L'helper `store` (vedi sotto) |

**Regole per host specifici** elenca le sezioni `credential.<url>.*`. Battono
l'impostazione semplice per gli URL che intercettano, e di solito sono la
risposta a "perché proprio quell'host si comporta diversamente".

## Sceglierne uno

| Helper | Dove finisce la password |
|--------|------------------------|
| `osxkeychain` | Portachiavi macOS — cifrato, per utente |
| `manager` | Git Credential Manager (Windows, multipiattaforma) |
| `wincred` | Gestione credenziali di Windows |
| `libsecret` | Il servizio dei segreti su Linux (GNOME Keyring, KWallet) |
| `cache` | In memoria, per 15 minuti. Niente su disco |
| `store` | **Un file in chiaro nella tua home. Non cifrato** |

Gitcito propone ciò che è davvero installato su questa macchina, segna quello
adatto al tuo sistema operativo e disattiva il resto.

**L'ambito conta.** *Per ogni repository* scrive nella tua configurazione
globale, ed è quasi sempre ciò che vuoi; *solo per questo repository* è per il
repo strano che si autentica contro qualcos'altro.

## L'helper `store` e `~/.git-credentials`

`store` scrive righe `https://user:password@host` dentro `~/.git-credentials`, in
chiaro, senza cifratura di alcun tipo. Qualsiasi cosa giri con la tua utenza può
leggerlo: uno script, il postinstall di una dipendenza, qualunque cosa.

Se quel file esiste, questa pagina lo dice e conta le voci. Non le mostra mai —
il conteggio è tutto il punto, e leggerne il contenuto per mostrarlo sarebbe lo
stesso errore.

Se ne trovi uno e non era tua intenzione: scegli qui un helper vero, poi elimina
il file e autenticati di nuovo una volta.

## Dimenticare una credenziale salvata

Quando un token viene revocato o ruotato, l'helper continua a consegnare quello
vecchio e ogni push fallisce con un 401 che non nomina niente. **Dimentica**
chiede all'helper configurato di cancellare la propria voce per quell'host —
`git credential reject`, cioè la strada documentata da git stesso.

Nel farlo non si legge nulla: Gitcito non chiama mai `git credential fill`, il
comando che stamperebbe una password valida sullo standard output.

Il push successivo te la chiede una volta, e l'helper memorizza la nuova
risposta.

## Limiti da conoscere

- **Questo è l'archivio di git, non quello di Gitcito.** Cambiarlo cambia anche
  quello che fa il tuo terminale — che è esattamente il punto, e vale la pena
  saperlo prima di cambiarlo.
- **Gli helper a livello di sistema sono mostrati, non modificabili.** Vivono in
  una configurazione che solo un amministratore può scrivere.
- **Gitcito non può elencare cosa contiene un helper.** Nessuna API delle
  credenziali lo espone senza consegnare i segreti, quindi la finestra riporta la
  configurazione e cancella su richiesta, e nient'altro.
- **Un token dato a Gitcito è un'altra cosa.** Revocarne uno non tocca l'altro;
  per il lato portachiavi vedi [sicurezza](security.md).

Vedi anche: [Sicurezza](security.md) · [Chiavi SSH](ssh-keys.md) ·
[Sincronizzare](syncing.md)
