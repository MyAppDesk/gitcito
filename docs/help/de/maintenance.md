---
title: Repository-Wartung
category: Repository & Historie
order: 15
summary: Was das Repository auf der Platte kostet, wie viel davon zurückzuholen ist und was jeder Git-Job tatsächlich täte.
keywords: wartung maintenance gc garbage collect aufräumen repack prune fsck count-objects lose loose gepackt packed objekte objects speicherplatz disk space größe size optimieren optimise optimize commit-graph git maintenance zeitplan schedule dangling
---

# Repository-Wartung

Git sagt dir nie, was ein Repository kostet. Es arbeitet einfach weiter, in
welchem Zustand seine Objektdatenbank auch sein mag — das erste Anzeichen für
ein Problem ist deshalb meist ein Clone, der kriecht, oder ein Laptop ohne
freien Speicher. Lange nach dem Punkt, an dem ein einziger Befehl es behoben
hätte.

Dieses Panel ist die fehlende Anzeige: wohin der Platz gegangen ist, wie viel
davon zurückzuholen ist, und was jeder Job tut, bevor du ihn startest.

`⌘K` → **Repository-Wartung**.

![Plattenbelegung aufgeteilt in gepackt, lose und unerreichbar, darunter die Wartungsjobs](../../screenshots/maintenance.webp)

## Die Zahlen lesen

Alles kommt aus `git count-objects -v` und einem echten
Erreichbarkeits-Durchlauf — nichts ist geschätzt.

| Zeile | Was es ist | Warum es wächst |
|-----|-----------|--------------|
| **Gepackt** | Objekte in Packfiles, komprimiert und deltifiziert | Das ist der gesunde Zustand |
| **Lose** | Eine Datei pro Objekt, kaum komprimiert | Jeder Commit, jeder Fetch schreibt davon |
| **Unerreichbar** | Objekte, auf die nichts mehr zeigt | Verworfene Commits, geänderte Nachrichten, abgebrochene Rebases |

Die Zahl neben **Lose** — *„n Objekte, m bereits gepackt"* — ist die, auf die
es sich zu achten lohnt. Diese `m` liegen doppelt herum: einmal lose, einmal in
einem Pack. Sie sind reine Duplikate, und `git gc` ist das, was sie
zusammenfaltet.

**Unerreichbar heißt noch nicht Müll.** Genau diese Objekte sind es, über die
`git reflog` dir einen Commit zurückholt, den du weggeresettet hast. Git hebt
sie zwei Wochen lang absichtlich auf.

## Die Jobs

| Knopf | Führt aus | Kosten |
|--------|------|------|
| **Optimieren** | `git gc` | Sekunden bis eine Minute. Fast immer die richtige Antwort |
| **Von Grund auf neu packen** | `git gc --aggressive` | Minuten in einem großen Repository. Berechnet jedes Delta neu |
| **Commit-Graph neu bauen** | `git commit-graph write --reachable` | Schnell. Macht Log- und Graph-Durchläufe spürbar flotter |
| **Integrität prüfen** | `git fsck --dangling` | Langsam in einem großen Repository, ändert nichts |
| **Unerreichbare jetzt verwerfen** | `git gc --prune=now` | Zerstört das Sicherheitsnetz des Reflogs |

**Optimieren** ist der Knopf, nach dem du greifen solltest. Er packt lose
Objekte, verwirft, was seit über zwei Wochen unerreichbar ist, und lässt die
jüngere Historie wiederherstellbar.

**Von Grund auf neu packen** ist überschätzt. Es wirft jedes vorhandene Delta
weg und rechnet bei null wieder los, was Minuten dauert und gegenüber einem
schlichten gc meist ein paar Prozent spart. Einmal nach dem Import einer
riesigen Historie lohnt es sich; routinemäßig nicht.

**Unerreichbare jetzt verwerfen** fragt vorher nach, und die Bestätigung nennt
dir, wie viele Objekte und wie viel Platz es betrifft. Danach ist ein Commit,
den du vor einer Stunde weggeresettet hast, unwiederbringlich — der
Reflog-Eintrag mag noch dastehen, aber das Objekt dahinter ist weg.

## Integrität prüfen

`git fsck` prüft nach, dass jedes Objekt, auf das ein anderes Objekt verweist,
tatsächlich vorhanden und in sich stimmig ist.

- **Baumelnde Objekte („dangling") sind normal.** Das sind die unerreichbaren,
  namentlich aufgeführt. Ein Repository mit Hunderten davon nach einem Rebase
  ist gesund.
- **Fehlende Objekte sind ein Schaden** — ein abgeschnittener Schreibvorgang,
  eine kaputte Platte, eine unterbrochene Übertragung. Tauchen welche auf: nicht
  neu packen. Eine beschädigte Datenbank neu zu packen kann ein behebbares
  Problem in ein endgültiges verwandeln. Klone stattdessen eine gute Kopie von
  deinem Remote und schaff deine ungepushten Branches per
  [Bundle](export.md) hinüber.

## Wartung im Hintergrund

Das Häkchen meldet das Repository bei **`git maintenance`** an, das nach einem
Zeitplan packt und vorablädt, den dein Betriebssystem ausführt (launchd,
systemd oder Aufgabenplanung).

Nichts davon ist Gitcito-spezifisch: Derselbe Zeitplan bedient auch dein
Terminal, und `git maintenance unregister` macht es von überall rückgängig. Das
Häkchen zu entfernen tut genau das — und lässt den Zeitplan für alle anderen
angemeldeten Repositorys bestehen.

## Grenzen, die man kennen sollte

- **Die Zahl der unerreichbaren Objekte braucht einen vollständigen
  Erreichbarkeits-Durchlauf**, deshalb dauert das Öffnen des Panels in einem
  sehr großen Repository einen Moment. Das ist die ehrliche Zahl, keine
  Schätzung.
- **Größen sind das, was die Platte hergibt**, nicht die Länge des Inhalts. Ein
  loses Objekt von 400 Byte belegt trotzdem einen 4-KB-Block — weshalb tausend
  davon Megabyte kosten, und weshalb es sich lohnt, sie zu packen.
- **Ein Worktree oder Submodul hat sein eigenes `.git`**, die angezeigte Größe
  ist also allein die dieses Repositorys.
- **Wartung kann Historie nicht schrumpfen.** Steckt ein 400-MB-Blob in einem
  Commit, ist er erreichbar, und gc wird ihn für immer behalten — das ist
  [eine Datei aus der Historie entfernen](history-purge.md), eine andere und
  weit einschneidendere Operation.
- **Gitcito führt niemals hinter deinem Rücken gc aus.** Gits eigenes
  `gc --auto` kann das weiterhin, wie eh und je; schlägt eines fehl,
  hinterlässt es eine Notiz in `.git/gc.log`, die dieses Panel dir zeigt.

Siehe auch: [Eine Datei aus der Historie entfernen](history-purge.md) ·
[Bundles & Archive](export.md) · [Wiederherstellung](recovery.md)
