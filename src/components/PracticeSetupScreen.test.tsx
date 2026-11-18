import { fireEvent, render, screen } from '@testing-library/react-native';

import PracticeSetupScreen from '@/app/practice/setup';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));

// Jest finds no tests under src/app, so the route's test lives here.
test('the setup screen states the points rule before a test starts', async () => {
  await render(<PracticeSetupScreen />);
  expect(screen.getByText('Correct adds 10 points. Wrong takes 5.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Start test' }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/practice/run' }));
});
