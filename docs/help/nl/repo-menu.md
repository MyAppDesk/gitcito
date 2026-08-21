---
title: Contextmenu van de repository
category: Begin hier
order: 4
summary: Rechtsklik een repositorychip of -tabblad voor alias, worktrees, GitHub, terminal en verwijderen.
keywords: contextmenu rechtsklik alias worktree github terminal tonen reveal editor verwijderen repository tabblad
---

# Contextmenu van de repository

Rechtsklik een repository — een losstaand tabblad, een chip in een groep, een
chip in een geneste map, een rij in de welkomst-/launcherlijst, of een rij in de
repositorykeuzelijst van de werkbalk — en je krijgt hetzelfde menu, gericht op
die repository. De groepschip zelf opent nog steeds het groepsmenu; de klik moet
op de repository landen.

![Het contextmenu van de repository op een chip in een groep](../../screenshots/repo-context-menu.webp)

De repositorykeuzelijst in de werkbalk toont elke open repository, net zoals de
branchkeuzelijst branches toont. Linksklik een rij om ernaartoe te wisselen.
Rechtsklik een rij (of de pil van de huidige repository zelf) voor alias,
worktrees, GitHub, terminal, tonen, editor en verwijderen. **Repository openen…**
onderaan opent de launcher.

![Rechtsklikken op een rij in de repositorykeuzelijst van de werkbalk](../../screenshots/repo-dropdown-context-menu.webp)

## Wat elke actie doet

| Actie | Effect |
|---|---|
| **Alias maken…** / **Alias wijzigen…** | Alleen een weergavenaam. Gitcito hernoemt of verplaatst de map op schijf nooit. Dezelfde alias volgt de repository over tabbladen, groepen en workspaces heen. |
| **Alias verwijderen** | Wordt getoond wanneer er een alias bestaat. Herstelt de mapnaam. |
| **Worktrees tonen** | Brengt deze repository in beeld en opent de worktreesectie van de zijbalk. |
| **Nieuwe worktree…** | Dezelfde worktree-aanmaakprompt als vanaf een branch. Uitgeschakeld zolang het pad ontbreekt of er een merge/rebase/cherry-pick/revert bezig is. |
| **Reponaam kopiëren** | Kopieert de eigenlijke mapnaam, niet de alias. |
| **Repopad kopiëren** | Kopieert het absolute pad. |
| **Bekijken op GitHub** | Origin als dat github.com is, anders de eerste ontleedbare GitHub-remote. Uitgeschakeld wanneer er geen af te leiden valt. |
| **Openen in terminal** | Opent de terminal van Gitcito met deze repository als werkmap. |
| **Tonen in Finder / Verkenner** | Licht de repositorymap op in het bestandsbeheer van het platform. |
| **Openen in externe editor** | De editor die in de instellingen is ingesteld. Zichtbaar maar uitgeschakeld tot er een is gekozen. |
| **Verwijderen…** | Sluit het tabblad of haalt de chip uit de groep. Gebruikt dezelfde waarschuwing voor niet-gecommit werk als de **×**-knop. Het verwijdert nooit bestanden van schijf. |

Bij een ontbrekend of ongeldig pad blijven kopiëren, alias en verwijderen
beschikbaar, en wordt alles grijs wat de map zou openen of bekijken.

**Zie ook:** [Workspaces, tabbladen & groepen](workspaces.md) · [Worktrees & submodules](worktrees.md) · [Externe editor](editor.md) · [Terminal](terminal.md)
