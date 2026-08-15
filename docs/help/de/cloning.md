---
title: Klonen
category: Erste Schritte
order: 2
summary: Von einer URL klonen oder direkt vom Hoster — und eingrenzen, was heruntergeladen wird, wenn das Repository riesig ist.
keywords: klonen clone shallow depth partial filter blob none single branch submodule submodules recursive ls-remote branch-auswahl unshallow monorepo
---

# Klonen

**Neues Repository → Klonen**, oder `⌘K` → *Klonen*. Füge eine URL ein, oder
melde dich bei GitHub, GitLab, Bitbucket oder Azure DevOps an und wähle aus
deinen eigenen Repositorys — das Token des gewählten [Profils](profiles.md)
wird für den Klon verwendet und danach verworfen, es landet nie in
`.git/config`.

Wähle einen übergeordneten Ordner und einen Namen; die Zeile unter den Feldern
zeigt dir genau, wo das Repository landen wird. Ein bereits existierender
Ordner wird abgelehnt statt hineinzuklonen.

## Erweitert — den Klon eingrenzen

Alles unter **Erweitert** ist standardmäßig aus: Lässt du es in Ruhe, bekommst
du einen ganz gewöhnlichen, vollständigen Klon. Seine Berechtigung hat der
Bereich bei Repositorys, wo „vollständig“ zwanzig Minuten und mehrere Gigabyte
bedeutet.

![Der Klon-Dialog mit geöffnetem Bereich „Erweitert“: partial, shallow, single-branch, Submodule und eine Branch-Auswahl](../../screenshots/clone-advanced.webp)

| Option | Was git tut | Was es kostet |
|--------|---------------|---------------|
| **Partial Clone** | `--filter=blob:none` | Vollständige Historie, keine Dateiinhalte. Blobs kommen bei Bedarf, also braucht das Öffnen einer alten Datei das Netzwerk. |
| **Shallow Clone** | `--depth=N` | Nur die neuesten N Commits existieren. Blame, Log, Bisect und Range-Diff enden am Schnitt. |
| **Nur ein Branch** | `--single-branch` | Die übrigen Branches bleiben auf dem Remote, bis du sie fetchst. |
| **Submodule klonen** | `--recurse-submodules` | Jedes Submodul wird ebenfalls ausgecheckt — mehr Zeit jetzt, dafür später keine fehlenden Verzeichnisse. |
| **Auszucheckender Branch** | `--branch <name>` | Startet auf diesem Branch statt auf dem Standard-Branch des Remotes. |

**Partial vor Shallow.** Ein Partial Clone behält jeden Commit — die Historie
bleibt durchsuchbar, und nur Dateiinhalte werden verzögert geholt. Ein Shallow
Clone wirft Historie tatsächlich weg: `git log` endet am Schnitt, und Blame
kann nicht darüber hinaussehen. Wenn du ein Monorepo klonst, um darin zu
arbeiten, ist Partial normalerweise das, was du willst.

Shallow lässt sich rückgängig machen: `git fetch --unshallow` im
[Terminal](terminal.md) füllt die Historie wieder auf.

### Den Branch wählen

Tippe einen Branch-Namen, oder drücke **Branches auflisten**, um den Remote zu
fragen, was er hat (`git ls-remote --heads`), und wähle aus einer Auswahlliste.
Das ist ein einziger Netzwerk-Roundtrip, und er passiert nur, wenn du den Knopf
drückst — während du tippst, wird nichts abgefragt.

Schlägt die Auflistung fehl — eine private URL ohne Token, ein Tippfehler, kein
Netz —, bleibt das Feld ein simples Textfeld, und der Klon selbst meldet dann
den echten Fehler.

### Zwei Anmerkungen zu den Flags

- **`--depth` impliziert `--single-branch`.** Bei einem Shallow Clone ist es
  gerade das *nicht* gesetzte Häkchen bei *Nur ein Branch*, das die übrigen
  Branches wieder anfordert (`--no-single-branch`) — deshalb ändert sich der
  Hinweis darunter.
- **Beim Klonen eines lokalen Ordners** ignoriert git `--depth` normalerweise
  komplett, weil es den Objektspeicher hardlinkt, statt ihn zu übertragen.
  Gitcito klont deshalb über eine `file://`-URL, wenn du eine flache Kopie
  eines lokalen Repositorys anforderst — so bekommst du die Tiefe, die du
  angefordert hast.

## Fortschritt

Der Balken meldet, was git meldet: zählen, komprimieren, empfangen, auflösen,
auschecken. Eine Phase, die keine Gesamtzahl melden kann, zeigt einen
unbestimmten Balken statt eines erfundenen Prozentwerts.

Das neue Repository öffnet sich in einem Tab, angeheftet an das Profil, mit dem
du geklont hast.
