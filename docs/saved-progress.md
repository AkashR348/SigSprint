# Saved progress

Progress lives on the phone under the key `sigsprint.progress.v1`, read and written only by
`src/lib/progressStore.ts`.

## Backups of a damaged save

When a save cannot be read as sound progress, the home screen offers **Start fresh**. After the
person agrees, the raw text of the damaged save is copied to `sigsprint.progress.backup.<time in ms>`
and a fresh save replaces it.

- A failed attempt that got as far as the copy leaves that copy behind, so a retry adds another
  with the same text.
- The fresh save keeps whatever list of handled backups could still be read in the damaged one, so
  a backup counted before the damage is not offered again after it.
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
  numbers. Every other waiting backup with exactly the same text goes in with it: copies of one
  damaged save are one backup, and are added once.
- The backup is read again at the moment of the tap, so what is added is what is on the phone then.
  If it has gone by then, **Add** fails and says nothing changed; it is never reported as added.
- Afterwards the card says what happened ("Added to your progress.") and a screen reader is moved
  to that line. The line goes away the next time progress changes, such as the next answer.
- Accepted risk: a save damaged so that its handled list is unreadable while some of its days still
  are forgets that list. If its backup is added and then an older, already counted backup is added
  too, the older numbers count twice. It takes two separate damaged saves and that exact damage.
