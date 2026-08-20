---
title: Accessibility
category: Make it yours
order: 78
summary: Screen-reader and keyboard support — what is covered, and what is not yet.
keywords: accessibility a11y screen reader VoiceOver NVDA keyboard navigation focus aria contrast reduced motion
---

# Accessibility

Gitcito aims to be operable without a mouse and legible to a screen reader.
This page says what that means concretely — and where the edges are.

## Keyboard

- **Tabs, sidebar rows, file lists and toolbar menus** are focusable and
  activate with Enter or Space. Split buttons (pull/push/stash) expose their
  dropdown arrow as its own focusable control.
- **The commit graph** is one focus stop: focus it and use Up/Down (or j/k) to
  walk history. The selected commit is announced with its subject, author and
  position. Shift+F10 (or the menu key) opens the selected commit's context
  menu.
- **Context menus** open focused: arrow keys move, Enter activates,
  ArrowRight/ArrowLeft enter and leave submenus, Escape closes.
- **Dialogs** trap Tab inside themselves, return focus to where you were when
  they close, and close with Escape.
- The **command palette** (Cmd/Ctrl+K) is a combobox: results are announced as
  you type and as you arrow through them.

## Screen readers

- Every dialog is announced with its title. Toasts — the app's feedback
  channel — are live regions: successes announce politely, errors interrupt.
- Progress (clone, update download) is exposed as a progress bar with a
  percentage, and busy states ("Fetching…") announce themselves.
- File status is spoken ("Added", "Modified", "Conflicted"), not just shown as
  a coloured glyph.
- The window is structured with landmarks (banner, main, sidebar, status bar),
  so landmark navigation works.

## The limits, stated plainly

- **The terminal** is xterm.js and inherits its screen-reader story, which is
  weak. Treat it as a sighted-user surface; every git operation it offers also
  exists as a UI action.
- **Cosmos (3D history), the commit-graph lanes and image diffs** are visual by
  nature. The data behind them — the commit list, file lists — is accessible;
  the picture itself is not.
- **Drag-and-drop** (reordering interactive-rebase steps, dragging branches to
  merge) is pointer-only where noted; each drag action has a menu or button
  equivalent.
- The audit behind this page was done with VoiceOver on macOS. NVDA/JAWS on
  Windows should behave equivalently but have not been road-tested — reports
  are welcome as [issues](https://github.com/MyAppDesk/gitcito/issues).

## Related settings

**Reduced motion** is honoured from the OS setting — animations collapse to
instant transitions. Theme contrast can be tuned per-theme in
[Settings → Appearance](themes.md).
