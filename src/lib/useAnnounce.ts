import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Says a status line when it appears or changes; iOS ignores live regions. */
export function useAnnounce(text: string | null) {
  useEffect(() => {
    if (text !== null) AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
}
