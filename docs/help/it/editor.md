---
title: Editor esterno
category: Strumenti dell'area di lavoro
order: 95
summary: Manda un repository, un file o una singola riga di codice all'editor in cui scrivi davvero.
keywords: editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode apri nell'editor riga colonna comando personalizzato argv
---

# Editor esterno

Un client Git è dove leggi il codice; raramente è dove lo sistemi. La distanza
fra il notare un problema in un diff e l'avere il cursore su quella riga nel tuo
editor è una ricerca del file più uno scorrimento — ogni volta.

Indica a Gitcito il tuo editor una volta sola e quella distanza sparisce: clic
destro su una riga nella vista file o blame e si apre lì, a quella riga.

## Sceglierne uno

**Impostazioni → Generali → Editor esterno.** Il menu a tendina elenca gli editor
che Gitcito riesce a trovare su questa macchina — cerca prima il comando di
ciascun editor, poi, su macOS, il bundle dell'applicazione in `/Applications` e
`~/Applications`. La scansione parte ogni volta che apri le impostazioni, quindi
un editor installato cinque minuti fa compare senza riavviare.

Riconosciuti in partenza:

| Editor | Comando che cerca |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| IDE JetBrains | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## Il limite da conoscere

**Saltare a una riga richiede il comando dell'editor, non la sua icona.** Un
bundle `.app` di macOS viene lanciato tramite `open`, che accetta un percorso e
nient'altro — quindi un editor trovato solo come bundle apre il file dall'inizio,
e Gitcito lo dice sotto il menu invece di fingere il contrario.

La soluzione sta dalla parte dell'editor: *Shell Command: Install 'code' command
in PATH* per VS Code, il link simbolico `subl` di Sublime, *Toolbox → Settings →
Shell scripts* per JetBrains. Una volta che il comando esiste, riseleziona
l'editor e il salto alla riga funziona.

## Dove compaiono le azioni

| Superficie | Cosa apre |
|---------|---------------|
| Scheda del repo, repo nella barra laterale, barra di stato | La cartella del repository |
| Albero dei file, file di un commit, file di uno stash, compositore di commit | Quel file |
| L'icona a fine riga nell'albero dei file | Quel file, con un clic |
| Clic destro su una riga nella vista **file** | Il file, a quella riga |
| Clic destro su una riga nella vista **blame** | Il file, a quella riga |
| Un `.xcodeproj` o altro pacchetto nell'albero dei file | Il pacchetto, nell'app che lo gestisce |

Le azioni sulla riga compaiono solo dove il numero di riga significa ancora
qualcosa: un file mostrato a un commit vecchio, o un blame riavvolto a una
revisione precedente, ha righe che non corrispondono più a quello che c'è su
disco, quindi Gitcito lì non offre alcun salto invece di mandarti nel posto
sbagliato.

## Progetti Xcode e altri pacchetti

`MyApp.xcodeproj` è una cartella. Git lo sa, e lo sapeva anche l'albero dei file
finché non ha iniziato a dare fastidio: espanderlo per trovare
`project.pbxproj`, `project.xcworkspace` e una cartella per sviluppatore sotto
`xcuserdata` sono tre clic di rumore per una cosa che non avresti mai modificato
a mano.

Ora hanno un'icona a pacchetto e **un clic sulla riga apre il pacchetto**, come
un doppio clic nel Finder. La freccia resta, così l'unica volta in cui ti serve
davvero `project.pbxproj` — un conflitto di merge, quasi sempre — ci entri come
prima.

Riconosciuti: `.xcodeproj`, `.xcworkspace`, `.xcframework`, `.framework`,
`.app`, `.appex`, `.dSYM`, `.playground`, `.xcuserdatad`.

**Non** riconosciuti, di proposito: `.xcassets` e `.lproj`. Sono pacchetti anche
loro, ma i file dentro si modificano davvero, quindi chiuderli costerebbe più di
quanto faccia risparmiare.

### I limiti

**Il pacchetto si apre tramite il sistema, non tramite il tuo editor.** Un
`.xcodeproj` passato a un editor di testo si apre come una cartella di property
list, che non è quello che voleva chi ha cliccato — così Gitcito lo passa a ciò
che il sistema gli associa, che su un Mac con Xcode installato è Xcode. La
scelta dell'editor resta intatta e continua a valere per ogni file normale.

**È una convenzione sui nomi, non un flag del filesystem.** Gitcito guarda
l'estensione, quindi anche una cartella che hai chiamato `notes.app` si chiude, e
su Linux o Windows — dove sono cartelle qualsiasi — un clic apre il gestore file
invece di un IDE.

## Un comando tutto tuo

Scegli **Comando personalizzato** per tutto ciò che non è in tabella — uno script
wrapper, un lanciatore per sviluppo remoto, un editor da terminale avviato
tramite un tuo shim.

| Campo | Significato |
|-------|---------|
| Comando | L'eseguibile da lanciare. Nessuna shell, quindi niente `&&`, pipe o glob. |
| Nome | Come lo chiamano le voci di menu. |
| Argomenti per un file | Template argv, ad es. `-g {path}:{line}:{col}` |
| Argomenti per una cartella | Template argv, di solito solo `{path}` |

I template vengono divisi sugli spazi e ogni token è sostituito una volta sola —
un percorso con uno spazio resta un unico argomento, e dopo non viene rianalizzato
nulla, quindi un nome di file non può mai trasformarsi in sintassi. Quattro
segnaposto: `{path}`, `{line}`, `{col}`, `{repo}`.

Un segnaposto senza valore si porta via il suo flag: `--line {line} {path}`
eseguito senza una riga diventa solo il percorso, mai un `--line` penzolante che
si mangerebbe il nome del file come argomento. Un template senza `{line}` vuol
dire semplicemente che per quell'editor Gitcito non offrirà azioni precise alla
riga.

## Cosa non è

Questa non è l'impostazione ["Apri con"](repo-settings.md), che mostra il
selettore di sistema e ricorda una sola applicazione per aprire *qualsiasi cosa*
— un'immagine, un PDF, una cartella nel Finder. L'editor è il più specifico dei
due, quindi dove sono impostati entrambi l'editor vince sull'icona a fine riga
nell'albero dei file; entrambi restano elencati nel menu contestuale.

Gitcito non lancia mai il tuo editor da solo, e chiudere Gitcito non lo chiude
mai: l'editor viene avviato staccato, come processo a sé.
