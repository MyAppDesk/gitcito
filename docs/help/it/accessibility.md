---
title: Accessibilità
category: Personalizzazione
order: 78
summary: Supporto per screen reader e tastiera — cosa è coperto, e cosa non ancora.
keywords: accessibilità accessibility a11y screen reader VoiceOver NVDA navigazione da tastiera focus aria contrasto movimento ridotto
---

# Accessibilità

Gitcito punta a essere usabile senza mouse e leggibile da uno screen reader.
Questa pagina dice cosa significa in concreto — e dove stanno i confini.

## Tastiera

- **Schede, righe della barra laterale, liste di file e menu della toolbar**
  sono focalizzabili e si attivano con Enter o Space. I pulsanti divisi
  (pull/push/stash) espongono la freccia del menu a tendina come controllo
  focalizzabile a sé.
- **Il grafo dei commit** è un'unica fermata del focus: dagli il focus e usa
  Su/Giù (o j/k) per percorrere la storia. Il commit selezionato viene
  annunciato con oggetto, autore e posizione. Shift+F10 (o il tasto menu)
  apre il menu contestuale del commit selezionato.
- **I menu contestuali** si aprono già focalizzati: le frecce spostano, Enter
  attiva, ArrowRight/ArrowLeft entrano ed escono dai sottomenu, Escape
  chiude.
- **I dialoghi** intrappolano Tab al loro interno, alla chiusura
  restituiscono il focus dov'eri, e si chiudono con Escape.
- La **palette dei comandi** (Cmd/Ctrl+K) è una combobox: i risultati vengono
  annunciati mentre digiti e mentre li scorri con le frecce.

## Screen reader

- Ogni dialogo viene annunciato con il suo titolo. I toast — il canale di
  feedback dell'app — sono live region: i successi si annunciano con garbo,
  gli errori interrompono.
- L'avanzamento (clone, download di un aggiornamento) è esposto come barra di
  avanzamento con percentuale, e gli stati di attesa ("Recupero in corso…")
  si annunciano da soli.
- Lo stato dei file viene letto ("Aggiunto", "Modificato", "In conflitto"),
  non solo mostrato come glifo colorato.
- La finestra è strutturata con landmark (banner, main, barra laterale, barra
  di stato), quindi la navigazione per landmark funziona.

## I limiti, detti chiaramente

- **Il terminale** è xterm.js e ne eredita la storia con gli screen reader,
  che è debole. Trattalo come una superficie per utenti vedenti; ogni
  operazione git che offre esiste anche come azione dell'interfaccia.
- **Cosmos (la storia in 3D), le corsie del grafo dei commit e i diff delle
  immagini** sono visivi per natura. I dati dietro di loro — la lista dei
  commit, le liste dei file — sono accessibili; l'immagine in sé no.
- **Il trascinamento** (riordinare i passi di un rebase interattivo,
  trascinare i branch per fare merge) è solo da puntatore dove indicato; ogni
  azione di trascinamento ha un equivalente in un menu o in un pulsante.
- L'audit dietro questa pagina è stato fatto con VoiceOver su macOS.
  NVDA/JAWS su Windows dovrebbero comportarsi allo stesso modo ma non sono
  stati collaudati sul campo — le segnalazioni sono benvenute come
  [issue](https://github.com/MyAppDesk/gitcito/issues).

## Impostazioni collegate

**Il movimento ridotto** viene rispettato dall'impostazione di sistema — le
animazioni collassano in transizioni istantanee. Il contrasto si può regolare
tema per tema in [Impostazioni → Aspetto](themes.md).
