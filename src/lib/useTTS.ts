import { useCallback, useEffect, useState, useRef } from 'react';

export interface TTSVoice {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
  isPremium?: boolean;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  voices: TTSVoice[];
  selectedVoice: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    voices: [],
    selectedVoice: null,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });

  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);

      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Identify premium/natural voices (Microsoft Edge, Google, Apple)
        const premiumKeywords = [
          'microsoft',
          'google',
          'samantha',
          'daniel',
          'tessa',
          'mark',
          'zira',
          'david',
          'edge',
          'aria',
          'guy',
          'jenny',
          'michelle',
          'brandon',
          'christopher',
          'eric',
          'emma',
          'brian',
          'amy',
          'ava',
          'andrew',
        ];
        const allVoices = voices
          .map((v) => ({
            name: v.name,
            lang: v.lang,
            voice: v,
            isPremium: premiumKeywords.some((kw) =>
              v.name.toLowerCase().includes(kw)
            ),
          }))
          .sort((a, b) => {
            // Premium voices first, then alphabetically
            if (a.isPremium && !b.isPremium) return -1;
            if (!a.isPremium && b.isPremium) return 1;
            return a.name.localeCompare(b.name);
          });
        setState((prev) => ({
          ...prev,
          voices: allVoices,
          selectedVoice:
            prev.selectedVoice ||
            allVoices.find((v) => v.isPremium)?.name ||
            voices[0]?.name ||
            null,
        }));
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voice = state.voices.find((v) => v.name === state.selectedVoice);
      if (voice) {
        utterance.voice = voice.voice;
      }

      utterance.rate = state.rate;
      utterance.pitch = state.pitch;
      utterance.volume = state.volume;

      utterance.onstart = () => {
        setState((prev) => ({ ...prev, isSpeaking: true, isPaused: false }));
      };

      utterance.onend = () => {
        setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
        onEnd?.();
      };

      utterance.onerror = () => {
        setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported, state.selectedVoice, state.rate, state.pitch, state.volume, state.voices]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported || !state.isSpeaking) return;
    window.speechSynthesis.pause();
    setState((prev) => ({ ...prev, isPaused: true }));
  }, [supported, state.isSpeaking]);

  const resume = useCallback(() => {
    if (!supported || !state.isPaused) return;
    window.speechSynthesis.resume();
    setState((prev) => ({ ...prev, isPaused: false }));
  }, [supported, state.isPaused]);

  const setVoice = useCallback((voiceName: string) => {
    setState((prev) => ({ ...prev, selectedVoice: voiceName }));
  }, []);

  const setRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, rate: Math.max(0.5, Math.min(2, rate)) }));
  }, []);

  const setPitch = useCallback((pitch: number) => {
    setState((prev) => ({ ...prev, pitch: Math.max(0, Math.min(2, pitch)) }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  return {
    supported,
    ...state,
    speak,
    stop,
    pause,
    resume,
    setVoice,
    setRate,
    setPitch,
    setVolume,
  };
}
