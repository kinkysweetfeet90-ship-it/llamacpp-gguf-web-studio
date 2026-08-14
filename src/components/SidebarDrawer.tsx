import { useRef, useState } from 'react';
import QuickDownloadSection from './QuickDownloadSection';
import type {
  EngineMode,
  EngineStatus,
  GenSettings,
  LoadSettings,
  ModelInfo,
} from '../lib/types';
import { fmtBytes } from '../lib/types';
import { cn } from '../utils/cn';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: EngineMode;
  setMode: (m: EngineMode) => void;
  // wasm engine
  status: EngineStatus;
  error: string | null;
  loadingPhase: string;
  modelInfo: ModelInfo | null;
  pickedFiles: File[];
  setPickedFiles: (f: File[]) => void;
  loadSettings: LoadSettings;
  setLoadSettings: (s: LoadSettings) => void;
  onStartModel: () => void;
  onEject: () => void;
  onFileDownload: (file: File) => void;
  // server
  serverUrl: string;
  setServerUrl: (s: string) => void;
  apiKey: string;
  setApiKey: (s: string) => void;
  serverStatus: EngineStatus;
  serverModels: string[];
  serverError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  // sampling
  gen: GenSettings;
  setGen: (g: GenSettings) => void;
  busy: boolean;
}

export default function SidebarDrawer(p: SidebarDrawerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showSampling, setShowSampling] = useState(true);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const ggufs = Array.from(list).filter((f) =>
      f.name.toLowerCase().endsWith('.gguf'),
    );
    if (ggufs.length > 0) {
      ggufs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      p.setPickedFiles(ggufs);
    }
  };

  const wasmLoading = p.status === 'loading';
  const wasmReady = p.status === 'ready';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          p.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={p.onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-[85vw] max-w-sm overflow-y-auto bg-zinc-950 transition-transform lg:hidden',
          p.isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
          <h2 className="text-sm font-bold">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              LASTIC
            </span>
            <span className="text-zinc-500"> Studio</span>
          </h2>
          <button
            onClick={p.onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-3">
          {/* Mode switch */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-1">
            {(
              [
                ['wasm', '🦙 In-Browser', 'WASM backend'],
                ['server', '🖥️ llama-server', 'native backend'],
              ] as const
            ).map(([m, label, sub]) => (
              <button
                key={m}
                onClick={() => {
                  p.setMode(m);
                  p.onClose();
                }}
                className={cn(
                  'rounded-md px-2 py-2 text-left transition-colors',
                  p.mode === m
                    ? 'bg-zinc-800 ring-1 ring-emerald-500/40'
                    : 'hover:bg-zinc-800/50',
                )}
              >
                <div className="text-xs font-semibold text-zinc-100">{label}</div>
                <div className="text-[10px] text-zinc-500">{sub}</div>
              </button>
            ))}
          </div>

          {p.mode === 'wasm' ? (
            <>
              {/* File picker */}
              <section>
                <SectionTitle>1 · Model file</SectionTitle>
                {!wasmReady && (
                  <div
                    onClick={() => !wasmLoading && fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (!wasmLoading) handleFiles(e.dataTransfer.files);
                    }}
                    className={cn(
                      'cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-colors',
                      dragOver
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-500',
                      wasmLoading && 'pointer-events-none opacity-50',
                    )}
                  >
                    <div className="text-2xl">📦</div>
                    <div className="mt-1 text-sm font-medium text-zinc-200">
                      Pick <span className="text-emerald-400">.gguf</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      click or drag
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".gguf"
                      multiple
                      hidden
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </div>
                )}

                {p.pickedFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {p.pickedFiles.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center justify-between rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs"
                      >
                        <span className="mr-2 truncate font-mono text-zinc-300">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-zinc-500">{fmtBytes(f.size)}</span>
                      </li>
                    ))}
                    {!wasmReady && !wasmLoading && (
                      <li className="text-right">
                        <button
                          onClick={() => p.setPickedFiles([])}
                          className="text-[10px] text-zinc-500 hover:text-red-400"
                        >
                          clear
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </section>

              {/* Quick download section */}
              {!wasmReady && !wasmLoading && (
                <QuickDownloadSection
                  onFileDownload={p.onFileDownload}
                  disabled={wasmLoading}
                />
              )}

              {/* Load settings */}
              <section>
                <SectionTitle>2 · Load parameters</SectionTitle>
                <div className="space-y-2.5 rounded-xl bg-zinc-900/60 p-2.5">
                  <Slider
                    label="Context size"
                    value={p.loadSettings.nCtx}
                    min={512}
                    max={32768}
                    step={512}
                    disabled={wasmReady || wasmLoading}
                    onChange={(v) => p.setLoadSettings({ ...p.loadSettings, nCtx: v })}
                  />
                  <Slider
                    label="GPU layers"
                    value={p.loadSettings.nGpuLayers}
                    min={0}
                    max={99}
                    step={1}
                    disabled={wasmReady || wasmLoading}
                    onChange={(v) =>
                      p.setLoadSettings({ ...p.loadSettings, nGpuLayers: v })
                    }
                  />
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-400">
                      Threads{' '}
                      <span className="text-zinc-600">(-1 = auto)</span>
                    </label>
                    <input
                      type="number"
                      min={-1}
                      max={32}
                      disabled={wasmReady || wasmLoading}
                      value={p.loadSettings.nThreads}
                      onChange={(e) =>
                        p.setLoadSettings({
                          ...p.loadSettings,
                          nThreads: Number(e.target.value),
                        })
                      }
                      className="w-14 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-200 outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>
                  <label className="flex cursor-pointer items-center justify-between text-[10px] text-zinc-400">
                    Flash attention
                    <input
                      type="checkbox"
                      disabled={wasmReady || wasmLoading}
                      checked={p.loadSettings.flashAttn}
                      onChange={(e) =>
                        p.setLoadSettings({
                          ...p.loadSettings,
                          flashAttn: e.target.checked,
                        })
                      }
                      className="h-3.5 w-3.5 accent-emerald-500"
                    />
                  </label>
                </div>
              </section>

              {/* Start / eject */}
              <section>
                <SectionTitle>3 · Run</SectionTitle>
                {!wasmReady ? (
                  <button
                    onClick={() => {
                      p.onStartModel();
                      p.onClose();
                    }}
                    disabled={p.pickedFiles.length === 0 || wasmLoading}
                    className={cn(
                      'w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                      p.pickedFiles.length === 0 || wasmLoading
                        ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                        : 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400',
                    )}
                  >
                    {wasmLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner /> Loading…
                      </span>
                    ) : (
                      '▶ Start model'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={p.onEject}
                    className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    ⏏ Eject model
                  </button>
                )}
                {wasmLoading && p.loadingPhase && (
                  <p className="mt-2 animate-pulse text-center text-[10px] text-emerald-300/80">
                    {p.loadingPhase}
                  </p>
                )}
                {p.error && (
                  <p className="mt-2 rounded-md bg-red-500/10 p-2 text-[10px] text-red-300">
                    {p.error}
                  </p>
                )}
              </section>

              {/* Model card */}
              {wasmReady && p.modelInfo && (
                <section>
                  <SectionTitle>Loaded model</SectionTitle>
                  <div className="space-y-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs">
                    <div className="truncate font-semibold text-emerald-300">
                      {p.modelInfo.name}
                    </div>
                    <InfoRow k="Size" v={fmtBytes(p.modelInfo.totalBytes)} />
                    {p.modelInfo.arch && <InfoRow k="Arch" v={p.modelInfo.arch} />}
                    {p.modelInfo.quant && <InfoRow k="Quant" v={p.modelInfo.quant} />}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <section>
                <SectionTitle>Connect to llama-server</SectionTitle>
                <div className="space-y-2 rounded-xl bg-zinc-900/60 p-2.5">
                  <label className="block text-[10px] text-zinc-400">
                    Base URL
                    <input
                      value={p.serverUrl}
                      onChange={(e) => p.setServerUrl(e.target.value)}
                      placeholder="http://localhost:8080"
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </label>
                  <label className="block text-[10px] text-zinc-400">
                    API key (optional)
                    <input
                      value={p.apiKey}
                      onChange={(e) => p.setApiKey(e.target.value)}
                      type="password"
                      placeholder="sk-…"
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                    />
                  </label>
                  {p.serverStatus !== 'ready' ? (
                    <button
                      onClick={p.onConnect}
                      disabled={p.serverStatus === 'loading'}
                      className="w-full rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {p.serverStatus === 'loading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <Spinner /> Connecting…
                        </span>
                      ) : (
                        '🔌 Connect'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={p.onDisconnect}
                      className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20"
                    >
                      Disconnect
                    </button>
                  )}
                  {p.serverError && (
                    <p className="rounded-md bg-red-500/10 p-2 text-[10px] text-red-300">
                      {p.serverError}
                    </p>
                  )}
                </div>
              </section>

              {p.serverStatus === 'ready' && (
                <section>
                  <SectionTitle>Served models</SectionTitle>
                  <ul className="space-y-1">
                    {p.serverModels.map((m) => (
                      <li
                        key={m}
                        className="truncate rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 font-mono text-[10px] text-emerald-300"
                      >
                        {m}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {/* Sampling settings */}
          <div className="pt-1">
            <button
              onClick={() => setShowSampling((s) => !s)}
              className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              Sampling
              <span>{showSampling ? '▾' : '▸'}</span>
            </button>
            {showSampling && (
              <div className="mt-2 space-y-2.5 rounded-xl bg-zinc-900/60 p-2.5">
                <Slider
                  label="Temperature"
                  value={p.gen.temperature}
                  min={0}
                  max={2}
                  step={0.05}
                  disabled={p.busy}
                  onChange={(v) => p.setGen({ ...p.gen, temperature: v })}
                  fmt={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Top-P"
                  value={p.gen.topP}
                  min={0.05}
                  max={1}
                  step={0.05}
                  disabled={p.busy}
                  onChange={(v) => p.setGen({ ...p.gen, topP: v })}
                  fmt={(v) => v.toFixed(2)}
                />
                <Slider
                  label="Top-K"
                  value={p.gen.topK}
                  min={1}
                  max={100}
                  step={1}
                  disabled={p.busy}
                  onChange={(v) => p.setGen({ ...p.gen, topK: v })}
                />
                <Slider
                  label="Max tokens"
                  value={p.gen.maxTokens}
                  min={64}
                  max={4096}
                  step={64}
                  disabled={p.busy}
                  onChange={(v) => p.setGen({ ...p.gen, maxTokens: v })}
                />
                <label className="block text-[10px] text-zinc-400">
                  System prompt
                  <textarea
                    value={p.gen.systemPrompt}
                    disabled={p.busy}
                    onChange={(e) => p.setGen({ ...p.gen, systemPrompt: e.target.value })}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </h3>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-zinc-500">{k}</span>
      <span className="truncate font-mono text-zinc-300">{v}</span>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  fmt?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px]">
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
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-emerald-500 disabled:opacity-50"
      />
    </div>
  );
}
