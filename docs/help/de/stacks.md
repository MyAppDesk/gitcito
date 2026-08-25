---
title: Gestapelte Branches
category: Branches & Eingriffe
order: 43
summary: Ketten abhängiger Branches — kaskadierender Restack und verkettete PRs mit einem Klick.
keywords: stack stapel gestapelt stacked branches graphite restack abhängig dependent kette chain parent eltern PR pro ebene per level submit einreichen autopilot retarget umzielen basis
---

# Gestapelte Branches

Ein Stack ist eine Kette von Branches, in der jeder auf dem darunter aufbaut:
`main → api → ui`. Drei kleine PRs zu reviewen schlägt es, einen riesigen zu
reviewen.

![Ein Branch-Stack](../../screenshots/branch-stack.webp)

Gitcito zeichnet ihn als **Route**: oben ein Start-Branch, darunter eine Station
pro Ebene. Der PR jeder Station zielt auf die Station darüber, und die erste landet
auf dem Start-Branch. Eine Station zeigt ihre eigenen Commits, ob sie ein Restack
braucht, und nach dem Einreichen ihre PR-Nummer.

## Die Route bearbeiten

| Bedienelement | Was es tut |
|---------------|------------|
| Das Feld **Start** | Wo der Stapel landet. Ändere es, und die ganze Kette wird auf den neuen Branch verknüpft und abgespielt. |
| Das Feld einer **Station** | Tauscht, welcher Branch an dieser Stelle steht. Der Branch, der die Route verlässt, wird nur ausgehängt, nie gelöscht. |
| **↑ / ↓** | Verschiebt eine Station um einen Platz. |
| **✕** | Nimmt die Station aus der Route; ihre Nachbarn rücken zusammen. |
| **Station hinzufügen** | Wähle einen Branch, den du schon hast — er kommt oben dazu — oder tippe einen Namen, den es noch nicht gibt: er wird auf der Spitze der letzten Station angelegt und ausgecheckt. |
| Die Pfeil-Schaltfläche | Checkt diese Station aus. |

Jedes Feld ist ein Tippfeld mit Vorschlägen: tippen filtert, ↑/↓ und Enter wählen,
und was du tippst, zählt auch abseits der Liste — eine Remote-Referenz wie
`origin/main` taugt also als Start-Branch.

Unter der Haube sind all diese Änderungen *dieselbe* Operation: die ganze Route,
auf einmal zurückgegeben. Deshalb ist eine Geste ein Widerruf (<kbd>⌘Z</kbd>) und
keine Spur halb angewandter Verknüpfungen.

## Was eine Routenänderung kostet

Alles, was die Reihenfolge ändert — ein Tausch, ein Zug, ein anderer Start —
**spielt** die Kette **neu ab**: die eigenen Commits jeder Station werden auf ihre
neue Basis rebased. Das kann also **Konflikte** geben, genau wie ein Restack.
Gitcito hält beim ersten Konflikt an und übergibt die Konfliktansicht; die
Stationen davor sind bereits verschoben.

Das Widerrufen spielt die vorherige Route nach. Es erweckt nicht die alten Commits,
denn die neuen sind dieselbe Arbeit mit anderen Eltern.

## Alle pushen

**Alle pushen** pusht jede Ebene mit `--force-with-lease` und hört dort auf — `gh
stack push`, ohne etwas zu öffnen. **Stapel als PRs einreichen** macht denselben
Push und dann die PR-Arbeit; nimm **Alle pushen**, wenn die Branches auf dem
Remote liegen sollen, aber noch keine Review ansteht.

## Den Stack als verkettete PRs einreichen

**Stack als PRs einreichen** erledigt mit einem Klick, wofür Stacking-Tools
Geld verlangen:

1. Pusht jede Ebene mit `--force-with-lease` (frische Branches tolerieren es,
   restackte brauchen es).
2. Öffnet für jede Ebene ohne PR einen — jeder **basiert auf seinem
   Parent-Branch**, nicht auf `main`, sodass jedes Review nur die eigenen
   Commits zeigt. Titel und Beschreibung stammen aus den Commits der jeweiligen
   Ebene.
3. Zielt jeden bestehenden PR um, dessen Basis abgedriftet ist.
4. Schreibt einen **Stack-Navigationsabschnitt** in jeden PR-Body, damit ein
   Reviewer auf jeder Ebene die ganze Kette sehen kann und wo dieser PR darin
   steht.

Die Aktion ist **idempotent**: Drücke sie nach jedem Restack, jeder neuen
Ebene oder jedem gemergten PR und sie konvergiert — nichts wird dupliziert,
angefasst wird nur, was abgedriftet ist.

Wenn der unterste PR **gemergt** ist, räumt derselbe Button hinterher: das
Kind der gemergten Ebene wird auf den Trunk umgehängt, das Tracking der Ebene
aufgehoben, ihr lokaler Branch gelöscht (sicher — der Trunk enthält ihn
nachweislich), die Kette restackt und jeder verbleibende PR umgezielt. Von
unten nach oben mergen, Einreichen drücken, wiederholen.

## Restack

Wenn ein unterer Branch sich ändert — du hast Review-Kommentare auf `api`
abgearbeitet —, ist jeder Branch darüber jetzt auf der falschen Basis gebaut.
**Restack** rebast die gesamte Kette kaskadierend mit `rebase --onto`, sodass
das Umschreiben eines Parents keine Commits in seine Kinder dupliziert. Nach
einem Restack drücke erneut **Einreichen**: Es force-pusht die umgeschriebenen
Ebenen und die PRs aktualisieren sich an Ort und Stelle.

## Grenzen

- Das Einreichen ist vorerst **nur für GitHub** möglich (das Erstellen
  funktioniert auf allen vier Hosts, aber Umzielen und Body-Updates brauchen
  die GitHub-API).
- Das Aufräumen nach dem Merge der untersten Ebene erkennt Merge- und
  Rebase-Merges über die Abstammung, und **Squash**-Merges, indem es GitHub
  fragt, ob der PR des Branches gelandet ist — mit einem GitHub-Token wird
  also jeder Merge-Stil aufgeräumt. Auf anderen Hosts, oder ohne Token, muss
  das Tracking einer squash-gemergten Ebene weiterhin von Hand aufgehoben
  werden. Fetche außerdem zuerst — die Abstammungsprüfung liest den Trunk im
  Stand deines letzten Fetch.
- Der Stack-Abschnitt in einem PR-Body wird zwischen versteckten Markern
  gepflegt — deine eigene Beschreibung darüber bleibt erhalten.
- Umordnen und ein Trunk-Wechsel **schreiben Historie um**, auf jeder berührten
  Ebene. Die Branches gehören dir, und ungepushte Ebenen kosten nichts — aber
  eine Ebene, die bereits in Review ist, bekommt beim nächsten Einreichen einen
  Force-Push.
- Eine Ebene bewegt sich immer nur um einen Platz. Zwei Tausche sind zwei
  Rebases, und auf halbem Weg stehenzubleiben ist ein lesbarer Zustand; ein Zug,
  der drei Plätze weiter landet, ist es nicht.

## Wo die Verknüpfungen liegen

Die Parent-Verknüpfungen werden in der **git config** gespeichert, sie reisen
also mit dem Repository mit und überleben einen erneuten Clone. Nichts davon
liegt in einem Dienst.

**Siehe auch:** [Interaktives Rebase](rebase.md) · [Hosting & Pull Requests](hosting.md)
