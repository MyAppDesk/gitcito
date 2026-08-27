---
title: Konflikte lösen
category: Mit Änderungen arbeiten
order: 32
summary: Ein Drei-Fenster-Resolver, der dir sagt, welche Seite welche ist.
keywords: konflikt konflikte lösen resolver merge conflicts ours theirs marker three-way rerere reuse recorded resolution merken wiederholen
---

# Konflikte lösen

Wenn ein Merge, Rebase, Cherry-Pick oder Revert stehen bleibt, sagt dir ein
Banner, **was** stehen geblieben ist und **zwischen was** — „`feature/x` wird in
`main` gemergt“, nicht nur „Konflikt“.

![Der Konflikt-Resolver](../../screenshots/conflict-resolver.webp)

## Warum das hier kollidiert

**Warum das hier kollidiert** listet im Kopfbereich pro Seite die Commits auf,
die diese Datei angefasst haben, seit die Branches sich getrennt haben — also
`git log --merge`, das git seit jeher mitbringt und das niemand findet.

![Die Commits jeder Seite, die die konfliktbehaftete Datei angefasst haben](../../screenshots/conflict-why.webp)

Die Marker sagen, was kollidiert. Das hier sagt, wer es geändert hat und warum —
und genau das entscheidet meist tatsächlich über die Lösung. Steht dort nichts,
hat keine der beiden Seiten eine Änderung an genau diesem Pfad committet: Die
Kollision kam von einer Umbenennung oder einer Verschiebung.

## Die drei Fenster

| Fenster | Ist |
|---|---|
| Links | **Ours** — die Seite, auf der du warst, beschriftet mit ihrem Commit |
| Rechts | **Theirs** — die hereinkommende Seite, beschriftet mit ihrem Commit |
| Mitte | Das **Ergebnis**: editierbar, mit Zeilennummern, und das, was tatsächlich gestaged wird |

Alle drei Fenster lassen sich in der Größe verändern, und die Kopfzeile des
Ergebnisses trägt zwei Ansichtsschalter:

| Schalter | Was er tut |
|---|---|
| **Umbruch** | Bricht lange Zeilen in den Fenstern A und B um, statt sie zu scrollen. Das Ergebnisfenster behält eine Zeile pro Zeile — seine Seitenmarker hängen davon ab — und scrollt deshalb immer |
| **Verknüpft** | Scrollt A, B und das Ergebnis gemeinsam, vertikal und seitlich. Ihre Zeilenzahlen unterscheiden sich, deshalb wird die vertikale Position proportional angeglichen |

Umbruch startet aus, Verknüpft startet an, und beide merken sich ihren Zustand.

## Sich zurechtfinden

Beim Öffnen einer Datei landest du auf ihrem **ersten Konflikt**, nicht am
Anfang der Datei. Die Pfeile ⌃ / ⌄ in der Kopfzeile des Ergebnisses — oder
<kbd>Alt+↑</kbd> / <kbd>Alt+↓</kbd> — führen durch die übrigen und scrollen
dabei alle drei Fenster zu jedem einzelnen.

## Auswählen

Pro **Zeile**, pro **Block** oder gleich die **ganze Seite** — und du kannst
beide Seiten eines Blocks übernehmen, wenn die Antwort „beides behalten“ lautet.
Ein Navigator führt dich Konflikt für Konflikt durch das, was noch offen ist,
damit du nicht versehentlich einen Marker zurücklässt.

## KI-Unterstützung

Ist die KI aktiviert, schlägt **Mit KI lösen** einen Merge im Ergebnis-Fenster
vor. Sie wendet nie etwas von selbst an: Du liest ihn, bearbeitest ihn und
stagest ihn. Siehe [KI-Funktionen](ai.md).

## Xcode-Projektdateien

`project.pbxproj` kollidiert häufiger als jede andere Datei in einem
iOS-Repository, und fast nie, weil jemand anderer Meinung gewesen wäre. Es ist
ein einziges flaches Wörterbuch aus Objekten mit 24-stelligen Hex-IDs: eine
Datei hinzuzufügen schreibt daher vier Einträge — ein `PBXBuildFile`, ein
`PBXFileReference`, eine Zeile in den `children` der zugehörigen Gruppe, eine
Zeile in der Build-Phase des Targets. Zwei Leute, die je eine Datei hinzufügen,
schreiben acht Einträge, die auf denselben paar Zeilen landen. Git sieht eine
Kollision; zu lösen gibt es nichts.

Ist die konfliktbehaftete Datei eine `project.pbxproj`, liest der Resolver alle
drei Fassungen als Projekte statt als Text und bietet an, **nach Struktur
zusammenzuführen**: Objekte über ihre ID zuordnen, jede Ergänzung beider Seiten
übernehmen, die `children`- und `files`-Arrays vereinigen und dort anhalten, wo
wirklich etwas auseinanderging. Das Band über den Panels sagt, was jede Seite
hinzugefügt hat und was — falls überhaupt — für dich übrig bleibt.

Wie der KI-Vorschlag landet es im Ausgabebereich und merkt nichts vor. Du liest
es, bevor du speicherst.

![Das Band für die strukturelle Zusammenführung über den Konflikt-Panels, bei einer Xcode-Projektdatei](../../screenshots/conflict-pbxproj.webp)

### Was es nicht tut

**Es rät nie bei einer Einstellung, die ihr beide verschoben habt.** Setzt du
`MARKETING_VERSION` auf `1.1` und sie auf `2.0`, ist das eine Entscheidung, und
sie steht benannt im Band — die Einstellung, dein Wert, ihrer — statt hinter
deinem Rücken aufgelöst zu werden. Ein Objekt, das es nicht klären konnte,
behält *deine* Fassung exakt, damit eine halb angewandte Zusammenführung nie auf
der Platte landet.

**Es lehnt die ganze Datei ab, wenn eine der drei Fassungen nicht parst.** Eine
`project.pbxproj`, die Xcode nicht öffnen kann, kostet mehr als eine manuelle
Zusammenführung — was es nicht mit Sicherheit lesen kann, bleibt also ein
gewöhnlicher Textkonflikt, und es sagt das auch.

**Es erkennt keine zwei IDs, die für verschiedene Objekte vergeben wurden.**
Selten, da Xcode sie zufällig wählt — aber wenn es passiert, würde jede der
beiden Seiten still jemandes Datei verlieren, also wird es gemeldet statt
zusammengeführt.

### Nicht `merge=union`

Das kursierende Hausmittel dafür ist `*.pbxproj merge=union` in
[`.gitattributes`](attributes.md). Lass es. Union funktioniert, solange die
einzigen Änderungen unabhängige Ergänzungen sind; sobald zwei Leute dieselbe
Build-Einstellung ändern, gibt es beide Zeilen aus und erzeugt eine Datei, die
Xcode nicht öffnet — genau in dem Moment, in dem du das Diff am wenigsten genau
liest. Strukturelles Zusammenführen bietet denselben Komfort ohne diesen
Fehlschlag.

## Lockfiles

`Podfile.lock`, `Package.resolved`, `yarn.lock` und ihre Verwandten halten einen
Abhängigkeitsgraphen fest, den irgendjemandes Resolver bereits gelöst hat. Die
Hälfte der einen Lösung an die Hälfte der anderen genäht ergibt einen Graphen,
den niemand gelöst hat: er installiert vielleicht nicht, und wenn doch,
installiert er etwas, das keiner der beiden Branches getestet hat.

Ist die konfliktbehaftete Datei also ein Lockfile, nennt das Band das Werkzeug,
dem sie gehört, bietet **Unsere behalten** und **Ihre behalten** gleich dort an
und gibt dir den Befehl, der sie danach neu erzeugt. Eine Seite zu nehmen ist
hier kein Kompromiss — es ist die ganze Methode, und das Neuerzeugen ist, was sie
richtig macht.

![Das Lockfile-Band über den Konflikt-Panels](../../screenshots/conflict-lockfile.webp)

Die drei Panels bleiben verfügbar, denn hin und wieder willst du sehr wohl
lesen, was sich geändert hat: eine Prüfsumme, die du wiedererkennst, eine
Version, die du erwartet hast. Sie von Hand zu bearbeiten ist das, wovon dies
dich abbringen will.

## Wie du sie gar nicht erst bekommst

Das [Konflikt-Radar](conflict-radar.md) sagt dir, welche Branches Konflikte
verursachen werden, bevor du einen von ihnen mergst.

## Git sich erinnern lassen (rerere)

Rebase einen langlebigen Branch, und du triffst jedes Mal denselben Konflikt
wieder. `rerere` — *reuse recorded resolution* — ist gits Antwort darauf: Es
merkt sich, wie du einen Konflikt beigelegt hast, und spielt diese Antwort beim
nächsten Auftreten des identischen Konflikts wieder ein.

**Einstellungen → Allgemein → Konfliktlösungen merken.** Das schreibt
`rerere.enabled` in deine globale git-Konfiguration, damit sich die
Kommandozeile genauso verhält.

Wenn git für dich geantwortet hat, sagt der Resolver das, statt einen leeren
„keine Konfliktmarker“-Bildschirm zu zeigen, und bietet **Diese Lösung
vergessen** an — was die Erinnerung löscht *und* den Konflikt zurückbringt,
damit du ihn anders beilegen kannst.

Zwei Dinge, die man wissen sollte:

- **Eine wiedereingespielte Lösung wird nicht gestaged**, es sei denn, du
  schaltest *Wiedereingespielte Lösung automatisch stagen* ein. Lass das aus:
  Der Sinn der Pause ist, dass eine gemerkte Antwort für genau diesen Merge
  falsch sein kann — und ungesehen zu stagen ist der Weg, auf dem sie in einen
  Commit gelangt.

  Deshalb **bleibt eine wiedereingespielte Datei in den konfliktbehafteten
  Dateien**: git hat den Inhalt geschrieben, aber der Index hält sie weiterhin
  als „unmerged“, und nur das Stagen klärt das. **So übernehmen** im Resolver
  oder **Alle als gelöst markieren** in der Liste bewegt sie.
- **rerere versteht nicht jeden Konflikt.** Add/Add- und Delete/Modify-Konflikte
  bekommen kein Preimage, sie kommen also immer roh zurück. Die Zahl in den
  Einstellungen ist die, die es tatsächlich vorhält, und **Alle vergessen** leert
  den Speicher.

**Siehe auch:** [Konflikt-Radar](conflict-radar.md) · [Mergen & Rebasen](merging.md)
