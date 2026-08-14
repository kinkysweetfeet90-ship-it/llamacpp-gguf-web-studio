import { useRef, useState } from 'react';
import type {
  EngineMode,
  EngineStatus,
  GenSettings,
  LoadSettings,
  ModelInfo,
} from '../lib/types';
import { fmtBytes } from '../lib/types';
import { cn } from '../utils/cn';

interface SidebarProps {
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

export default function Sidebar(p: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showSampling, setShowSampling] = useState(true);

  // This component is now desktop-only (hidden on mobile)
  // Mobile uses SidebarDrawer instead

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const ggufs = Array.from(list).filter((f) =>
      f.name.toLowerCase().endsWith('.gguf'),
    );
    if (ggufs.length > 0) {
      // sort shards in order (model-00001-of-00003.gguf …)
      ggufs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      p.setPickedFiles(ggufs);
    }
  };

  const wasmLoading = p.status === 'loading';
  const wasmReady = p.status === 'ready';

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950/70">
      {/* Mode switch */}
      <div className="p-4 pb-2">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-900 p-1">
          {(
            [
              ['wasm', '🦙 In-Browser', 'WASM backend'],
              ['server', '🖥️ llama-server', 'native backend'],
            ] as const
          ).map(([m, label, sub]) => (
            <button
              key={m}
              onClick={() => p.setMode(m)}
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
      </div>

      {p.mode === 'wasm' ? (
        <div className="flex flex-col gap-4 px-4 py-2">
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
                  'cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-colors',
                  dragOver
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-500',
                  wasmLoading && 'pointer-events-none opacity-50',
                )}
              >
                <div className="text-2xl">📦</div>
                <div className="mt-1 text-sm font-medium text-zinc-200">
                  Pick local <span className="text-emerald-400">.gguf</span> file(s)
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  click to browse or drag &amp; drop · multi-shard supported
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
                      className="text-[11px] text-zinc-500 hover:text-red-400"
                    >
                      clear selection
                    </button>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* Load settings */}
          <section>
            <SectionTitle>2 · Load parameters</SectionTitle>
            <div className="space-y-3 rounded-xl bg-zinc-900/60 p-3">
              <Slider
                label="Context size (n_ctx)"
                value={p.loadSettings.nCtx}
                min={512}
                max={32768}
                step={512}
                disabled={wasmReady || wasmLoading}
                onChange={(v) => p.setLoadSettings({ ...p.loadSettings, nCtx: v })}
              />
              <Slider
                label="GPU layers (WebGPU)"
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
                <label className="text-[11px] text-zinc-400">
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
                  className="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-200 outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between text-[11px] text-zinc-400">
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
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>
            </div>
          </section>

          {/* Start / eject */}
          <section>
            <SectionTitle>3 · Run</SectionTitle>
            {!wasmReady ? (
              <button
                onClick={p.onStartModel}
                disabled={p.pickedFiles.length === 0 || wasmLoading}
                className={cn(
                  'w-full rounded-xl px-4 py-3 text-sm font-bold transition-all',
                  p.pickedFiles.length === 0 || wasmLoading
                    ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                    : 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400',
                )}
              >
                {wasmLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Loading model…
                  </span>
                ) : (
                  '▶ Start model'
                )}
              </button>
            ) : (
              <button
                onClick={p.onEject}
                className="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20"
              >
                ⏏ Eject model
              </button>
            )}
            {wasmLoading && p.loadingPhase && (
              <p className="mt-2 animate-pulse text-center text-[11px] text-emerald-300/80">
                {p.loadingPhase}
              </p>
            )}
            {p.error && (
              <p className="mt-2 rounded-md bg-red-500/10 p-2 text-[11px] text-red-300">
                {p.error}
              </p>
            )}
          </section>

          {/* Model card */}
          {wasmReady && p.modelInfo && (
            <section>
              <SectionTitle>Loaded model</SectionTitle>
              <div className="space-y-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                <div className="truncate font-semibold text-emerald-300">
                  {p.modelInfo.name}
                </div>
                <InfoRow k="Size" v={fmtBytes(p.modelInfo.totalBytes)} />
                {p.modelInfo.arch && <InfoRow k="Arch" v={p.modelInfo.arch} />}
                {p.modelInfo.quant && <InfoRow k="Quant" v={p.modelInfo.quant} />}
                {p.modelInfo.sizeLabel && (
                  <InfoRow k="Params" v={p.modelInfo.sizeLabel} />
                )}
                {p.modelInfo.nCtxTrain != null && (
                  <InfoRow k="Train ctx" v={String(p.modelInfo.nCtxTrain)} />
                )}
                {p.modelInfo.nLayer != null && (
                  <InfoRow k="Layers" v={String(p.modelInfo.nLayer)} />
                )}
                <InfoRow
                  k="Threads"
                  v={`${p.modelInfo.nThreadsUsed ?? '?'} (${p.modelInfo.multiThread ? 'multi' : 'single'})`}
                />
                <InfoRow
                  k="Chat template"
                  v={p.modelInfo.chatTemplate ? 'embedded ✓' : 'fallback'}
                />
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 py-2">
          <section>
            <SectionTitle>Connect to llama-server</SectionTitle>
            <div className="space-y-2 rounded-xl bg-zinc-900/60 p-3">
              <label className="block text-[11px] text-zinc-400">
                Base URL
                <input
                  value={p.serverUrl}
                  onChange={(e) => p.setServerUrl(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-[11px] text-zinc-400">
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
                <p className="rounded-md bg-red-500/10 p-2 text-[11px] text-red-300">
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
                    className="truncate rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle>How to start llama-server</SectionTitle>
            <div className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-3 ring-1 ring-zinc-800">
              <p className="mb-2 text-[11px] leading-relaxed text-zinc-400">
                Run the native llama.cpp HTTP server with your GGUF file:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-2.5 font-mono text-[10.5px] leading-relaxed text-emerald-300">
{`llama-server \\
  -m ./model.Q4_K_M.gguf \\
  -c 4096 -ngl 99 \\
  --host 0.0.0.0 --port 8080`}
              </pre>
              <p className="mt-2 text-[10px] text-zinc-600">
                Built with ❤️ by LASTIC PRODUCTIONS
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Sampling settings */}
      <div className="mt-auto px-4 pb-4 pt-2">
        <button
          onClick={() => setShowSampling((s) => !s)}
          className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
        >
          Sampling
          <span>{showSampling ? '▾' : '▸'}</span>
        </button>
        {showSampling && (
          <div className="mt-2 space-y-3 rounded-xl bg-zinc-900/60 p-3">
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
            <label className="block text-[11px] text-zinc-400">
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
    </aside>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
      <div className="flex justify-between text-[11px]">
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
