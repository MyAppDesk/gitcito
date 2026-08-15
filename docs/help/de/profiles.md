---
title: Profile
category: Anpassen
order: 101
summary: Getrennte Identitäten und Tokens für die Arbeit und alles andere.
keywords: profil profile identität identity git user email e-mail tokens konten accounts wechseln switch
---

# Profile

Ein Profil bündelt eine **Git-Identität** (Name und E-Mail) mit ihren
**Integrations-Tokens**. Wechselst du das Profil, wechseln beide zusammen —
Commits bekommen die richtige Autorschaft, und API-Aufrufe nutzen das richtige
Konto.

Nützlich, wenn dieselbe Maschine dienstliche und private Repositorys bedient,
oder wenn du zwei GitHub-Konten hast.

![Ein Profil: Git-Identität auf der einen Seite, die Integrations-Tokens auf der anderen](../../screenshots/settings-profiles.webp)

## Bindung pro Repository

Ein Repository kann an ein Profil **gebunden** werden, sodass ein
Hintergrund-Fetch darauf sich immer mit dem richtigen Konto authentifiziert —
auch dann, wenn du gerade auf ein Repository schaust, das zum anderen gehört.

Tokens liegen in deinem [Schlüsselbund des Betriebssystems](security.md),
niemals in der Einstellungsdatei.

**Siehe auch:** [Sicherheit & Geheimnisse](security.md) · [Hosting](hosting.md)
