# Project conventions

SigSprint is a free iOS and Android study app for the PTCB's PTCE exam, built with Expo and
TypeScript. It has no accounts: progress lives on the phone. Questions come from a pre-generated,
source-checked bank served by a small Supabase backend. `AGENTS.md` holds Expo's own rules for
this SDK; read it before touching an Expo or React Native API.

## How to edit this file

- One entry is one rule, its reason, and where it is enforced. A third paragraph belongs in `docs/`.
- Write the rule, not the incident. No dates, no PR numbers. A correction replaces the entry it corrects.
- Re-check a count or a path before trusting it.
- Ceiling: 400 lines. Past it, an older entry is merged, cut, or moved to `docs/`.

## Rules that bind everywhere

1. **The app name is written once.** Screens read `brand.name` from `src/lib/brand.ts`; `app.json`
   mirrors it for the stores. A rename is then two lines.
2. **An absence is never a zero.** "Not loaded", "couldn't load" and "zero" are three states, and a
   screen draws each differently. `useToday()` returns a `status`; `goalProgress()` returns `null`
   when there is nothing to measure. Never write `?? 0` over a failed or missing read.
3. **Colours, fonts and spacing come from `src/theme/tokens.ts`.** A new text and background pair
   is checked for 4.5:1 contrast before it is added. Tap targets are at least `minTouch`.
4. **The exam outline lives in `src/content/domains.ts`.** Topic filters, the question bank and the
   mock exam all read the weights from there. `domains.test.ts` pins them to the outline in force.
5. **No secret ships in the app or the repository.** The Claude API key lives only in the backend's
   secrets. The repository is public, so `.env*` files stay ignored and are never committed.
6. **Every model call goes through one backend module**, with the provider and model as settings.
   A failed or refused generation refuses; it never falls back to an unchecked question.
7. **Every question has one clearly correct answer and a stored source.** A question that cannot be
   confirmed against a primary source (FDA label, DEA rule, the PTCB outline), or where two answers
   could be argued, is dropped. Third-party practice questions are never copied or reworded.
   `starterQuestions.test.ts` checks that each stores a source on a primary site; only reading the
   source checks the answer itself. A sum cites the source of the fact it uses.
8. **Comments are short and say only what the code can't**: an invariant, a unit, a trap, or the
   reason for a surprising choice. One line, two at most. No history; git has it.
9. **Progress is read and written only through `src/lib/progressStore.ts`**; lint
   (`no-restricted-imports`) fails any other import of the storage package. No save is a fresh
   install; a failed read or a damaged save is `unavailable`, and an update is refused unless the
   state is `ready`, so a damaged save is never overwritten. A change shows on screen only after it
   is saved. A damaged save is replaced only by `startFresh`, and only once a copy of it is on the
   phone; `progressStore.test.ts` asserts each. The screen asks before calling it, and waits while
   it runs; `SaveNotice.test.tsx` asserts that.

## Layout

| Path | What it is |
| --- | --- |
| `src/app` | Expo Router screens, one file per route. `_layout.tsx` is the root stack and `(tabs)/_layout.tsx` the tab bar; a test runs outside the tabs. No route is named `test.tsx`: jest takes it for a test. |
| `src/components` | Shared UI in the Capsule Pop style. |
| `docs` | Notes that need more than a rule: one file per subject. |
| `src/content` | Exam facts: domains, weights, mock exam shape, and the starter questions that ship in the app. |
| `src/lib` | Pure logic and hooks. Logic that can be a pure function is one, with a test beside it. |
| `src/theme` | Design tokens. |

## Checks

All three run in CI on every pull request and must pass with no warnings.

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

App source takes no `eslint-disable`; fix the cause. Dependencies are added with versions that
match the Expo SDK in `node_modules/expo/bundledNativeModules.json`.

## Testing

- A test fixture is built from what the code under test really returns, and asserts on the request
  made as well as the result.
- A new rule in this file names the test or check that enforces it, or says that nothing does.
