---
title: Subtree
category: Branch e chirurgia
order: 49
summary: Incorpora un altro repository in una directory di questo — file davvero presenti, senza il cerimoniale dei sottomoduli.
keywords: subtree git subtree vendor libreria incorpora prefix split squash monorepo alternativa ai submodule pull push
---

# Subtree

Un subtree copia un altro repository dentro una directory del tuo. Dopodiché i
file sono **davvero lì**: un semplice `git clone` se li porta dietro,
`git checkout` li sposta come qualunque altro file, e nessuno deve sapere che
quella directory viene da un'altra parte.

È tutta qui la differenza rispetto a un [sottomodulo](lfs-sparse.md), che
memorizza solo un puntatore e richiede `--recurse-submodules`, un checkout suo e
un HEAD staccato suo da tenere a mente.

`⌘K` → **Subtree**.

![Una directory incorporata trovata nella storia, con la sorgente che Gitcito ricorda per lei](../../screenshots/subtree.webp)

## L'inghippo che nessuno menziona

**Git non registra alcun manifest per i subtree.** Un sottomodulo ha
`.gitmodules`, che elenca ogni url e ogni percorso. Un subtree non ha niente —
solo un trailer `git-subtree-dir:` sul commit che ha fatto l'importazione.

Quindi un repository può contenere un subtree e non darti alcun modo di scoprire
da dove viene. Gitcito fa quello che può:

- L'elenco viene scoperto dalla storia, leggendo quei trailer. Qualunque subtree
  aggiunto da chiunque, con qualunque strumento, compare.
- Il **repository sorgente e il ref** vengono ricordati da Gitcito, nella
  configurazione git di questo repository. Un subtree scoperto dalla storia parte
  con quei campi vuoti — riempili una volta e da lì in avanti pull e push
  funzionano.

I valori ricordati vivono sotto `gitcito.subtree.*` in `.git/config`, quindi
restano con il repository ma non viaggiano fino a un clone. **Dimentica** li
azzera e non tocca nient'altro.

## Aggiungerne uno

| Campo | Significato |
|-------|---------|
| Directory | Dove atterra, ad es. `vendor/parser`. Non deve esistere ancora |
| Repository sorgente | Un URL o un percorso su disco |
| Branch o tag | Cosa importare |
| Squash | Portalo dentro come un unico commit invece che con tutta la sua storia |

**Lascia Squash attivo** a meno che tu non abbia un motivo. Senza, ogni singolo
commit della libreria viene intrecciato per sempre nel tuo log, e `git log`
smette di parlare del tuo progetto.

## Conviverci

| Azione | Cosa esegue |
|--------|--------------|
| **Pull** | `git subtree pull` — le modifiche a monte atterrano come merge dentro la tua directory |
| **Push** | `git subtree push` — le tue modifiche locali sotto quella directory tornano alla sorgente |
| **Split** | `git subtree split -b <branch>` — estrae in un branch la storia propria della directory, con i file nella sua radice |

**Split** è quello che vale la pena conoscere: riporta una directory incorporata
alla storia di un repository a sé stante, ed è così che un subtree smette di
essere un subtree.

## Limiti da conoscere

- **Il push è lento.** Ricalcola da zero la storia della directory ogni volta. Su
  un repository grande si parla di secondi o minuti, non di un istante, e Gitcito
  non può che aspettare.
- **Un pull è un merge**, quindi può andare in conflitto come qualsiasi merge —
  atterri [nel risolutore](conflicts.md).
- **`git subtree` è uno script contrib**, non un comando integrato di git.
  Un'installazione di git ridotta all'osso può non averlo; Gitcito lo dice
  chiaramente invece di rigirarti un "'subtree' is not a git command".
- **Una storia sottoposta a squash non si può più togliere dallo squash.** Quei
  commit non sono mai stati importati.
- Gitcito non converte un sottomodulo in un subtree, né il contrario.

Vedi anche: [Merge e rebase](merging.md) · [Idraulica con un'interfaccia](lfs-sparse.md)
