import { useCallback, useEffect, useState, useRef } from 'react';

export interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  isPermissionGranted: boolean | null;
  transcript: string;
  error: string | null;
  interimTranscript: string;
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: false,
    isPermissionGranted: null,
    transcript: '',
    error: null,
    interimTranscript: '',
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setState((prev) => ({ ...prev, isSupported: true }));

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
        }));
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setState((prev) => ({
          ...prev,
          transcript: final || prev.transcript,
          interimTranscript: interim,
        }));
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: error === 'not-allowed' ? 'Microphone access denied' : `Error: ${error}`,
          isPermissionGranted: error === 'not-allowed' ? false : prev.isPermissionGranted,
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({
          ...prev,
          isListening: false,
        }));
      };

      recognitionRef.current = recognition;

      // Check permission status
      if (navigator.permissions) {
        navigator.permissions
          .query({ name: 'microphone' as PermissionName })
          .then((result) => {
            setState((prev) => ({
              ...prev,
              isPermissionGranted: result.state === 'granted',
            }));
          })
          .catch(() => {
            // Permission API not supported
          });
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!state.isSupported || !recognitionRef.current) return;

    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
    }));

    recognitionRef.current.start();
  }, [state.isSupported]);

  const stopListening = useCallback(() => {
    if (!state.isSupported || !recognitionRef.current) return;
    recognitionRef.current.stop();
  }, [state.isSupported]);

  const clearTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    fullTranscript: state.transcript + (state.interimTranscript ? ' ' + state.interimTranscript : ''),
  };
}
