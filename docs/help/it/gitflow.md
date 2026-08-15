---
title: Git flow
category: Branch e chirurgia
order: 46
summary: Inizia e concludi feature, release e hotfix senza imparare a memoria quale branch si fonde dove.
keywords: gitflow git flow feature release hotfix develop main master prefisso versiontag modello di branching start finish tag
---

# Git flow

Il [modello di branching git-flow](https://nvie.com/posts/a-successful-git-branching-model/)
sono cinque regole e parecchia contabilità. Le regole sono facili; è la
contabilità che la gente sbaglia alle sei di sera di un giorno di rilascio —
fondere un hotfix in `main` e dimenticare `develop`, oppure mettere il tag sul
branch sbagliato.

`⌘K` → **Git flow** tiene la contabilità al posto tuo.

![La finestra di git flow su un branch di release: sopra si avvia un branch, sotto lo si conclude](../../screenshots/gitflow.webp)

## L'impianto

| Branch | Contiene |
|--------|-------|
| **Branch rilasciato** (`main`) | Quello che è in produzione. Ogni release viene taggata qui. |
| **Branch di integrazione** (`develop`) | Dove si accumula il lavoro finito fra una release e l'altra. |
| `feature/*` | Una unità di lavoro, staccata da develop. |
| `release/*` | Una versione in stabilizzazione, staccata da develop. |
| `hotfix/*` | Una correzione urgente, staccata da **main** — la produzione non può aspettare develop. |

Gitcito legge e scrive le stesse chiavi di configurazione `gitflow.*` usate dalla
CLI `git flow` (`gitflow.branch.master`, `gitflow.prefix.feature`, …). Un
repository su cui qualcuno ha già lanciato `git flow init` viene riconosciuto
subito, e un repository configurato qui funziona poi con la CLI. Gitcito esegue
comandi git normali dall'inizio alla fine — la CLI non deve essere installata.

**Configura** scrive quelle chiavi e, se il branch di integrazione non esiste
ancora, lo crea a partire dal branch rilasciato. Nient'altro viene toccato. Puoi
cambiare qualsiasi nome o prefisso più avanti da **Modifica impianto**.

## Iniziare

Scegli un tipo, scrivi un nome, premi **Inizia**. La finestra ti mostra il branch
che sta per creare e il branch da cui lo creerà prima che tu ti impegni:

```
feature/search   from develop
hotfix/1.0.1     from main
```

Il nome è quello che scrivi tu; il prefisso viene dall'impianto.

## Concludere

**Concludi** è la parte che vale la pena automatizzare, perché sono più passaggi
che devono avvenire tutti:

| Tipo | Cosa fa Gitcito |
|------|-------------------|
| Feature | Fonde in develop con `--no-ff`, elimina il branch, ti lascia su develop |
| Release | Fonde in main, la tagga, fonde in develop, elimina il branch, ti lascia su develop |
| Hotfix | Fonde in main, lo tagga, fonde in develop, elimina il branch, ti lascia su **main** |

`--no-ff` è voluto: è il commit di merge a rendere poi visibile il branch nel
[grafo](graph.md). Senza, una feature breve svanisce in una linea dritta e il
modello perde proprio la cosa per cui esisteva.

Il tag è `<prefisso tag di versione><nome>` — `release/1.1.0` diventa `v1.1.0`
con il prefisso predefinito. Togli la spunta a **Tagga la release** per saltarlo,
e scrivi un messaggio di tag se vuoi più del testo predefinito.

### Cosa si rifiuta di fare

- **Un albero di lavoro sporco lo blocca.** Prima fai commit o
  [stash](stashes.md); concludere fonde due branch e sposta HEAD due volte, e
  farlo attorno a lavoro non committato è il modo in cui lo si perde.
- **Un merge in conflitto annulla tutto quanto.** Se il merge in main riesce ma
  quello in develop va in conflitto, altrimenti ti ritroveresti con una release a
  metà. Gitcito riporta ogni branch dov'era e riporta il conflitto. Fondi quel
  branch a mano, lo risolvi nel [risolutore di conflitti](conflicts.md) e il
  flusso resta tuo da concludere manualmente.
- **Non fa mai push.** Concludere è un'operazione locale. Pubblica main, develop
  e il nuovo tag quando sei pronto — vedi [sincronizzare](syncing.md).

### Annullare

Un solo **Annulla** rimette tutto a posto: entrambi i branch tornano ai commit
precedenti, il tag viene eliminato e il branch concluso viene ricreato sulla sua
vecchia punta. È tutto il motivo per cui concludere si può provare in sicurezza.

## Quando non usarlo

Git flow si addice a software con release versionate e un branch di produzione
supportato. Se rilasci da `main` più volte al giorno, i branch di release e
hotfix sono cerimoniale che non userai — le
[branch impilate](stacks.md) o dei semplici branch di breve vita staccati da
`main` calzano meglio. La metà del modello dedicata alle feature funziona
comunque benissimo da sola.
