# Extraction TDD evidence

## Scope

This repository was extracted from an application-specific React Native tour implementation. The public package owns target registration, overlay layout, and controlled progression. Application stores, routes, analytics, and product-specific steps are deliberately excluded.

## User journeys

1. As an app developer, I can highlight a registered target without the spotlight leaving the device viewport.
2. As an app developer, I can place guidance near a target without a top-positioned card colliding with the device safe area.
3. As an app developer, I can show a centred card when no target exists.

## RED / GREEN evidence

| Stage | Command | Result |
| --- | --- | --- |
| RED | `pnpm test` | Failed as intended: `Cannot find module '../src/layout'`. |
| GREEN | `pnpm test` | Passed: 3 layout contract tests. |
| Type safety | `pnpm typecheck` | Passed. |
| Distribution | `pnpm build` and `npm pack --dry-run --cache <temporary-directory>` | Passed; package contains only `dist`, README, LICENSE, and package metadata. |

## Test specification

| # | Guarantee | Test | Result |
| --- | --- | --- |
| 1 | Spotlight padding clamps to the screen bounds. | `test/layout.test.ts` — `pads a target...` | PASS |
| 2 | A top placement flips below a target with insufficient safe-area clearance. | `test/layout.test.ts` — `places a top tooltip...` | PASS |
| 3 | An untargeted step gets a centred, in-bounds card layout. | `test/layout.test.ts` — `centres an untargeted...` | PASS |

## Known gaps

The package does not yet have simulator-backed integration tests for React Native measurement or touch forwarding. Those behaviors are implemented with React Native's `measureInWindow` and standard `View`/`Pressable` primitives and should be covered in an Expo example app before a 1.0 release.
