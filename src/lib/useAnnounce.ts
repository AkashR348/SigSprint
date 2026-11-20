import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Says a status line when it appears or changes, on iOS only: iOS ignores live regions, and Android and web read them already. */
export function useAnnounce(text: string | null) {
  useEffect(() => {
    if (text !== null && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, [text]);
}
