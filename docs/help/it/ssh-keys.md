---
title: Chiavi SSH
category: Sincronizzazione e più repo
order: 57
summary: Perché il tuo token non serve a niente per un remote git@, e come capire quale chiave sta fallendo.
keywords: ssh chiave chiavi agent ssh-add ssh-keygen ed25519 publickey permission denied impronta fingerprint passphrase carica github known_hosts
---

# Chiavi SSH

**Impostazioni → Sicurezza → Chiavi SSH.**

## Perché questa sezione sta accanto ai token

Gitcito autentica due cose diverse, e le persone danno per scontato — non a torto
— che siano una sola:

| | Autenticato da |
|---|---|
| L'**API dell'host** — repo, PR, issue, controlli CI | Il tuo [token](hosting.md) |
| Il trasporto git su `https://` | Il tuo token, iniettato nell'URL |
| Il trasporto git su **`git@…`** | **La tua chiave SSH, tramite l'ssh di sistema** |

Un remote come `git@github.com:me/api.git` non tocca mai il token. Git consegna
la connessione a `ssh`, che di un personal access token non ha mai sentito
parlare. Non è un caso limite: è quello che ottieni quando è stato un collega a
impostare il repo, quando un `.gitmodules` usa URL `git@`, quando la tua azienda
disabilita l'autenticazione HTTPS, o quando l'host è un GitLab gestito
internamente.

Quando la cosa va storta, ssh dice `Permission denied (publickey)` e nient'altro.
Tecnicamente vero, inutile come consiglio.

![Ogni chiave in ~/.ssh con il suo tipo, la sua impronta e se l'agente la sta tenendo](../../screenshots/ssh-keys.webp)

## Cosa ti dice la sezione

Ogni chiave trovata in `~/.ssh` mostra tipo, dimensione, impronta e commento, più
l'unico dato che spiega quasi tutti i guasti improvvisi:

**nell'agente** / **non nell'agente.** Una chiave che l'agente non sta tenendo
non può autenticare niente, e l'agente dimentica il proprio contenuto al riavvio
se non è stato detto altro al sistema operativo. "Ieri funzionava" di solito è
questo.

## Cosa puoi fare qui

| Azione | Cosa esegue |
|--------|--------------|
| **Copia la chiave pubblica** | Mette la riga `.pub` negli appunti, pronta da incollare in qualsiasi host |
| **Aggiungi all'agente** | `ssh-add` (con `--apple-use-keychain` su macOS, così sopravvive a un riavvio) |
| **Carica su GitHub** | `POST /user/keys` con il token di questo profilo |
| **Genera una chiave** | `ssh-keygen -t ed25519`, commentata con la tua email git |
| **Prova la connessione** | `ssh -T git@<host>`, tradotto in una frase |

**Prova la connessione** esiste perché la risposta di ssh è fuorviante: GitHub ti
autentica con successo e *poi* esce con un codice di errore, dato che non offre
una shell. Gitcito legge il messaggio invece del codice di uscita, e mostra sotto
l'output grezzo così puoi verificare la sua interpretazione.

## I limiti, detti chiaramente

- **Il caricamento è solo per GitHub.** GitLab, Bitbucket e Azure DevOps ottengono
  *Copia la chiave pubblica* e un link diretto alla loro pagina di impostazioni
  delle chiavi. Registrare chiavi sugli altri tre non è implementato, e il
  pulsante non finge il contrario.
- **La generazione non sovrascrive mai.** Un nome già presente in `~/.ssh` viene
  rifiutato. Sovrascrivere una chiave privata revoca in silenzio il tuo accesso a
  tutto ciò che si fida di lei, e nessuna finestra di conferma rende la cosa
  recuperabile.
- **Le passphrase non vengono conservate da Gitcito.** Ne digiti una quando
  generi o quando aggiungi all'agente; viene passata a `ssh-keygen`/`ssh-add` e
  poi scartata. Farla sopravvivere ai riavvii è compito del portachiavi di
  sistema, tramite `ssh-add`.
- **Nessuna modifica di `~/.ssh/config`**, nessun alias di host, nessuna scelta
  della chiave per repository. Quelle cose vivono nella tua configurazione ssh, e
  Gitcito quel file lo lascia stare.

## Cosa non lascia mai la tua macchina

**Gitcito non legge, non mostra e non trasmette mai una chiave privata.** La
sezione elenca le metà pubbliche e le impronte. L'unica cosa che viene mai
inviata da qualche parte è la chiave pubblica su cui premi esplicitamente
**Carica** — e va a GitHub, con il tuo token, dopo una conferma che ne nomina
l'impronta.

Vedi anche: [Sicurezza e segreti](security.md) · [Hosting e pull request](hosting.md)
