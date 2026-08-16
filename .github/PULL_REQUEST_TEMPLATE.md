## Summary

<!-- What does this PR do? Why? -->

## Type of change

- [ ] `feat:` New feature
- [ ] `fix:` Bug fix
- [ ] `docs:` Documentation
- [ ] `chore:` Maintenance / tooling
- [ ] `refactor:` Code change (no feature, no bug fix)
- [ ] `perf:` Performance improvement
- [ ] `test:` Tests only

## Checklist

- [ ] PR title follows `type(scope): description` format
- [ ] `npm run typecheck` passes
- [ ] `npm run lint:i18n` passes — every new string is in **every** locale file
- [ ] `npm run lint:docs` passes — every new surface has a handbook page
- [ ] `npm test` passes
- [ ] Tested locally

### If this changes something a user can see

- [ ] `docs/help/` page written or updated
- [ ] `scripts/docs-map.json` maps the new modal / page tab / right panel tab / command
- [ ] `README.md` mentions it in one line, linked to its page
- [ ] Front-page feature? Add it to `FEATURES` in `scripts/build-site.mjs`
- [ ] Destructive actions confirm first; reversible ones offer an undo
- [ ] Screenshot entry added to `examples/screenshots/shots.config.mjs`

### Show it

A reviewer cannot run every branch. If this PR adds a **panel, a modal, a
settings section, or a new visible state**, paste a screenshot below. If it adds
a **gesture** — a drag, a drop target, an animation, a keyboard flow — paste a
short screen recording instead: a still cannot show a drag, and a description of
one cannot be reviewed.

<!-- Drop the image or video here. Say "n/a — nothing visible changes" if that is the case. -->

n/a
