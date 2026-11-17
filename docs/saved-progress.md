# Saved progress

Progress lives on the phone under the key `sigsprint.progress.v1`, read and written only by
`src/lib/progressStore.ts`.

## Backups of a damaged save

When a save cannot be read as sound progress, the home screen offers **Start fresh**. After the
person agrees, the raw text of the damaged save is copied to `sigsprint.progress.backup.<time in ms>`
and a fresh save replaces it.

- A failed attempt that got as far as the copy leaves that copy behind, so a retry adds another.
- If the save has vanished between the notice and the tap, there is nothing to copy and none is made.
- A backup is never deleted or changed.

## Recovering a backup

Once the save is ready again, the home screen shows a card for the newest backup that has not been
handled (`RecoverCard`). It says what could be trusted in it: days with a sound answer count, and
the points if they were a sound number. The daily goal is not recovered.

- **Add to my progress** adds those days and points to what is there now, so answers given since
  starting fresh are kept. Points that could not be read add nothing and the card says so.
- **Don't recover**, or **OK** when nothing was sound, sets the backup aside.
- Either way the backup's key goes into `handledBackups` in the save, in the same write as the
  numbers, so a backup can never be counted twice or offered again.
- The backup is read again at the moment of the tap, so what is added is what is on the phone then.
