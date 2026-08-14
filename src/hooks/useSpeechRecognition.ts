import { useCallback, useRef, useState } from 'react';

export const useSpeechRecognition = (onResult: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(true); // false if API not supported or permission denied
  const recognitionRef = useRef<any>(null);

  const init = useCallback(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setAvailable(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    rec.onerror = (e: any) => {
      console.error('Speech recognition error:', e);
      // If permission denied, mark unavailable
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setAvailable(false);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, [onResult]);

  const start = useCallback(() => {
    if (!available) return;
    if (!recognitionRef.current) {
      init();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setAvailable(false);
        setListening(false);
      }
    }
  }, [available, init]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { listening, setListening, available, start, stop };
};