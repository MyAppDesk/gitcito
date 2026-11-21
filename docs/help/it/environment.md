---
title: Controllo dell’ambiente
category: Per iniziare
order: 6
summary: Da cosa dipende Gitcito fuori dalla propria installazione — git, LFS, il terminale nativo, il credential helper di git, la CLI di GitHub e il monitoraggio dei file — controllato in un unico posto.
keywords: ambiente environment dottore diagnosi controllo git versione lfs node-pty terminale shell base credential helper store gh github cli scope workflow inotify max_user_watches
---

# Controllo dell’ambiente

Alcuni errori non riguardano affatto il repository. Vengono dalla macchina: un
git troppo vecchio per l’accesso tramite profilo, un terminale ricaduto in
silenzio in modalità base, un accesso della CLI di GitHub che non può fare push
dei file di workflow. Ognuno si presenta più tardi come un errore vago, nel mezzo
di altro. **Impostazioni → Ambiente** (anche *Settings: Environment* nella palette
dei comandi) li controlla in anticipo.

Il [dottore del repository](repo-settings.md) risponde a un’altra domanda: se
*questo repository* può essere compilato qui, in base a ciò che chiede il suo
`.gitcito.json`. Il controllo dell’ambiente riguarda l’app stessa ed è uguale per
ogni repository.

![Controlli dell’ambiente nelle Impostazioni](../../screenshots/settings-environment.webp)

## Cosa controlla

| Riga | Verde significa | Giallo o rosso significa |
|------|-----------------|--------------------------|
| **Git** | git 2.31 o successivo è nel `PATH` | Più vecchio di 2.31: l’account di un [profilo](profiles.md) non può autenticarsi per fetch e push. Assente: nulla funziona finché git non è installato |
| **Git LFS** | `git lfs` è installato | Non installato. Serve solo ai repository che tengono file in LFS |
| **Terminale** | Il terminale nativo si è caricato | Il [terminale](terminal.md) funziona in modalità base: niente colori, niente ridimensionamento, niente programmi a schermo intero |
| **Credential helper** | git ha un helper per le password HTTPS — globale o per host specifici (ciò che imposta `gh auth setup-git`) | Nessun helper, quindi git fuori da Gitcito chiede ogni volta. Oppure `store`, che le salva in chiaro. Vedi [Credential helper](credentials.md) |
| **CLI di GitHub** | `gh` ha effettuato l’accesso con lo scope `workflow` | Accesso senza di esso: GitHub rifiuta ogni push che modifica `.github/workflows` |
| **Monitoraggio file** (Linux) | Il limite inotify è almeno 65.536 | Un limite più basso si esaurisce con pochi repository grandi aperti, e le nuove cartelle smettono di aggiornare lo stato |

Una riga che non si applica viene omessa: la CLI di GitHub se non è installata o
senza accesso, il monitoraggio dei file su macOS e Windows.

## Correggere ciò che trova

Dove c’è una correzione, la riga la mostra come comando con un pulsante di copia.
Ad esempio, `gh auth refresh -h github.com -s workflow` aggiunge lo scope
mancante, e una riga `sysctl` alza il limite inotify. **La pagina non esegue mai
nulla da sola.** Alcune correzioni richiedono `sudo` o cambiano la configurazione
globale, e sta a te leggerle prima di eseguirle. Dopo, premi **Controlla di
nuovo**.

## Limiti

- Controlla ciò che l’app vede dal proprio processo. Un profilo di shell che
  cambia il `PATH` solo nel tuo terminale può far divergere i due.
- La riga della CLI di GitHub riflette l’accesso di `gh` stesso, non gli account
  collegati in **Impostazioni → Integrazioni**. Sono credenziali separate. Uno
  scope `workflow` mancante lì si manifesta invece come un push rifiutato.
- Riporta ciò che è installato. Non installa né aggiorna nulla.
