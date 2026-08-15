---
title: Einen Pull Request lokal ansehen
category: Sync & viele Repos
order: 57
summary: Führe den Pull Request von jemand anderem auf deinem Rechner aus, ohne irgendetwas zu committen — auf jedem Host, auch bei PRs aus Forks.
keywords: vorschau lokal ansehen pull request merge request PR MR fork auschecken testen ausprobieren refs/pull refs/merge-requests pull-requests remote branch
---

# Einen Pull Request lokal ansehen

Ein Diff im Browser durchzulesen sagt dir, ob sich der Code gut liest. Es sagt
dir nicht, ob die App überhaupt noch startet. Um das herauszufinden, musst du
den Branch ausführen — und genau da bleiben die Leute hängen, denn ein Pull
Request aus einem Fork liegt in einem Repository, das du nie geklont hast und in
das du oft gar nicht pushen kannst.

Das lokale Ansehen löst das mit einer Tatsache, die die meisten nie lernen
müssen: Forges veröffentlichen den Head jedes Pull Requests als ganz normale
Git-Ref **im Ziel-Repository**. Der Fork muss nicht erreichbar sein, du brauchst
kein API-Token, und es wird kein zweiter Remote angelegt. Ein Fetch, und der
Code liegt auf deiner Platte.

![Lokal ansehen: Remote, Pull Request und die Art der Anwendung wählen](../../screenshots/pr-preview.webp)

| Host | Wo der PR-Head liegt |
|------|-------------------------|
| GitHub, GitHub Enterprise, Gitea, Forgejo, Gogs | `refs/pull/<n>/head` |
| GitLab (Cloud und selbst gehostet) | `refs/merge-requests/<n>/head` |
| Bitbucket Cloud, Bitbucket Server | `refs/pull-requests/<n>/from` |
| Azure DevOps | `refs/pull/<n>/merge` |

Gitcito probiert alle vier in einem einzigen `ls-remote` durch, also
funktioniert auch eine unbekannte oder selbst gehostete Forge, solange sie einer
dieser Konventionen folgt.

## Wo du es öffnest

- In der Pull-Request-Liste in der Seitenleiste — der Pfeil-Button an jedem
  Eintrag. Das funktioniert für jeden Host, anders als die Detailansicht, die es
  nur für GitHub gibt.
- Über die Befehlspalette: **Pull Request lokal ansehen**.
- In der Detailansicht eines Pull Requests, neben dem Button „im Browser
  öffnen“.

## Was du angibst

**Remote** — das Repository, *gegen* das der Pull Request geöffnet wurde,
normalerweise `origin`. Nicht der Fork.

**Pull Request** — die Nummer oder eine eingefügte Browser-URL. `7`, `#7` und
`https://github.com/owner/repo/pull/7` funktionieren alle; genauso die
URL-Formen von GitLab, Bitbucket und Azure DevOps. Drück auf **Suchen**, und
Gitcito nennt dir die aufgelöste Ref und den Commit, auf den sie zeigt — bevor
irgendetwas gefetcht wird.

**Remote-Branch** — der zweite Tab, für den Fall, dass es keine PR-Ref zu finden
gibt: ein Host, der sie nicht veröffentlicht, oder einfach ein Branch, den du
ausprobieren willst. Gib den Branch-Namen so an, wie er auf dem Remote heißt.

## Die zwei Arten, ihn anzuwenden

Keine von beiden schreibt einen Commit. Das ist Absicht — eine Vorschau, aus der
du nicht einfach wieder herauskommst, ist keine Vorschau.

| Modus | Was passiert | Wie du es rückgängig machst |
|------|--------------|-----------------|
| **Ein lokaler Branch** | Die Ref wird auf einen eigenen Branch geholt (standardmäßig `pr/7`) und ausgecheckt. Deine anderen Branches bleiben unangetastet. | Undo bringt dich zurück auf den Branch, auf dem du warst, und löscht den Vorschau-Branch. |
| **Ein Merge, den du nicht committet hast** | Die Ref wird mit `--no-commit --no-ff` in den aktuellen Branch gemerged, sodass der kombinierte Baum gestaged liegen bleibt und du ihn bauen und testen kannst. | Undo bricht den Merge ab. |

Denselben Pull Request ein zweites Mal anzusehen nutzt denselben Branch wieder
und schiebt ihn auf den neuen Head — praktisch, wenn der Autor einen Fix pusht,
während du gerade testest. Wenn dieser Branch schon existiert, sagt Gitcito das
und fragt nach, bevor er zurückgesetzt wird, denn jeder Commit, der nur dort
liegt, wäre verloren.

## Was es nicht tut

- **Es kann keine Ref erfinden, die der Host nicht veröffentlicht.** Manche
  selbst gehosteten Konfigurationen schalten PR-Refs ab; manche Forges hatten
  sie nie. Du bekommst ein klares „keine Ref für #n“ und den Remote-Branch-Tab
  als Weg drumherum.
- **Es fetcht keine Tags.** Eine Vorschau sollte nicht den Tag-Namensraum von
  jemand anderem in dein Repository schleppen.
- **Der Merge-Modus braucht ein sauberes Arbeitsverzeichnis.** Git weigert sich,
  über nicht committete Arbeit zu mergen; [stashe](stashes.md) sie vorher.
- **Eine Vorschau ist kein Review.** Sie legt den Code auf deinen Rechner — sie
  genehmigt, kommentiert oder merged nichts. Dafür gibt es
  [Hosting & Pull Requests](hosting.md).
- **Private Forks bleiben privat.** Die PR-Ref wird vom Ziel-Repository
  ausgeliefert, der Zugriff hängt also an deinen Credentials für *dieses* Remote
  — siehe [Sicherheit](security.md).

## Aufräumen

Ein Vorschau-Branch ist ein ganz normaler Branch: Lösch ihn aus der
Seitenleiste, wenn du fertig bist, oder drück direkt nach der Vorschau auf Undo.
Ein nicht committeter Vorschau-Merge lässt sich per Undo verwerfen — oder
auflösen und committen, wenn du dich doch dafür entschieden hast. Ab dem Moment
hört er auf, eine Vorschau zu sein, und wird [ein Merge](merging.md).
