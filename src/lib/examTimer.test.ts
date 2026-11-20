import { createExamTimer } from './examTimer';

test('a strict clock runs from its end time and cannot be stopped', () => {
  let now = 1000;
  const timer = createExamTimer('exam', 61_000, () => now);
  expect(timer.msLeft()).toBe(60_000);
  timer.stop();
  now = 31_000;
  expect(timer.running()).toBe(true);
  expect(timer.msLeft()).toBe(30_000);
  now = 99_000;
  expect(timer.msLeft()).toBe(0);
});

test('a relaxed clock starts stopped, and time that passes while it is stopped is not counted', () => {
  let now = 0;
  const timer = createExamTimer('relaxed', 60_000, () => now);
  now = 500_000;
  expect(timer.running()).toBe(false);
  expect(timer.msLeft()).toBe(60_000);
  timer.start();
  now += 10_000;
  expect(timer.msLeft()).toBe(50_000);
  timer.stop();
  now += 900_000;
  expect(timer.msLeft()).toBe(50_000);
  timer.start();
  // Starting a running clock does not give its time back.
  now += 5000;
  timer.start();
  expect(timer.msLeft()).toBe(45_000);
  now += 100_000;
  expect(timer.msLeft()).toBe(0);
});
