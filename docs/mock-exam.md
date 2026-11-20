# Mock exam

A timed exam in the shape of the PTCE, opened from the Mock exam tile on the Study tab
(`src/app/mock/setup.tsx`, `src/app/mock/run.tsx`). The logic is in `src/lib/mockExam.ts`, the
wording in `src/lib/mockText.ts`, and the saved shape in `src/lib/mockSave.ts`.

## Lengths and modes

- **Full**: 90 questions in 110 minutes, the figures in `src/content/domains.ts`. **Half**: 45 in
  55, drawn at random by the same weights (16, 8, 11, 10).
- **Exam-like**: the clock is an end time, so it runs on while the app is closed. No pause.
- **Relaxed**: the clock is the time left. It stops on Pause, which hides the question, and when
  the app leaves the foreground; the exam comes back paused, and so does one opened again after
  some of its time is used.
- In both, the exam ends when the time is used up, a notice shows for the last 10 minutes, and
  unanswered questions count as wrong.
- Questions can be skipped, flagged and changed. Nothing is marked right or wrong until the exam
  is submitted. Submitting with blanks asks once.
- Until the question bank exists, every exam is drawn by exam weight from the starter questions,
  with the questions and each question's choices in a new order. The setup screen says how many.

## What is saved, and when

One exam at a time lives in saved progress as `exam`, written on every answer, flag and move, so
closing the app loses nothing. The screen draws the exam the phone holds, so a tap shows only once
it is saved. Answers are stored by the choice's position in the question, not
by where it was drawn. The setup screen offers to continue or quit an exam in progress before
another can start.

Finishing is one write (`finishExam`): the points, the day's answered count, the result row and the
removal of `exam` together, and only for the exam in progress, so a result can never be counted
twice. A late save of an exam that has ended is refused (`keepExam`). Quitting removes `exam` and
counts nothing, and the screen leaves only once the quit is saved.

If the result cannot be saved, the exam stays in progress, so the review of right answers waits
until the save succeeds; otherwise the exam could be continued with the answers known.

`exams` keeps the last 10 results, newest first, for both modes and lengths.

## Scoring

- Points: 10 for a correct answer, minus 5 for a wrong one, nothing for a blank, added once at the
  end. The total stops at 0.
- Every answered question counts toward the daily goal on the day the exam ends. A strict exam
  that ran out while the app was closed ended at its end time, not when the app opened again.
- The estimate is `1000 + 600 × correct ÷ total`, to the nearest 10. PTCB does not publish its
  conversion, so the screen calls it a rough estimate, says it is not a PTCB score, and says
  whether it is above or below PTCB's passing score of 1,400. It never says pass or fail.
