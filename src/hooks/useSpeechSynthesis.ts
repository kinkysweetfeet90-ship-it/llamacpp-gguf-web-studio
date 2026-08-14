import { useCallback, useRef } from 'react';

export const useSpeechSynthesis = () => {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1;
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
};