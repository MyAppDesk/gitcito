---
title: Strumenti esterni di diff e merge
category: Branch e chirurgia
order: 43
summary: Passa un file a Kaleidoscope, Beyond Compare, Meld o a quello che già usi — Gitcito legge l'elenco di git.
keywords: difftool mergetool esterno diff merge kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup
---

# Strumenti esterni di diff e merge

Il [visualizzatore di diff](diffs.md) di Gitcito e il
[risolutore a tre pannelli](conflicts.md) coprono quasi tutte le giornate. Certe
giornate no: un file generato di 4.000 righe, un merge in cui devi vedere quattro
colonne insieme, o semplicemente lo strumento che usi da dieci anni e che leggi
più in fretta di qualunque novità.

**Impostazioni → Generali → Strumenti esterni di diff e merge.**

## L'elenco è di git, non nostro

Gitcito non tiene una tabella propria. I menu a tendina sono
`git difftool --tool-help` e `git mergetool --tool-help`, ed è per questo che:

- Gli strumenti che git ha già trovato sulla tua macchina sono elencati per
  primi; quelli che conosce ma non riesce a trovare vengono dopo, segnati come
  *non installato*.
- **Uno strumento personalizzato funziona senza alcun supporto aggiuntivo.** Se
  hai

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  allora `mine` compare nel menu come qualunque strumento integrato.
- Le tue scelte vengono scritte in **`diff.tool` e `merge.tool` nella tua
  configurazione git globale** — le stesse chiavi che legge il tuo terminale.
  Impostale qui e `git difftool` da riga di comando si comporta allo stesso modo.
  Impostale là e Gitcito le raccoglie.

Git conosce già in partenza una trentina di strumenti, fra cui Kaleidoscope,
Beyond Compare, Meld, KDiff3, P4Merge, Araxis, DiffMerge, WinMerge, FileMerge,
VS Code e la famiglia vim.

## Dove compaiono le azioni

| Superficie | Azione |
|---------|--------|
| Un file modificato nel [compositore di commit](committing.md) | **Diff in \<strumento\>** — albero di lavoro contro l'indice |
| Il [risolutore di conflitti](conflicts.md) | **Merge in \<strumento\>** — il merge a tre vie completo |

Entrambe le voci compaiono solo quando uno strumento è davvero configurato; un
`git difftool` non configurato darebbe solo errore, e un pulsante inerte è peggio
di nessun pulsante.

## Cosa succede mentre lo strumento è aperto

Gitcito aspetta che si chiuda. È voluto — `git mergetool` mette in stage il file
risolto *solo dopo* l'uscita dello strumento, quindi c'è un risultato vero da
riportare — ed è il motivo per cui il pulsante mostra un indicatore di attesa
invece di tornare subito.

Il resto dell'applicazione resta reattivo: queste operazioni girano fuori dal
lock per repository che serializza le normali operazioni git, quindi uno
strumento di merge lasciato aperto durante la pausa pranzo non congela la scheda
dietro di lui.

Quando un merge esterno riesce, è git stesso a mettere in stage il file e Gitcito
chiude il risolutore e aggiorna. Se chiudi lo strumento senza salvare, git lo
dice e non cambia nulla.

## Il file `.orig`

`git mergetool` lascia per default un backup `<file>.orig` accanto al file
risolto — è comportamento di git, non di Gitcito. L'interruttore nelle
impostazioni scrive `mergetool.keepBackup`; disattivalo e un file risolto non
lascia più niente dietro di sé.

## Limiti

- **Solo diff sull'albero di lavoro.** La voce del compositore confronta quello
  che hai adesso con l'indice. Confrontare esternamente due commit storici non è
  collegato — per quello usa il [visualizzatore di diff](diffs.md) integrato o il
  [confronto](merging.md).
- **Un file alla volta.** Non esiste una passata "fai il diff di ogni file
  modificato".
- **Gitcito non installa mai niente.** Uno strumento segnato *non installato*
  resta selezionabile, perché git potrebbe comunque trovarlo dopo che lo installi
  — ma fino ad allora fallirà.
