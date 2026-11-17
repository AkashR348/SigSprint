# Saved progress

Progress lives on the phone under the key `sigsprint.progress.v1`, read and written only by
`src/lib/progressStore.ts`.

## Backups of a damaged save

When a save cannot be read as sound progress, the home screen offers **Start fresh**. After the
person agrees, the raw text of the damaged save is copied to `sigsprint.progress.backup.<time in ms>`
and a fresh save replaces it.

- Nothing reads these backups yet, and nothing removes them. Each is a few hundred bytes.
- A failed attempt that got as far as the copy leaves that copy behind, so a retry adds another.
- If the save has vanished between the notice and the tap, there is nothing to copy and none is made.

Open question for the product: whether to offer a restore or support path for these copies, or to
keep only the latest one.
