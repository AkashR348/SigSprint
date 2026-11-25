import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import MockRunScreen from '@/app/mock/run';
import MockSetupScreen from '@/app/mock/setup';
import { starterQuestions } from '@/content/starterQuestions';
import { drawExam } from '@/lib/mockExam';
import type { ExamRecord } from '@/lib/mockSave';
import { freshProgress, type Progress } from '@/lib/progress';
import { PROGRESS_KEY, resetProgressStoreForTests } from '@/lib/progressStore';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn(), dismissTo: mockDismissTo }) }));
jest.mock('expo-router/stack', () => ({ Stack: { Screen: () => null } }));

const record: ExamRecord = {
  at: new Date(2026, 10, 18, 9, 0).getTime(),
  mode: 'relaxed',
  length: 'half',
  correct: 31,
  total: 45,
  seconds: 2880,
  timedOut: false,
  byDomain: [{ id: 'medications', correct: 12, total: 16 }],
};

async function stored(): Promise<Progress> {
  return JSON.parse((await AsyncStorage.getItem(PROGRESS_KEY)) ?? 'null');
}
const seed = (progress: Partial<Progress>) => AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...freshProgress(), ...progress }));
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(async () => {
  resetProgressStoreForTests();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

// Jest finds no tests under src/app, so the routes' tests live here.
test('the setup screen states the rules for the mode and length chosen', async () => {
  await render(<MockSetupScreen />);
  expect(screen.getByText('90 questions in 110 minutes, weighted like the real exam.')).toBeTruthy();
  expect(screen.getByText('The clock never stops, even if you leave the app. There is no pause.')).toBeTruthy();
  expect(screen.getByText(`Until the question bank is ready, each exam draws its 90 questions from the same ${starterQuestions.length}.`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Mode, Relaxed' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Length, Half, 45 questions' }));
  expect(screen.getByText('45 questions in 55 minutes, weighted like the real exam.')).toBeTruthy();
  expect(screen.getByText(/You can pause, which hides the question/)).toBeTruthy();
  expect(await screen.findByText('No finished mock exams yet.')).toBeTruthy();
});

test('starting saves the exam chosen, then opens it', async () => {
  await render(<MockSetupScreen />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Mode, Relaxed' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Length, Half, 45 questions' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start exam' })).toBeEnabled());
  await press('Start exam');
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/mock/run'));
  const exam = (await stored()).exam;
  expect(exam).toMatchObject({ mode: 'relaxed', length: 'half', clock: 55 * 60_000, index: 0, flagged: [] });
  expect(exam?.ids).toHaveLength(45);
});

test('an exam that cannot be saved does not start, and says so', async () => {
  await render(<MockSetupScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start exam' })).toBeEnabled());
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await press('Start exam');
  expect(await screen.findByText(/didn't start/)).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

test('with an exam in progress the screen offers to continue it or quit it, not to start another', async () => {
  const exam = drawExam(starterQuestions, 'relaxed', 'full', 0)!;
  await seed({ xp: 40, exam: { ...exam, answers: exam.answers.map((a, i) => (i < 34 ? 1 : a)), clock: 3_730_000 } });
  await render(<MockSetupScreen />);
  expect(await screen.findByText('Relaxed · Full exam · 34 of 90 answered')).toBeTruthy();
  expect(screen.getByText('Its clock is stopped with 1:02:10 left.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Start exam' })).toBeNull();
  await press('Continue exam');
  expect(mockPush).toHaveBeenCalledWith('/mock/run');
  await press('Quit exam');
  expect(screen.getByText('Quit this exam? Nothing from it will count.')).toBeTruthy();
  expect((await stored()).exam).toBeDefined();
  await press('Yes, quit exam');
  expect(await screen.findByRole('button', { name: 'Start exam' })).toBeTruthy();
  const saved = await stored();
  expect(saved.exam).toBeUndefined();
  expect(saved.xp).toBe(40);
});

test('a quit that cannot be saved says so and keeps the question open', async () => {
  const exam = drawExam(starterQuestions, 'exam', 'half', Date.now() - 2 * 3600_000)!;
  await seed({ exam });
  await render(<MockSetupScreen />);
  // A strict exam's time has kept running out while the app was closed.
  expect(await screen.findByText('Its time has run out. Continue to see the result.')).toBeTruthy();
  await press('Quit exam');
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await press('Yes, quit exam');
  expect(await screen.findByText(/The exam couldn't be quit on this phone/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Yes, quit exam' })).toBeTruthy();
  expect((await stored()).exam).toBeDefined();
});

test('past results are listed with their mode, length, score and estimate', async () => {
  await seed({ exams: [record] });
  await render(<MockSetupScreen />);
  expect(await screen.findByText('Nov 18, 2026 · Relaxed · Half exam')).toBeTruthy();
  expect(screen.getByText('31 of 45 (69%) · estimate 1,410 · 48 min')).toBeTruthy();
  expect(screen.getByText('Medications 12/16')).toBeTruthy();
});

test('a save that cannot be read is not shown as no history, and no exam can start', async () => {
  await AsyncStorage.setItem(PROGRESS_KEY, '{broken');
  await render(<MockSetupScreen />);
  expect(await screen.findByText(/can't start until your progress loads/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start exam' })).toBeDisabled();
  expect(screen.queryByText('No finished mock exams yet.')).toBeNull();
  expect(screen.queryByText('PAST RESULTS')).toBeNull();
});

test('the exam screen with no exam in progress says so and leads back', async () => {
  await render(<MockRunScreen />);
  expect(await screen.findByText('There is no mock exam in progress.')).toBeTruthy();
  await press('Back');
  expect(mockDismissTo).toHaveBeenCalledWith('/mock/setup');
});

test('the exam screen opens the saved exam where it was left', async () => {
  const exam = drawExam(starterQuestions, 'exam', 'half', Date.now())!;
  await seed({ exam: { ...exam, index: 4 } });
  await render(<MockRunScreen />);
  expect(await screen.findByRole('progressbar', { name: 'Question 5 of 45' })).toBeTruthy();
});

test('an exam whose questions have changed can only be discarded', async () => {
  const exam = drawExam(starterQuestions, 'exam', 'half', Date.now())!;
  await seed({ exam: { ...exam, ids: ['gone', ...exam.ids.slice(1)] } });
  await render(<MockRunScreen />);
  expect(await screen.findByText(/its questions have changed/)).toBeTruthy();
  await press('Discard this exam');
  await waitFor(() => expect(mockDismissTo).toHaveBeenCalledWith('/mock/setup'));
  expect((await stored()).exam).toBeUndefined();
});
