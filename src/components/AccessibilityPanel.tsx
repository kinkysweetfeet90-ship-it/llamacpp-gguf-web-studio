import type { TTSVoice } from '../lib/useTTS';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // TTS
  ttsSupported: boolean;
  ttsVoices: TTSVoice[];
  ttsSelectedVoice: string | null;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  ttsIsSpeaking: boolean;
  onSetVoice: (v: string) => void;
  onSetRate: (v: number) => void;
  onSetPitch: (v: number) => void;
  onSetVolume: (v: number) => void;
  onTestSpeech: () => void;
  autoReadResponses: boolean;
  onToggleAutoRead: () => void;
  // Voice Input
  voiceSupported: boolean;
  voicePermission: boolean | null;
  // Visual
  highContrast: boolean;
  onToggleHighContrast: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
}

export default function AccessibilityPanel(p: AccessibilityPanelProps) {
  if (!p.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
      onClick={p.onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-zinc-900 p-5 shadow-2xl ring-1 ring-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="accessibility-title"
            className="text-lg font-bold text-zinc-100"
          >
            ♿ Accessibility Settings
          </h2>
          <button
            onClick={p.onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close accessibility settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Text-to-Speech */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-emerald-400">
              🔊 Text-to-Speech
            </h3>
            <div className="space-y-3 rounded-xl bg-zinc-950 p-3">
              {p.ttsSupported ? (
                <>
                  <label className="block text-xs text-zinc-400">
                    Voice
                    <select
                      value={p.ttsSelectedVoice || ''}
                      onChange={(e) => p.onSetVoice(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-500"
                      aria-label="Select TTS voice"
                    >
                      {p.ttsVoices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.isPremium ? '⭐ ' : ''}
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    ⭐ Premium voices (Microsoft Edge, Google, Apple) offer more natural AI quality
                  </p>

                  <Slider
                    label="Speed"
                    value={p.ttsRate}
                    min={0.5}
                    max={2}
                    step={0.1}
                    onChange={p.onSetRate}
                    fmt={(v) => v.toFixed(1) + 'x'}
                  />

                  <Slider
                    label="Pitch"
                    value={p.ttsPitch}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={p.onSetPitch}
                    fmt={(v) => v.toFixed(1)}
                  />

                  <Slider
                    label="Volume"
                    value={p.ttsVolume}
                    min={0}
                    max={1}
                    step={0.1}
                    onChange={p.onSetVolume}
                    fmt={(v) => Math.round(v * 100) + '%'}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={p.onTestSpeech}
                      disabled={p.ttsIsSpeaking}
                      className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {p.ttsIsSpeaking ? '🔊 Speaking...' : '🔊 Test Voice'}
                    </button>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                      <input
                        type="checkbox"
                        checked={p.autoReadResponses}
                        onChange={p.onToggleAutoRead}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      Auto-read responses
                    </label>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">
                  Text-to-Speech is not supported in this browser.
                </p>
              )}
            </div>
          </section>

          {/* Voice Input */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-cyan-400">
              🎤 Voice Input
            </h3>
            <div className="space-y-2 rounded-xl bg-zinc-950 p-3">
              {p.voiceSupported ? (
                <>
                  <p className="text-xs text-zinc-400">
                    Click the microphone button in the chat input to speak your
                    message.
                  </p>
                  {p.voicePermission === false && (
                    <p className="text-xs text-amber-400">
                      ⚠️ Microphone access was denied. Please enable it in your
                      browser settings.
                    </p>
                  )}
                  {p.voicePermission === null && (
                    <p className="text-xs text-zinc-500">
                      Permission status unknown. Try using voice input.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500">
                  Voice input is not supported in this browser. Try Chrome or
                  Edge.
                </p>
              )}
            </div>
          </section>

          {/* Visual Settings */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-purple-400">
              👁️ Visual
            </h3>
            <div className="space-y-2 rounded-xl bg-zinc-950 p-3">
              <Toggle
                label="High Contrast"
                checked={p.highContrast}
                onChange={p.onToggleHighContrast}
                description="Increases color contrast for better visibility"
              />
              <Toggle
                label="Large Text"
                checked={p.largeText}
                onChange={p.onToggleLargeText}
                description="Increases font sizes throughout the app"
              />
              <Toggle
                label="Reduce Motion"
                checked={p.reduceMotion}
                onChange={p.onToggleReduceMotion}
                description="Minimizes animations and transitions"
              />
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              ⌨️ Keyboard Shortcuts
            </h3>
            <div className="space-y-1.5 rounded-xl bg-zinc-950 p-3 text-xs">
              <ShortcutRow k="Enter" v="Send message" />
              <ShortcutRow k="Shift + Enter" v="New line" />
              <ShortcutRow k="Escape" v="Stop generation" />
              <ShortcutRow k="Ctrl/Cmd + K" v="Focus input" />
            </div>
          </section>

          {/* Free TTS Resources */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-emerald-400">
              🌐 Free TTS Resources
            </h3>
            <div className="space-y-2 rounded-xl bg-zinc-950 p-3 text-xs">
              <p className="text-zinc-400">
                For even better AI voices, try these free browser-based options:
              </p>
              <ul className="space-y-2">
                <li className="rounded-lg bg-zinc-900 p-2">
                  <div className="font-semibold text-emerald-400">
                    Microsoft Edge TTS
                  </div>
                  <div className="mt-1 text-zinc-500">
                    400+ ultra-realistic voices. Free via Edge browser or
                    Python library.
                  </div>
                </li>
                <li className="rounded-lg bg-zinc-900 p-2">
                  <div className="font-semibold text-cyan-400">
                    Kokoro TTS (82M)
                  </div>
                  <div className="mt-1 text-zinc-500">
                    Runs 100% in-browser. 54 voices, 9 languages. No API key
                    needed.
                  </div>
                </li>
                <li className="rounded-lg bg-zinc-900 p-2">
                  <div className="font-semibold text-purple-400">
                    Piper TTS
                  </div>
                  <div className="mt-1 text-zinc-500">
                    900+ voices. Fast, local inference. Open-source (MIT).
                  </div>
                </li>
              </ul>
              <p className="mt-2 text-[10px] text-zinc-600">
                💡 Tip: Premium browser voices (marked ⭐) use your OS's built-in
                neural TTS engines for best quality.
              </p>
            </div>
          </section>
        </div>

        {/* Close button */}
        <button
          onClick={p.onClose}
          className="mt-5 w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-emerald-400">
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-emerald-500"
        aria-label={label}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <div className="flex-1">
        <div className="text-xs font-medium text-zinc-300">{label}</div>
        {description && (
          <div className="mt-0.5 text-[10px] text-zinc-500">{description}</div>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
        aria-label={label}
      />
    </label>
  );
}

function ShortcutRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{v}</span>
      <kbd className="rounded-md bg-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-400">
        {k}
      </kbd>
    </div>
  );
}
