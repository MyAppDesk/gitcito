---
title: Repository-Regeln (.gitcito.json)
category: Workspace-Werkzeuge
order: 98
summary: Die Hausregeln, die ein Repository mitbringt — geschützte Branches, Commit-Scopes, was ein Klon braucht, und eine Checkliste vor dem Push.
keywords: gitcito.json repository konfiguration regeln doctor voraussetzungen geschützte branches scopes trailers ticket tracker-links checkliste onboarding hooksPath node submodule lfs env example
---

# Repository-Regeln (`.gitcito.json`)

Jedes Projekt trägt Regeln mit sich, die sich aus dem Code nicht ableiten
lassen. *Niemals direkt auf `release/*` pushen.* *Commit-Scopes sind `api`, `web`
und `infra`, sonst nichts.* *Du brauchst Node 20, ausgecheckte Submodule und eine
`.env`, kopiert aus `.env.example`, bevor irgendetwas läuft.* Solche Regeln
stehen in einer README, die niemand erneut liest, in einem CI-Fehler, oder im
Kopf der Person, die am längsten dabei ist.

`.gitcito.json` ist der Ort, an dem ein Repository sie aufschreibt, damit das
Werkzeug danach handeln kann. Die Datei liegt im Repository-Wurzelverzeichnis,
wird wie jede andere Datei versioniert und reist damit mit dem Klon: alle, die
das Projekt öffnen, bekommen dieselben Regeln — und neue Mitarbeitende bekommen
sie am ersten Tag statt beim ersten abgelehnten Push.

Die Datei ist völlig optional. Ein Repository ohne sie verhält sich genau wie
bisher.

Sie müssen sie nicht von Hand schreiben: Der [Repository-Chat](repo-chat.md)
kennt das Schema dieser Datei, also kommt *füge Ticket-Links für JIRA-1234 hinzu*
oder *schütze die Release-Branches* als prüfbare Dateiaktion zurück.

![Der Config-Tab des Repositorys mit den Doctor-Zeilen und den Regelabschnitten](../../screenshots/repo-config.webp)

## Wo man sie bearbeitet

Das Zahnrad neben den Werkzeugen der Symbolleiste → **Config**. Dieser Editor
schreibt die Datei in deinen Arbeitsbaum; sie wird sonst nirgends gespeichert —
also **committe sie**, um die Regeln mit dem Team zu teilen.

Hat das Repository noch keine, schlägt **Repository lesen** eine aus dem vor, was
ohnehin schon da ist: eine `.nvmrc` oder `engines.node`, eine `.gitmodules`,
`filter=lfs` in `.gitattributes`, eine `.env.example` ohne `.env` daneben, die
Branches, die du lokal schon schützt, und die Scopes, die die letzten 500
Commit-Betreffs verwendet haben. Nichts wird geschrieben, bis du speicherst. Im
Terminal macht `gitcito config init` dasselbe (siehe
[die Kommandozeile](cli.md)).

## Was die Datei sagen kann

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "API-Basis-URL und ein Dev-Token" }]
  },
  "checklist": {
    "push": ["Die Integrationssuite gegen Staging laufen lassen"]
  }
}
```

| Feld | Was es tut |
|---|---|
| `version` | Muss `1` sein. Eine Datei aus einem neueren Schema wird ganz ignoriert, statt geraten zu werden. |
| `protect` | Branch-Namen, `*` passt auf beliebigen Text. Wird zu den lokal geschützten Branches **hinzugefügt** — siehe [geschützte Branches](repo-settings.md). |
| `links.tickets` | Ein regulärer Ausdruck und eine URL-Vorlage. `$0` ist der ganze Treffer, `$1`…`$9` seine Gruppen. Treffer in Commit-Betreff und -Text werden zu Links. |
| `commit.scopes` | Die Scopes, die der Composer anbietet, statt eines Freitextfelds. Sie zu deklarieren macht aus einem unbekannten Scope in `gitcito commit-check` außerdem einen Fehler statt eines Stilhinweises. |
| `commit.ticketFromBranch` | Füllt den Ticket-Schlüssel aus dem Branch-Namen (`feature/ABC-123-sache` → `ABC-123`) — aber nur in einen leeren Composer, nie über etwas, das du gerade tippst. |
| `commit.trailers` | Zeilen, die an den Commit-Text angehängt werden. `{ticket}` und `{branch}` werden gefüllt; eine Zeile, deren Platzhalter nichts zu füllen hat, wird verworfen statt halb geschrieben. |
| `requires.*` | Was ein funktionierender Klon braucht. Jeder Eintrag wird zu einer Doctor-Zeile, siehe unten. |
| `checklist.push` | Freitext, einmal pro Sitzung vor dem ersten Push angezeigt. |

## Der Doctor

`requires` ist der Teil, der *„ich habe es geklont und es läuft nicht"*
beantwortet. Gitcito prüft es beim Öffnen des Repositorys und zeigt einen
Stethoskop-Chip in der Statusleiste, wenn etwas nicht stimmt. Ein Klick öffnet
den Config-Tab bei den Doctor-Zeilen; **Erneut prüfen** führt sie noch einmal
aus.

| Prüfung | Besteht, wenn | Reparatur |
|---|---|---|
| `node` | Das `node` in deinem PATH erfüllt die Angabe | — |
| `submodules` | Kein Submodul ist ohne Checkout | `git submodule update --init --recursive` |
| `lfs` | git-lfs ist installiert und die getrackten Dateien sind echte Inhalte, kein Pointer-Text | `git lfs pull` |
| `hooksPath` | `core.hooksPath` entspricht dem deklarierten Pfad | `core.hooksPath` setzen |
| `files` | Die Datei existiert | sie aus `from` kopieren, falls vorhanden |

Zwei bewusste Grenzen. Eine **Warnung** bedeutet nie „kaputt" — sie bedeutet, dass
der Doctor etwas nicht bestimmen konnte (eine unlesbare Node-Angabe besteht,
statt einen Fehler zu erfinden, gegen den du nichts tun kannst), und Warnungen
lassen `gitcito doctor` in der CI nicht fehlschlagen. Und eine Reparatur ist nie
etwas, das die Datei geliefert hat: die Menge oben ist die ganze Menge, zur
Compile-Zeit geschlossen. Die Konfiguration gibt ihr einen Wert — einen Pfad zum
Kopieren, einen Wert für `core.hooksPath` — und nie einen Befehl.

Das Kopieren überschreibt nie: dass die Datei fehlt, ist genau der Grund, warum
die Zeile da ist.

## Commits

Sind `commit.scopes` deklariert, bietet die Scope-Schaltfläche des Composers
diese Liste statt eines Freitextfelds — der Unterschied zwischen `feat(renderer)`
und `feat(rendererr)`. `ticketFromBranch` und `trailers` füllen die mechanischen
Teile einer Nachricht, und `links.tickets` macht aus den Schlüsseln überall dort
wieder Links, wo ein Commit angezeigt wird.

Dieselben Regeln gelten außerhalb des Fensters: `gitcito commit-check` liest
diese Datei, sodass ein `commit-msg`-Hook und die CI genau das durchsetzen, was
der Composer vorschlägt. Siehe [die Kommandozeile](cli.md) und
[Committen](committing.md).

## Die Push-Checkliste

`checklist.push` erscheint als Bestätigung vor dem ersten Push einer Sitzung,
eine Zeile je Eintrag. Sie ist der Platz für das, was wirklich Ermessenssache ist
— *hat jemand dem Support Bescheid gesagt?* —, denn Gitcito **prüft das nie für
dich**. Es sind Erinnerungen, keine Sperren: lesen und pushen, oder abbrechen.
Einmal pro Repository und Sitzung, denn ein Dialog bei jedem Push ist ein Dialog,
den niemand liest.

## Warum sie dir nicht schaden kann

Die Datei kommt mit dem Repository — also von wem auch immer das Repository
geschrieben hat. Sie wird als nicht vertrauenswürdiger Inhalt behandelt, genau
wie eine Commit-Nachricht:

- **Nichts darin wird ausgeführt.** Es gibt kein Feld, das einen Befehl enthält,
  und die Reparaturen des Doctors sind eine feste Liste.
- **Sie kann nur Einschränkungen hinzufügen.** `protect` ist die Vereinigung mit
  deiner lokalen Liste — ein Repository kann mehr schützen, als du gewählt hast,
  dir aber nie einen Schutz ausreden. Kein Feld schaltet eine Sicherung ab.
- **Pfade können das Repository nicht verlassen.** Absolute Pfade, `..`, `~`,
  Laufwerksbuchstaben und alles, was `.git` berührt, werden abgelehnt — und dort
  erneut geprüft, wo aus einer Zeichenkette ein echter Pfad wird.
- **Links müssen `http(s)` sein.** Nichts anderes wird dem URL-Öffner des Systems
  übergeben.
- **Alles ist gedeckelt** — Listenlängen, Textlängen, Musterlängen —, damit ein
  feindliches Repository keine Textwand in einen Dialog und keine tausend Chips
  in ein Panel kippen kann.

Ein fehlerhaftes Feld wird verworfen, nicht fatal. Der Rest der Datei gilt
weiterhin, und das Verworfene steht mit Begründung unter **Von Gitcito
ignoriert** im Config-Tab. Die einzige Ausnahme ist ungültiges JSON oder eine
unbekannte `version` — da gibt es nichts zu retten.

## Was sie bewusst nicht tut

- **Keine Befehle, keine Skripte, keine Hooks.** Dafür gibt es
  [Hooks](hooks.md), und die sind eine Entscheidung pro Klon.
- **Keine Regeln pro Branch oder pro Person.** Eine Datei, ein Regelsatz.
- **Sie ersetzt die CI nicht.** Die Checkliste ist Text; der Doctor prüft die
  Umgebung, nicht deine Arbeit.
- **Sie kann nichts abschwächen.** Jede Sicherung von Gitcito bleibt deine.

**Siehe auch:** [Einstellungen pro Repository](repo-settings.md) ·
[Die Kommandozeile](cli.md) · [Committen](committing.md) ·
[Hooks & .gitignore](hooks.md)
