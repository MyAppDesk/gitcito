---
title: Sprachen & Rechts-nach-links
category: Anpassen
order: 102
summary: Wähle deine Oberflächensprache über Flagge und Eigenbezeichnung, mit gespiegeltem Layout für Arabisch und Hebräisch.
keywords: sprache sprachen language languages locale locales i18n internationalisierung übersetzung translation rtl rechts-nach-links right-to-left arabisch hebräisch spiegeln richtung flagge endonym englisch spanisch deutsch französisch portugiesisch italienisch niederländisch polnisch türkisch russisch ukrainisch chinesisch japanisch koreanisch
---

# Sprachen & Rechts-nach-links

Gitcitos Oberfläche ist übersetzt. Die Sprache ist eine
Einstellung von Gitcito, keine des Betriebssystems — eine Entwicklerin auf einer
englischen macOS-Installation, die lieber Japanisch liest, stellt das hier ein,
und ein Entwickler auf einem hebräischen System, der die App auf Englisch
bevorzugt, wird nicht überstimmt.

**Einstellungen → Allgemein → Sprache.**

![Die Sprachauswahl](../../screenshots/languages.webp)

## Was mitgeliefert wird

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Jede Zeile in der Auswahl steht in ihrer eigenen Sprache. Wer Koreanisch sucht,
sucht nach 한국어 — nicht nach dem Wort „Koreanisch" in einer Sprache, die er
gerade verlassen will.

### Zu den Flaggen

Eine Flagge benennt ein Land; eine Locale benennt eine Sprache. Die beiden
decken sich schlicht nicht — Arabisch ist in über zwanzig Staaten Amtssprache,
und Portugiesisch liegt auf zwei Kontinenten. Die Symbole folgen derselben
Konvention wie die Sprachauswahl jedes Betriebssystems: der primären Region der
Locale. Sie sind da, um *auf einen Blick erkannt* zu werden, nicht um eine
Aussage darüber zu treffen, wem eine Sprache gehört.

Sie sind absichtlich als Vektorgrafik gezeichnet und nicht als Emoji. Windows
liefert überhaupt keine Flaggen-Emoji aus — `🇩🇪` erscheint dort als Kasten mit
den Buchstaben „DE".

## Rechts-nach-links

Arabisch und Hebräisch spiegeln die gesamte Oberfläche: Die Seitenleiste
wandert nach rechts, Panels und Werkzeugleisten drehen sich um, Symbole, die
irgendwohin zeigen, zeigen in die andere Richtung.

Der Wechsel ist sofort wirksam und braucht keinen Neustart.

![Gitcito auf Arabisch, mit gespiegeltem Layout](../../screenshots/rtl.webp)

### Was bewusst nicht gespiegelt wird

Manche Inhalte laufen von links nach rechts, egal in welcher Sprache du liest.
Sie zu spiegeln wäre aktiv falsch, also bleiben sie, wie sie sind:

| Bleibt LTR | Warum |
|-----------|-----|
| Der Commit-Graph | Die Positionen der Lanes werden in Pixeln berechnet; ein gespiegelter Container würde nicht mehr zu den gezeichneten Linien passen |
| Diffs und Dateiinhalte | Code ist LTR, und ein gespiegeltes Diff ist unlesbar |
| Blame und die Konfliktausgabe | Derselbe Grund — der Text ist Quellcode, keine Prosa |
| Das integrierte Terminal | Es zeichnet sein eigenes Raster; Gits Ausgabe ist LTR |
| Pfade, SHAs, Refs und Befehle | `refs/heads/main` liest sich nur in eine Richtung |

Jedes davon ist isoliert, damit ein Stück Arabisch *darin* — ein Branch-Name,
eine Commit-Nachricht, ein Dateiname — den Text drumherum nicht umsortieren
kann.

### Die Grenzen

Hier ist ehrlich gesagt, wo es aufhört:

- **Commit-Nachrichten, Branch-Namen und Dateiinhalte werden von Gitcito
  niemals umgerichtet.** Sie werden so gezeigt, wie ihre Autorin sie geschrieben
  hat. Eine hebräische Commit-Nachricht in einer LTR-isolierten Liste erscheint
  als Hebräisch, aber die umgebende Zeile kippt nicht mit.
- **Fremde Oberflächen behalten ihre eigene Richtung** — das Terminal ist xterm,
  und Markdown-Vorschauen rendern das Dokument so, wie es geschrieben ist.
- **Dateinamen mit gemischter Richtung sind schwierig.** Ein Pfad mit einem
  arabischen Ordner in einem englischen Baum wird isoliert statt umsortiert.
  Das ist korrekt, kann beim ersten Mal aber trotzdem überraschend aussehen.

## Dieses Handbuch ist ebenfalls übersetzt

Nicht nur die Schaltflächen. Jede Seite, die du hier liest, existiert in jeder
Sprache, die die Liste oben zeigt — die Erklärungen, die Tabellen dazu, was jede
Option tut, die Abschnitte, die sagen, was eine Funktion bewusst nicht tut. Wer die Sprache der
Oberfläche wechselt, wechselt das Handbuch mit, in der App wie auf der Website.

Eine Übersetzung darf unvollständig sein. Ist eine Seite noch nicht übersetzt,
bekommst du die englische statt einer fehlenden Seite, und die Seitenleiste
behält in jeder Sprache dieselbe Form, damit ein Screenshot oder eine Anweisung
weiterhin zu dem passt, was du siehst.

Auf der Website trägt jede Seite eine Sprachumschaltung, die dich auf der Seite
lässt, die du gerade gelesen hast — die Sprache zu wechseln ist schließlich
nicht dasselbe wie von vorn anzufangen.

**Was maschinell übersetzt ist, und was das kostet.** Englisch und Spanisch sind
von Hand geschrieben. Den Rest hat ein Modell gegen ein Glossar übersetzt, danach
hat ein Skript geprüft: jede Seite, jeder Link, jeder Bildpfad, jeder Codeblock
Byte für Byte gegen das Englische. Das findet kaputte Struktur. Es findet keinen
Satz, der zwar korrekt, aber hölzern ist. Wenn eine Seite sich in deiner Sprache
schlecht liest, ist das ein Fehler, den zu melden sich lohnt.

## Eine Sprache hinzufügen

Die Wörterbücher liegen als eine Datei pro Locale unter
`src/renderer/src/i18n/`, und die englische Datei ist die Referenz, gegen die
jede andere typgeprüft wird — ein fehlender Schlüssel ist ein Compile-Fehler,
kein stiller Rückfall auf Englisch. Die Testsuite prüft außerdem, dass jeder
`{placeholder}`, den ein String interpoliert, die Übersetzung überlebt — ein
Satz kann seine Commit-SHA auf dem Weg in eine andere Sprache also nicht
verlieren.

Das Handbuch funktioniert genauso: `docs/help/` enthält die englischen Seiten
und `docs/help/<locale>/` jede Übersetzung, eine Datei pro Seite mit demselben
Dateinamen. `npm run lint:docs` prüft, dass jede übersetzte Seite ein englisches
Original hat, dass ihr Front Matter vollständig ist und dass ihre Links und
Bilder aus einer Ebene tiefer auflösen.

Beiträge sind willkommen — eine Seite nach der anderen ist völlig in Ordnung,
und eine holprige Übersetzung zu glätten ist genauso nützlich, wie eine fehlende
zu ergänzen.

**Siehe auch:** [Themes & Erscheinungsbild](themes.md) · [Profile](profiles.md)
