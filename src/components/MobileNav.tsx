import { cn } from '../utils/cn';
import type { EngineMode, EngineStatus, ModelInfo } from '../lib/types';

interface MobileNavProps {
  mode: EngineMode;
  setMode: (m: EngineMode) => void;
  engineReady: boolean;
  engineStatus: EngineStatus;
  modelInfo: ModelInfo | null;
  serverStatus: EngineStatus;
  serverModels: string[];
  onOpenSidebar: () => void;
}

export default function MobileNav(p: MobileNavProps) {
  const isReady = p.engineReady;
  const isWasm = p.mode === 'wasm';

  return (
    <div className="lg:hidden">
      {/* Top mobile bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
        <button
          onClick={p.onOpenSidebar}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2"
        >
          <span className="text-lg">☰</span>
          <span className="text-xs font-medium text-zinc-300">
            {isWasm ? 'WASM' : 'Server'}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              p.engineStatus === 'loading' || p.serverStatus === 'loading'
                ? 'animate-pulse bg-amber-400'
                : isReady
                  ? 'bg-emerald-400'
                  : 'bg-zinc-600',
            )}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            {isWasm
              ? p.modelInfo?.name || 'No model'
              : p.serverModels[0]?.split('/').pop() || 'Not connected'}
          </span>
        </div>
        {isReady && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            Ready
          </span>
        )}
      </div>
    </div>
  );
}
