import { cn } from '../utils/cn';

interface VoiceInputButtonProps {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onSelect: (text: string) => void;
}

export default function VoiceInputButton(p: VoiceInputButtonProps) {
  const hasTranscript = p.transcript.trim().length > 0;

  return (
    <div className="relative">
      {/* Main button */}
      <button
        onClick={p.isListening ? p.onStop : p.onStart}
        disabled={!p.isSupported}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
          p.isListening
            ? 'bg-red-500 text-white animate-pulse'
            : p.isSupported
              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              : 'bg-zinc-900 text-zinc-700 cursor-not-allowed',
        )}
        aria-label={p.isListening ? 'Stop listening' : 'Start voice input'}
        title={p.isSupported ? 'Click to speak' : 'Voice input not supported'}
      >
        {p.isListening ? (
          <span className="text-lg">■</span>
        ) : (
          <span className="text-lg">🎤</span>
        )}
      </button>

      {/* Transcript popup */}
      {hasTranscript && !p.isListening && (
        <div className="absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-xl">
          <div className="mb-2 text-xs text-zinc-400">
            {p.interimTranscript ? (
              <span className="text-zinc-500">
                {p.transcript}
                <span className="animate-pulse">{p.interimTranscript}</span>
              </span>
            ) : (
              p.transcript
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => p.onSelect(p.transcript.trim())}
              className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
            >
              Use text
            </button>
            <button
              onClick={p.onClear}
              className="rounded-lg bg-zinc-800 px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Listening indicator */}
      {p.isListening && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
          <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
          Listening...
        </div>
      )}
    </div>
  );
}
