import { AccessibilityInfo, Platform, type HostInstance } from 'react-native';

type WebElement = { setAttribute: (name: string, value: string) => void; focus: () => void };

/** Moves screen reader focus to `target`; on web, keyboard focus. */
export function focusOn(target: HostInstance | null) {
  if (target === null) return;
  if (Platform.OS !== 'web') {
    AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
    return;
  }
  // Text is not focusable on web until it has a tabindex; -1 keeps it out of the tab order.
  const element = target as unknown as WebElement;
  element.setAttribute('tabindex', '-1');
  element.focus();
}
