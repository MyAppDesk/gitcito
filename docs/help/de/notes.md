---
title: Commit-Notizen
category: Historie lesen
order: 26
summary: Text an einen bereits gepushten Commit hängen — ohne den Commit zu ändern.
keywords: notizen notes git notes annotieren kommentar commit refs/notes review ticket amend umschreiben rewrite push notes fetch notes
---

# Commit-Notizen

Eine Commit-Nachricht wird einmal geschrieben und ist dann eingefroren: Sie zu
ändern schreibt den Commit um, gibt ihm einen neuen Hash und geht jedem kaputt,
der den alten schon hat. Eine Stunde nach dem Commit ist das in Ordnung, eine
Woche später unmöglich.

`git notes` ist der Ausweg. Eine Notiz wird **neben** dem Commit gespeichert,
unter `refs/notes/commits`, und eine anzuhängen lässt den Commit Byte für Byte
identisch. Sie funktioniert also auf bereits veröffentlichter Historie — genau
dann, wenn du am ehesten etwas ergänzen willst.

Typische Verwendung: das Review, das ihn abgenickt hat, das Ticket, das er
geschlossen hat, warum er zurückgenommen wurde, in welchem Release er
ausgeliefert wurde.

## Eine schreiben

Wähle einen Commit aus. Unter der Nachricht gibt es einen Abschnitt **Notiz**:
*Notiz hinzufügen*, tippen, **Notiz speichern**. Mehrzeilig ist in Ordnung.

![Eine Notiz unter der Nachricht eines gepushten Commits schreiben und dann speichern](../../screenshots/clip-commit-note.webp)

Eine Notiz zu speichern ist eine ganz gewöhnliche Gitcito-Aktion — sie meldet
sich per Toast, und **Rückgängig** stellt den vorherigen Text wieder her,
einschließlich einer Notiz, die du entfernt hast.

Den Text zu leeren und zu speichern entfernt die Notiz; eine leere Notiz gibt
es nicht.

## Eine finden

Notizen sind in einem normalen Log unsichtbar, was der Hauptgrund dafür ist,
dass die meisten sie nie entdecken. Gitcito markiert einen Commit, der eine
trägt, mit einem kleinen Notizsymbol in der Nachrichtenspalte des Graphen —
so ist die Anmerkung auffindbar, ohne dass man weiß, dass sie da ist.

Auf der Kommandozeile druckt `git log --notes` sie unter jede Nachricht.

## Sie teilen

**Das ist der Teil, der alle überrascht: Ein normaler `git push` pusht keine
Notizen, und ein normaler `git fetch` holt keine.** Sie leben außerhalb von
`refs/heads` und `refs/tags`, die Standard-Refspecs überspringen sie also
vollständig. Notizen, die du auf deinem Laptop schreibst, bleiben auf deinem
Laptop, bis sie jemand ausdrücklich bewegt.

Werkzeuge → **Notiz** → *Notizen pushen* / *Notizen fetchen*, pro Remote. Sie
führen aus:

```sh
git push <remote> refs/notes/commits
git fetch <remote> +refs/notes/commits:refs/notes/commits
```

Nur die Commit-Notizen-Ref reist — Gitcitos eigene maschinenlokale Refs (etwa
die Urteile der [lokalen CI](local-ci.md)) werden absichtlich nicht
veröffentlicht.

Manche Hoster brauchen zusätzlich, dass Notizen auf ihrer Seite aktiviert oder
erlaubt sind; eine Ablehnung dort ist die Richtlinie des Hosters, keine Grenze
von Gitcito.

Kein gemeinsames Remote, oder kein Schreibzugriff?
[Sicheres Teilen](secure-share.md) kann die Notizen eines Repositorys in eine
verschlüsselte Datei packen, die ein Teammitglied direkt importiert — mit einer
Vorschau darauf, was landen würde, und einer ausdrücklichen
Überschreiben-Entscheidung für auseinanderlaufende Notizen.

## Grenzen

- **Eine Notiz-Ref.** Gitcito liest und schreibt das voreingestellte
  `refs/notes/commits`. Eigene Namensräume (`git notes --ref=review`) werden
  nicht angeboten — ein Repository, das sie benutzt, wird diese Notizen hier
  nicht sehen.
- **Kein Merge auseinanderlaufender Notizen.** Wenn zwei Leute denselben Commit
  annotieren und beide pushen, verweigert Git den zweiten Push. Das aufzulösen
  heißt `git notes merge` im [Terminal](terminal.md).
- **Notizen werden nicht von einem Purge-Backup gesichert** und auch nicht von
  [Snapshots](recovery.md). Sie sind gewöhnliche Refs und überstehen normale
  Operationen, aber ein von Grund auf neu geklontes Repository startet ohne sie.

Siehe auch: [Committen](committing.md) · [Der Commit-Graph](graph.md)
