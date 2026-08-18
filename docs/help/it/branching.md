---
title: Branch, remote e barra laterale
category: Branch e chirurgia
order: 40
summary: Tutto quello che fa la barra laterale sinistra, e i branch appuntati.
keywords: branch ramo crea checkout rinomina elimina remote pinned appuntati sidebar presenza
---

# Branch, remote e barra laterale

Un'unica barra laterale, riordinabile e ricercabile, contiene **branch, remote,
tag, stash, worktree e sottomoduli**. Ogni sezione può essere nascosta o
riordinata (Impostazioni → Layout), e il filtro di ricerca vale per tutte.

![La barra laterale, con i branch appuntati tenuti in cima](../../screenshots/pinned-branches.webp)

## Branch

Crea, fai checkout, rinomina ed elimina — locali e remoti. Le righe dei branch
mostrano:

- **↑avanti / ↓indietro** rispetto al proprio upstream,
- **badge di presenza per remote** (quali remote hanno questo branch),
- un **punto di rischio** dopo una scansione del [radar dei conflitti](conflict-radar.md),
- un **marcatore ⟳** quando il remote ha [riscritto la storia](range-diff.md).

I branch con `/` nel nome si raggruppano automaticamente in cartelle
richiudibili.

![Nomi di branch separati da slash raccolti in un albero](../../screenshots/branch-grouping.webp)

## Branch appuntati

Metti una stella sui branch a cui torni di continuo — passa sopra la riga e
clicca ★, oppure clic destro → *Appunta il branch*. Compaiono in un gruppo
**Appuntati** in cima alla sezione Locali, ricordato per repository, pur
restando al loro posto normale più in basso.

## Fare checkout di un branch remoto

Doppio clic su un branch remoto per creare quello locale che lo traccia. Se
esiste già un branch locale con quel nome ed è **divergente**, Gitcito ti chiede
come riconciliarlo — rebase, merge o reset — e ti offre di farne prima un backup.

![La richiesta per il branch divergente: rebase, merge o reset, con l'opzione di backup](../../screenshots/diverged-checkout.webp)

### Quando il tuo branch locale è indietro

Viene portato avanti (fast-forward) alla punta del remoto durante il checkout.
Un albero di lavoro sporco finisce in uno stash con nome e viene ripristinato
dopo, così le modifiche locali non interrompono l'aggiornamento.

### Quando il tuo branch locale è avanti

Se il branch locale è avanti e il remoto non ha nulla di nuovo, il checkout
risponderebbe a una richiesta del branch *remoto* con il tuo lavoro non ancora
pushato — quindi non viene cambiato nulla finché non dici quale lato intendevi:

| Scelta | Cosa succede |
|--------|--------------|
| Passa al locale | Passa al branch locale, commit intatti. Quello che ogni altro client fa in silenzio. |
| Reimposta (soft) | Riporta il branch alla punta del remoto; le modifiche dei commit restano **in stage**, pronte per un nuovo commit. |
| Reimposta (mixed) | Stesso spostamento, modifiche lasciate **fuori dallo stage** nell'albero di lavoro. |
| Reimposta (hard) | Scarta i commit *e* le loro modifiche. |

![Il dialogo del branch avanti: passa al locale, oppure reset soft, mixed o hard](../../screenshots/ahead-checkout.webp)

Lascia spuntato *Crea prima un branch di backup* e la punta locale viene salvata
come `backup/<branch>-<timestamp>` prima di ogni spostamento: anche un reset hard
resta a un checkout di distanza dall'essere annullato. Il reset entra anche nello
stack di annullamento (⌘Z), ma solo finché non chiudi il repository — il branch di
backup dura più a lungo.

**Limiti:** il dialogo confronta il branch solo con il riferimento di tracking
appena recuperato, quindi un remoto che ha rifiutato il fetch (offline,
credenziali errate) viene confrontato con l'ultima punta nota. Non dice se i tuoi
commit sono *buoni*: solo che esistono qui e non lì.

**Vedi anche:** [Merge e rebase](merging.md) · [Worktree](worktrees.md)
