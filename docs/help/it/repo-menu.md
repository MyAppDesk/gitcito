---
title: Menu contestuale del repository
category: Per iniziare
order: 4
summary: Clic destro su qualsiasi pillola o scheda di repository per alias, worktree, GitHub, terminale e rimozione.
keywords: menu contestuale context menu clic destro right-click alias worktree github terminale mostra reveal editor rimuovi remove scheda repository tab
---

# Menu contestuale del repository

Fai clic destro su un repository — una scheda autonoma, una pillola dentro un
gruppo, una pillola dentro una cartella annidata, una riga nell'elenco di
benvenuto/launcher, o una riga nel menu a discesa dei repository nella barra
degli strumenti — e ottieni lo stesso menu dedicato al repository. La pillola
del gruppo continua ad aprire il menu del gruppo; il clic deve atterrare sul
repository.

![Il menu contestuale del repository su una pillola in un gruppo](../../screenshots/repo-context-menu.webp)

Il menu a discesa dei repository nella barra degli strumenti elenca ogni
repository aperto, allo stesso modo in cui il menu dei branch elenca i branch.
Clic sinistro su una riga per passare a quel repository. Clic destro su una
riga (o sulla pillola del repository corrente stessa) per alias, worktree,
GitHub, terminale, mostra, editor e rimozione. **Apri un repository…** in fondo
apre il launcher.

![Clic destro su una riga nel menu a discesa dei repository della barra degli strumenti](../../screenshots/repo-dropdown-context-menu.webp)

## Cosa fa ogni azione

| Azione | Effetto |
|---|---|
| **Crea alias…** / **Modifica alias…** | Solo un nome visualizzato. Gitcito non rinomina né sposta mai la cartella su disco. Lo stesso alias segue il repository fra schede, gruppi e aree di lavoro. |
| **Rimuovi alias** | Compare quando esiste un alias. Ripristina il nome della cartella. |
| **Mostra worktree** | Porta in primo piano questo repository e apre la sezione worktree della barra laterale. |
| **Nuovo worktree…** | La stessa finestra di creazione worktree usata da un branch. Disabilitato quando il percorso manca o è in corso un merge/rebase/cherry-pick/revert. |
| **Copia nome del repository** | Copia il nome canonico della cartella, non l'alias. |
| **Copia percorso del repository** | Copia il percorso assoluto. |
| **Apri su GitHub** | Origin se è github.com, altrimenti il primo remote GitHub interpretabile. Disabilitato quando non se ne può ricavare nessuno. |
| **Apri nel terminale** | Apre il terminale di Gitcito con questo repository come directory di lavoro. |
| **Mostra nel Finder / in Esplora file** | Evidenzia la cartella del repository nel gestore file della piattaforma. |
| **Apri nell’editor esterno** | L'editor configurato nelle impostazioni. Visibile ma disabilitato finché non ne imposti uno. |
| **Rimuovi…** | Chiude la scheda o toglie la pillola dal gruppo. Usa lo stesso avviso di lavoro non committato del pulsante **×**. Non elimina mai file dal disco. |

Un percorso mancante o non valido lascia disponibili copia, alias e rimozione,
e disattiva tutto ciò che aprirebbe o ispezionerebbe la directory.

**Vedi anche:** [Aree di lavoro, schede e gruppi](workspaces.md) · [Worktree e sottomoduli](worktrees.md) · [Editor esterno](editor.md) · [Terminale integrato](terminal.md)
