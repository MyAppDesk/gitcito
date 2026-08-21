---
title: Merge e rebase
category: Branch e chirurgia
order: 41
summary: Fondi, fai rebase, confronta ref e trascina un ref su un altro nella barra laterale o nel grafo.
keywords: merge rebase fast-forward confronta ref trascina drag drop branch grafo badge tag remote revert reset cherry-pick correggi amend annulla undo github
---

# Merge e rebase

## Dalla barra laterale

Clic destro su un branch per **Fondi nel corrente** o **Rebase su** — oppure
**Merge con opzioni…** quando è il merge semplice a continuare ad andare storto;
vedi [opzioni di merge](merge-options.md).

## Trascina un ref su un altro

Il gesto più rapido dell'app: prendi un branch e lascialo cadere su un altro.
Gitcito apre un piccolo menu con i significati possibili di quel rilascio, e non
fa niente finché non scegli.

![Trascinare un branch su un altro apre il menu dei possibili significati del rilascio](../../screenshots/clip-branch-drop.webp)

Funziona in **entrambi** i posti in cui compaiono i ref — le righe di branch,
remote e tag nella barra laterale, e i **badge colorati dei ref nel grafo**
stesso. Trascina fra i due in qualunque combinazione; la destinazione si evidenzia
mentre ci passi sopra.

| Rilascio | Significa |
|------|-------|
| **Fondi {origine} → {destinazione}** | Fa il checkout della destinazione e vi fonde l'origine |
| **Rebase di {origine} su {destinazione}** | Riapplica i commit dell'origine sopra la destinazione |
| **Confronta** | Apre il [confronto](#confrontare-due-ref-qualsiasi) — non cambia niente |

**Il menu offre solo ciò che git può fare.** Il merge deposita commit sulla
destinazione, quindi la destinazione dev'essere un branch locale — non puoi
fondere dentro un tag o un ref di tracciamento remoto. Il rebase riscrive
l'origine, quindi l'origine dev'essere un branch locale. Lascia cadere un tag su
un branch remoto e l'unica cosa che ti viene offerta è *Confronta*, perché è
davvero tutto quello che c'è.

Il rebase chiede prima conferma: dà a ogni commit riapplicato un nuovo hash, il
che significa un force push se il branch è già pubblicato. Il merge non chiede —
si limita ad aggiungere. In entrambi i casi, un solo **Annulla** ti riporta
indietro.

## Merge

Fast-forward quando possibile, o commit di merge forzato quando vuoi che la
topologia resti registrata. Se va in conflitto, atterri
[nel risolutore](conflicts.md).

## Confrontare due ref qualsiasi

Scegli una base e un ref da confrontare — branch, tag o SHA grezzo, con un
pulsante di scambio — e ottieni i conteggi avanti/indietro, i commit esclusivi di
ciascun lato, il diff combinato completo e un passaggio in un clic ad **aprire
una PR**.

![Il confronto fra due branch: cosa è esclusivo di ciascun lato, e il diff combinato](../../screenshots/branch-compare.webp)

Ci arrivi dalla barra laterale (confronto con il branch corrente), dal menu
Strumenti o con <kbd>⌘K</kbd>.

## Cherry-pick, revert, reset

Cherry-pick e revert vivono nel menu contestuale del grafo, come hanno sempre
fatto. Il **reset** è una voce sola — **Reset al commit…** — invece di tre voci
soft/mixed/hard grezze che si contraddicevano a vicenda.

Correggi, annulla e reset stanno in cima al menu del singolo commit e restano
**visibili quando non sono sicuri**: si disabilitano, con un tooltip che spiega
perché. Annulla vale solo per un HEAD non ancora inviato; correggere è permesso
anche su un HEAD pubblicato, ma con l'avviso che servirà un force push. Il reset
raggiunge solo gli antenati locali più il primo commit pubblicato — non la
storia più vecchia a piacere.

La finestra di reset rende esplicita la modalità:

![La finestra Reset al commit, con le tre modalità spiegate per esteso](../../screenshots/reset-to-commit.webp)

| Modalità | Risultato |
|------|--------|
| **Soft** | Tieni le modifiche in stage |
| **Mixed** | Tieni le modifiche fuori dallo stage |
| **Hard** | Scarta i commit e le loro modifiche |

Hard non è mai preselezionato. Un albero di lavoro sporco riceve un avviso in
più, perché il reset può sovrascrivere il lavoro in corso o andarci in
conflitto. **Apri su GitHub** sta con le azioni di copia e si apre solo per i
commit pubblicati su un remote github.com.

Seleziona prima più commit e il cherry-pick applica l'intera selezione, in
ordine.

## Prima di fondere qualsiasi cosa

Il [radar dei conflitti](conflict-radar.md) confronta ogni branch con una base e
ti dice quali daranno battaglia, senza fare il checkout di niente.

**Vedi anche:** [Rebase interattivo](rebase.md) · [Branch impilate](stacks.md) · [Radar dei conflitti](conflict-radar.md)
