import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import QuickDownloadSection from './components/QuickDownloadSection';
import ChatPanel from './components/ChatPanel';
import LogConsole from './components/LogConsole';
import SplashScreen from './components/SplashScreen';
import MobileNav from './components/MobileNav';
import SidebarDrawer from './components/SidebarDrawer';
import AccessibilityPanel from './components/AccessibilityPanel';
import Onboarding from './components/Onboarding';
import VoiceInputButton from './components/VoiceInputButton';
import { useWllama } from './lib/useWllama';
import { useTTS } from './lib/useTTS';
import { useVoiceInput } from './lib/useVoiceInput';
import { probeServer, streamServerChat } from './lib/serverClient';
import type { ChatMsg, EngineMode, EngineStatus, GenSettings } from './lib/types';
import { DEFAULT_GEN, DEFAULT_LOAD } from './lib/types';
import { cn } from './utils/cn';

let msgId = 0;
const nextId = () => `m${++msgId}`;

export default function App() {
  // Splash & onboarding
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Mobile
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  // Mode
  const [mode, setMode] = useState<EngineMode>('wasm');

  // Accessibility settings
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // TTS
  const tts = useTTS();
  const [autoReadResponses, setAutoReadResponses] = useState(false);

  // Voice input
  const voice = useVoiceInput();

  // Wllama engine
  const engine = useWllama();
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [loadSettings, setLoadSettings] = useState(DEFAULT_LOAD);

  // Server
  const [serverUrl, setServerUrl] = useState('http://localhost:8080');
  const [apiKey, setApiKey] = useState('');
  const [serverStatus, setServerStatus] = useState<EngineStatus>('idle');
  const [serverModels, setServerModels] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // Chat
  const [gen, setGen] = useState<GenSettings>(DEFAULT_GEN);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const serverAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check if user has seen onboarding
  useEffect(() => {
    const seen = localStorage.getItem('lastic_onboarding_seen');
    if (!seen) {
      setHasSeenOnboarding(false);
    } else {
      setHasSeenOnboarding(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to stop generation
      if (e.key === 'Escape' && isGenerating) {
        handleStop();
      }
      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGenerating]);

  // Apply accessibility settings to document
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    document.documentElement.classList.toggle('large-text', largeText);
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [highContrast, largeText, reduceMotion]);

  const engineReady =
    mode === 'wasm' ? engine.status === 'ready' : serverStatus === 'ready';

  const engineLabel =
    mode === 'wasm'
      ? (engine.modelInfo?.name ?? 'model')
      : `llama-server · ${serverModels[0]?.split('/').pop() ?? serverUrl}`;

  // Actions
  const handleStartModel = useCallback(() => {
    if (pickedFiles.length === 0) return;
    void engine.startModel(pickedFiles, loadSettings);
  }, [pickedFiles, loadSettings, engine]);

  const handleFileDownload = useCallback((file: File) => {
    setPickedFiles([file]);
  }, []);

  const handleEject = useCallback(() => {
    void engine.unload();
  }, [engine]);

  const handleConnect = useCallback(async () => {
    setServerStatus('loading');
    setServerError(null);
    const result = await probeServer(serverUrl, apiKey || undefined);
    if (result.ok) {
      setServerModels(result.models);
      setServerStatus('ready');
    } else {
      setServerError(result.error ?? 'Connection failed');
      setServerStatus('error');
    }
  }, [serverUrl, apiKey]);

  const handleDisconnect = useCallback(() => {
    setServerStatus('idle');
    setServerModels([]);
    setServerError(null);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: ChatMsg = { id: nextId(), role: 'user', content: text };
      const history = [...messages, userMsg];
      setMessages(history);
      setStreamingText('');
      setIsGenerating(true);

      const apiMessages = [
        ...(gen.systemPrompt.trim()
          ? [{ role: 'system' as const, content: gen.systemPrompt.trim() }]
          : []),
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      try {
        let result: { text: string; tps?: number; nTokens?: number };
        if (mode === 'wasm') {
          result = await engine.generate(apiMessages, gen, setStreamingText);
        } else {
          const ac = new AbortController();
          serverAbortRef.current = ac;
          try {
            result = await streamServerChat(
              serverUrl,
              apiKey,
              apiMessages,
              gen,
              setStreamingText,
              ac.signal,
            );
          } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
              result = { text: '' };
            } else {
              throw e;
            }
          } finally {
            serverAbortRef.current = null;
          }
        }

        const assistantMsg: ChatMsg = {
          id: nextId(),
          role: 'assistant',
          content: result.text || '(no output)',
          tps: result.tps,
          nTokens: result.nTokens,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-read response if enabled
        if (autoReadResponses && result.text) {
          tts.speak(result.text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: `⚠️ Error: ${msg}` },
        ]);
      } finally {
        setStreamingText(null);
        setIsGenerating(false);
      }
    },
    [messages, gen, mode, engine, serverUrl, apiKey, autoReadResponses, tts],
  );

  const handleStop = useCallback(() => {
    if (mode === 'wasm') engine.stopGeneration();
    else serverAbortRef.current?.abort();
    tts.stop();
  }, [mode, engine, tts]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setStreamingText(null);
    tts.stop();
  }, [tts]);

  const handleVoiceSelect = (text: string) => {
    setInputValue(text);
    voice.clearTranscript();
    inputRef.current?.focus();
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    localStorage.setItem('lastic_onboarding_seen', 'true');
  };

  // Show onboarding after splash if first time
  const handleSplashComplete = () => {
    setShowSplash(false);
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div
      className={cn(
        'flex h-screen flex-col bg-zinc-950 text-zinc-100 antialiased',
        highContrast && 'high-contrast',
        largeText && 'large-text',
        reduceMotion && 'reduce-motion',
      )}
      role="application"
      aria-label="LASTIC Web Studio - AI Chat Interface"
    >
      {/* Mobile navigation */}
      <MobileNav
        mode={mode}
        setMode={setMode}
        engineReady={engineReady}
        engineStatus={engine.status}
        modelInfo={engine.modelInfo}
        serverStatus={serverStatus}
        serverModels={serverModels}
        onOpenSidebar={() => setShowMobileDrawer(true)}
      />

      {/* Mobile drawer */}
      <SidebarDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        mode={mode}
        setMode={setMode}
        status={engine.status}
        error={engine.error}
        loadingPhase={engine.loadingPhase}
        modelInfo={engine.modelInfo}
        pickedFiles={pickedFiles}
        setPickedFiles={setPickedFiles}
        loadSettings={loadSettings}
        setLoadSettings={setLoadSettings}
        onStartModel={handleStartModel}
        onEject={handleEject}
        onFileDownload={handleFileDownload}
        serverUrl={serverUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        serverStatus={serverStatus}
        serverModels={serverModels}
        serverError={serverError}
        onConnect={() => void handleConnect()}
        onDisconnect={handleDisconnect}
        gen={gen}
        setGen={setGen}
        busy={isGenerating}
      />

      {/* Desktop layout */}
      <div className="hidden lg:flex min-h-0 flex-1">
        {/* Desktop header */}
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-xl ring-1 ring-emerald-500/30">
              🦙
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  LASTIC
                </span>
                <span className="text-zinc-500"> · </span>
                <span className="text-zinc-300">Web Studio</span>
              </h1>
              <p className="text-[10px] text-zinc-600">
                Powered by llama.cpp · Local GGUF Inference
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAccessibility(true)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Open accessibility settings"
              title="Accessibility settings (♿)"
            >
              ♿
            </button>
            <StatusPill
              label={mode === 'wasm' ? 'WASM' : 'HTTP'}
              ok={engineReady}
              busy={
                mode === 'wasm'
                  ? engine.status === 'loading'
                  : serverStatus === 'loading'
              }
            />
          </div>
        </header>

        {/* Desktop sidebar */}
        <div className="pt-[73px]">
          <Sidebar
            mode={mode}
            setMode={setMode}
            status={engine.status}
            error={engine.error}
            loadingPhase={engine.loadingPhase}
            modelInfo={engine.modelInfo}
            pickedFiles={pickedFiles}
            setPickedFiles={setPickedFiles}
            loadSettings={loadSettings}
            setLoadSettings={setLoadSettings}
            onStartModel={handleStartModel}
            onEject={handleEject}
            onFileDownload={handleFileDownload}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            serverStatus={serverStatus}
            serverModels={serverModels}
            serverError={serverError}
            onConnect={() => void handleConnect()}
            onDisconnect={handleDisconnect}
            gen={gen}
            setGen={setGen}
            busy={isGenerating}
          />
        </div>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col pt-[73px]">
          <ChatPanel
            messages={messages}
            streamingText={streamingText}
            isGenerating={isGenerating}
            engineReady={engineReady}
            engineLabel={engineLabel}
            onSend={(t) => void handleSend(t)}
            onStop={handleStop}
            onClear={handleClear}
            inputValue={inputValue}
            setInputValue={setInputValue}
            inputRef={inputRef}
            voiceButton={
              <VoiceInputButton
                isSupported={voice.isSupported}
                isListening={voice.isListening}
                transcript={voice.transcript}
                interimTranscript={voice.interimTranscript}
                onStart={voice.startListening}
                onStop={voice.stopListening}
                onClear={voice.clearTranscript}
                onSelect={handleVoiceSelect}
              />
            }
            ttsButton={
              tts.supported && streamingText ? (
                <button
                  onClick={() =>
                    tts.isSpeaking ? tts.stop() : tts.speak(streamingText)
                  }
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                    tts.isSpeaking
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                  )}
                  aria-label={tts.isSpeaking ? 'Stop reading' : 'Read aloud'}
                  title={tts.isSpeaking ? 'Stop reading' : 'Read aloud'}
                >
                  {tts.isSpeaking ? '🔊' : '🔈'}
                </button>
              ) : null
            }
          />
          <LogConsole
            logs={engine.logs}
            open={consoleOpen}
            onToggle={() => setConsoleOpen((o) => !o)}
            onClear={engine.clearLogs}
          />
        </main>
      </div>

      {/* Mobile main content */}
      <main className="flex min-w-0 flex-1 flex-col lg:hidden">
        {/* Mobile header bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2">
          <button
            onClick={() => setShowAccessibility(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Open accessibility settings"
          >
            ♿
          </button>
          <StatusPill
            label=""
            ok={engineReady}
            busy={
              mode === 'wasm'
                ? engine.status === 'loading'
                : serverStatus === 'loading'
            }
          />
        </div>

        <ChatPanel
          messages={messages}
          streamingText={streamingText}
          isGenerating={isGenerating}
          engineReady={engineReady}
          engineLabel={engineLabel}
          onSend={(t) => void handleSend(t)}
          onStop={handleStop}
          onClear={handleClear}
          inputValue={inputValue}
          setInputValue={setInputValue}
          inputRef={inputRef}
          voiceButton={
            <VoiceInputButton
              isSupported={voice.isSupported}
              isListening={voice.isListening}
              transcript={voice.transcript}
              interimTranscript={voice.interimTranscript}
              onStart={voice.startListening}
              onStop={voice.stopListening}
              onClear={voice.clearTranscript}
              onSelect={handleVoiceSelect}
            />
          }
          ttsButton={
            tts.supported && streamingText ? (
              <button
                onClick={() =>
                  tts.isSpeaking ? tts.stop() : tts.speak(streamingText)
                }
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                  tts.isSpeaking
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200',
                )}
                aria-label={tts.isSpeaking ? 'Stop reading' : 'Read aloud'}
              >
                {tts.isSpeaking ? '🔊' : '🔈'}
              </button>
            ) : null
          }
        />
        <LogConsole
          logs={engine.logs}
          open={consoleOpen}
          onToggle={() => setConsoleOpen((o) => !o)}
          onClear={engine.clearLogs}
        />
      </main>

      {/* Accessibility Panel */}
      <AccessibilityPanel
        isOpen={showAccessibility}
        onClose={() => setShowAccessibility(false)}
        ttsSupported={tts.supported}
        ttsVoices={tts.voices}
        ttsSelectedVoice={tts.selectedVoice}
        ttsRate={tts.rate}
        ttsPitch={tts.pitch}
        ttsVolume={tts.volume}
        ttsIsSpeaking={tts.isSpeaking}
        onSetVoice={tts.setVoice}
        onSetRate={tts.setRate}
        onSetPitch={tts.setPitch}
        onSetVolume={tts.setVolume}
        onTestSpeech={() => tts.speak('Hello! This is a test of text-to-speech.')}
        autoReadResponses={autoReadResponses}
        onToggleAutoRead={() => setAutoReadResponses(!autoReadResponses)}
        voiceSupported={voice.isSupported}
        voicePermission={voice.isPermissionGranted}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast(!highContrast)}
        largeText={largeText}
        onToggleLargeText={() => setLargeText(!largeText)}
        reduceMotion={reduceMotion}
        onToggleReduceMotion={() => setReduceMotion(!reduceMotion)}
      />

      {/* Onboarding */}
      {showOnboarding && (
        <Onboarding
          onComplete={handleOnboardingComplete}
          onOpenAccessibility={() => setShowAccessibility(true)}
        />
      )}
    </div>
  );
}

function StatusPill({
  label,
  ok,
  busy,
}: {
  label: string;
  ok: boolean;
  busy: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-2 py-1 sm:px-3 sm:py-1">
      <span
        className={`h-2 w-2 rounded-full ${
          busy ? 'animate-pulse bg-amber-400' : ok ? 'bg-emerald-400' : 'bg-zinc-600'
        }`}
      />
      {label && (
        <span className="hidden text-[10px] text-zinc-500 sm:inline">
          {label} · {busy ? 'loading' : ok ? 'ready' : 'offline'}
        </span>
      )}
    </span>
  );
}
