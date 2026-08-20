---
title: Dateiattribute
category: Workspace-Werkzeuge
order: 96
summary: .gitattributes mit Oberfläche — Zeilenenden, Binärdateien, union-gemergte Changelogs, export-ignore und lesbare Diffs für Word und PDF.
keywords: gitattributes attribute dateiattribute diff-treiber textconv merge union binär export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr
---

# Dateiattribute

`.gitattributes` ist die wertvollste Datei in git, die fast niemand schreibt.
Damit **bringt ein Repository git seine eigenen Inhalte bei**: welche Dateien
binär sind, welche aneinandergehängt statt in Konflikt geführt werden sollen,
welche nie in einem Archiv landen, welche Zeilenenden alle bekommen.

Der entscheidende Punkt: sie wird committet. Eine Regel, die du hinzufügst,
behebt das Problem für alle, die klonen, auf jedem Betriebssystem, für immer —
anders als eine Einstellung in deiner eigenen Config, die es nur für dich behebt
und deine Kolleginnen und Kollegen auf die harte Tour draufkommen lässt.

`⌘K` → **Dateiattribute**.

![Die Regeln, die ein Repository bereits mitbringt, die Vorlagen, der Pfadprüfer und die Diff-Treiber](../../screenshots/attributes.webp)

## Was die Regeln bewirken

| Attribut | Behebt |
|-----------|-------|
| `text=auto eol=lf` | Zeilenenden, die davon abhängen, wer die Datei ausgecheckt hat |
| `binary` | Dass git versucht, ein PSD, ein DOCX oder ein kompiliertes Asset zu diffen oder drei-Wege zu mergen |
| `merge=union` | Ein Changelog, an das alle anhängen und an dem alle in Konflikt geraten |
| `-merge` | Dateien, bei denen ein Drei-Wege-Merge Unsinn produziert — Lockfiles, generierter Code |
| `export-ignore` | CI-Konfiguration und Fixtures, die in einem Release-Tarball mitgeliefert werden |
| `diff=<driver>` | Unlesbare Diffs für Formate, die sehr wohl lesbar *sind*, wenn man einen Konverter hat |
| `filter=lfs` | Große Dateien, gespeichert über [LFS](lfs-sparse.md) |
| `linguist-vendored` | Fremdcode, der in der Sprachstatistik als deiner gezählt wird |

`binary` ist die Kurzform für `-diff -merge -text`, also drei Antworten auf
"hör auf, über diese Datei zu raten" in einem Wort.

## Bearbeiten

Die Vorlagen füllen ein Muster und dessen Attribute aus; passe das Muster vor
dem Hinzufügen an — `CHANGELOG.md` ist ein Vorschlag, keine Aussage über dein
Projekt.

**Änderungen sind chirurgisch.** Fügst du eine Regel für ein Muster hinzu, das
schon eine hat, wird diese Zeile an ihrer Stelle umgeschrieben, statt eine
zweite Regel anzuhängen, die nur gewinnt, weil sie später steht. Kommentare in
der Datei bleiben unangetastet, denn das "Warum" neben einer Regel ist meist
mehr wert als die Regel selbst.

Jedes Speichern ist eine ganz normale Gitcito-Aktion: es toastet, und
**Rückgängig** stellt die Datei exakt so wieder her, wie sie war.

**Ein Repository kann mehrere Attributdateien haben.** Eine im Wurzelverzeichnis,
eine in jedem Unterverzeichnis und eine private `.git/info/attributes`, die nie
committet wird und nur auf deiner Maschine gilt — der richtige Ort für eine
Regel, bei der es um dich geht und nicht um das Projekt. Gitcito listet sie alle
auf und sagt dir, welche welche ist.

## Was gilt für einen Pfad?

Regeln kommen aus mehreren Dateien, die spezifischere gewinnt, und sie
durchzulesen, um die Antwort herzuleiten, ist Raterei. **Was gilt für einen
Pfad?** führt `git check-attr` aus und zeigt, was git selbst daraus schließt —
die einzige Antwort, die zählt.

## Diff-Treiber: ein Word-Dokument lesbar machen

Ein `.docx` ist ein Zip. Ein `.pdf` ist ein komprimierter Objektgraph. Git
diffet sie als das, was sie sind — Rauschen — und so ist die Historie eines
Dokuments unlesbar, obwohl das Dokument es nicht ist.

Ein **Diff-Treiber** behebt das mit `textconv`: ein Befehl, der die Datei *nur
zum Diffen* in Text verwandelt. Die Datei in deinem Arbeitsverzeichnis bleibt
unangetastet; git vergleicht bloß den konvertierten Text.

Zwei Hälften, und beide werden gebraucht:

1. `diff.<name>.textconv` in der git-Config — der Konverter-Befehl.
2. `*.docx diff=<name>` in `.gitattributes` — auf welche Dateien er zutrifft.

Die Buttons hier erledigen beides auf einmal. Für Word, Excel und JSON
**liefert Gitcito den Konverter selbst mit** — dieselbe Dokumenten-Analyse,
die auch seine Vorschauen nutzen, als kleiner `gitcito-textconv`-Befehl in der
App — diese drei funktionieren also ganz ohne Installation. Der Rest braucht
weiterhin ein echtes Tool in deinem PATH: Gitcito prüft das und graut aus, was
fehlt, statt einen Treiber zu schreiben, der beim ersten Diff scheitert.

| Treiber | Braucht | Bringt dir |
|--------|-------|-----------|
| `word` | nichts — wird mit Gitcito geliefert | Fließtext-Diffs von `.docx` |
| `excel` | nichts — wird mit Gitcito geliefert | Zeilen-Diffs (CSV je Blatt) von `.xlsx`/`.xls` |
| `json` | nichts — wird mit Gitcito geliefert | Nach Schlüsseln sortierte, stabile JSON-Diffs |
| `pdf` | `pdftotext` (poppler) | Text-Diffs von `.pdf` |
| `exif` | `exiftool` | Was sich an einem Bild geändert hat, wenn die Pixel undurchsichtig sind |

Die Grenzen des mitgelieferten Konverters, klar benannt: `.doc` (das alte
binäre Word-Format) wird nicht verstanden, nur `.docx`; PDF ist nicht
abgedeckt — Gitcito zeigt PDFs mit dem Viewer des Browsers an und hat keinen
Textextraktor zum Wiederverwenden; und jeder Diff eines Dokuments zahlt eine
kurze Startzeit des Konverters. Mit `git config diff.<name>.cachetextconv true`
cacht git die Ausgabe pro Blob.

Die Konverter-Hälfte liegt in **deiner** Config, nicht im Repository — git führt
keine Befehle aus, die ein Klon dir unterschiebt, und das ist eine
Sicherheitseigenschaft, die man behalten will. Die mitgelieferten Treiber
zeigen außerdem auf *deinen* Gitcito-Installationspfad; wer also klont, bekommt
die `diff=word`-Regel und, bis er einen eigenen Konverter verdrahtet (Gitcito
oder etwas anderes), den alten unlesbaren Diff. Schreib das in dein README.

## Grenzen, die man kennen sollte

- **Clean-/Smudge-Filter werden hier nicht angeboten.** `filter=<name>`-Regeln
  kannst du von Hand schreiben, aber Gitcito konfiguriert die Befehle nicht: ein
  Filter läuft bei jedem Checkout jeder passenden Datei, und ein falscher
  beschädigt stillschweigend dein Arbeitsverzeichnis.
- **`text=auto` ändert, was committet wird**, und normalisiert Zeilenenden auf
  dem Weg hinein. Füge es in einem bestehenden Repository hinzu und führe dann
  bewusst `git add --renormalize .` aus, in einem eigenen Commit.
- **Attribute wirken nicht rückwirkend.** Eine Datei heute als `binary` zu
  markieren, ändert nicht, wie ihre vergangenen Diffs gespeichert wurden; es
  ändert, wie git sie ab jetzt behandelt.
- **Regeln greifen nur dort, wo die Datei sichtbar ist.** Eine Regel in
  `design/.gitattributes` sagt nichts über `src/` aus.
- Gitcito schreibt ganze Dateien, eine von Hand formatierte Datei kommt also mit
  ihrer Formatierung zurück — aber eine Regel, die Gitcito umschreibt, wird auf
  gits kanonische `pattern attr attr`-Abstände umformatiert.

Siehe auch: [LFS & Sparse Checkout](lfs-sparse.md) ·
[Bundles & Archive](export.md) · [Merge-Optionen](merge-options.md) ·
[Hooks](hooks.md)
