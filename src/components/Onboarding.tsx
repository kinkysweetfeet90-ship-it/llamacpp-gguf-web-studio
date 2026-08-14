import { useState } from 'react';
import { cn } from '../utils/cn';

interface OnboardingProps {
  onComplete: () => void;
  onOpenAccessibility: () => void;
}

const steps = [
  {
    title: 'Welcome to LASTIC Web Studio',
    icon: '🦙',
    content: (
      <>
        <p className="text-sm text-zinc-400">
          Run{' '}
          <span className="font-mono text-emerald-400">.gguf</span> AI models
          directly in your browser using llama.cpp WebAssembly technology.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-emerald-400">✓</span> 100% local - no uploads
          </li>
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-emerald-400">✓</span> Works offline after load
          </li>
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-emerald-400">✓</span> Full privacy
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Load a Model',
    icon: '📦',
    content: (
      <>
        <p className="text-sm text-zinc-400">
          Open the sidebar and pick a local{' '}
          <span className="font-mono text-emerald-400">.gguf</span> file.
          Multi-shard models are supported!
        </p>
        <div className="mt-4 rounded-lg bg-zinc-950 p-3 text-xs text-zinc-500">
          <p>Recommended for beginners:</p>
          <ul className="mt-2 space-y-1 font-mono text-emerald-400">
            <li>• TinyLlama-1.1B (Q4_K_M)</li>
            <li>• Qwen2.5-0.5B (Q4_K_M)</li>
            <li>• Phi-2 (Q4_K_M)</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    title: 'Start Chatting',
    icon: '💬',
    content: (
      <>
        <p className="text-sm text-zinc-400">
          Once the model loads, type your message and press{' '}
          <kbd className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-zinc-300">
            Enter
          </kbd>{' '}
          to send. Responses stream token-by-token.
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Adjust temperature, top-p, and other settings in the sidebar to
          control creativity.
        </p>
      </>
    ),
  },
  {
    title: 'Voice & Accessibility',
    icon: '♿',
    content: (
      <>
        <p className="text-sm text-zinc-400">
          We support full accessibility features:
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-cyan-400">🎤</span> Voice input (speech-to-text)
          </li>
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-cyan-400">🔊</span> Text-to-speech output
          </li>
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-cyan-400">👁️</span> High contrast, large text
          </li>
          <li className="flex items-center gap-2 text-zinc-300">
            <span className="text-cyan-400">⌨️</span> Keyboard navigation
          </li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Click the accessibility button (♿) in the header to configure.
        </p>
      </>
    ),
  },
  {
    title: 'Ready to Go!',
    icon: '🚀',
    content: (
      <>
        <p className="text-sm text-zinc-400">
          You're all set! Start by loading a model from the sidebar.
        </p>
        <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400">
          <p className="font-semibold">Pro tip:</p>
          <p className="mt-1">
            Smaller models (0.5B-3B) run faster in-browser. Larger models work
            best with llama-server backend.
          </p>
        </div>
      </>
    ),
  },
];

export default function Onboarding(p: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      p.onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-800">
        {/* Progress */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-8 rounded-full transition-colors',
                  i <= currentStep ? 'bg-emerald-500' : 'bg-zinc-700'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-zinc-500">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        {/* Icon */}
        <div className="mb-4 text-center text-5xl">{step.icon}</div>

        {/* Title */}
        <h2
          id="onboarding-title"
          className="mb-3 text-center text-xl font-bold text-zinc-100"
        >
          {step.title}
        </h2>

        {/* Content */}
        <div className="mb-6">{step.content}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={prev}
            disabled={currentStep === 0}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
          >
            ← Back
          </button>

          {currentStep === 2 && (
            <button
              onClick={p.onOpenAccessibility}
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-400 hover:bg-cyan-500/20"
            >
              ♿ Configure Accessibility
            </button>
          )}

          <button
            onClick={next}
            className={cn(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition-colors',
              currentStep === steps.length - 1
                ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            )}
          >
            {currentStep === steps.length - 1 ? "Let's Go! 🚀" : 'Next →'}
          </button>
        </div>

        {/* Skip */}
        {currentStep < steps.length - 1 && (
          <button
            onClick={p.onComplete}
            className="mt-4 w-full text-xs text-zinc-600 hover:text-zinc-400"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
