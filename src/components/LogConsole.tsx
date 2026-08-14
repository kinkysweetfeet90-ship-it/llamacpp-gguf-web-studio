import { useEffect, useRef } from 'react';
import type { LogLine } from '../lib/types';
import { cn } from '../utils/cn';

export default function LogConsole({
  logs,
  open,
  onToggle,
  onClear,
}: {
  logs: LogLine[];
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, open]);

  return (
    <div className="border-t border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-1.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 sm:gap-2 sm:text-[11px]"
        >
          <span>{open ? '▾' : '▸'}</span>
          <span className="hidden sm:inline">Backend console</span>
          <span className="sm:hidden">Console</span>
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 sm:text-[10px]">
            {logs.length}
          </span>
        </button>
        {open && logs.length > 0 && (
          <button
            onClick={onClear}
            className="text-[10px] text-zinc-600 hover:text-red-400 sm:text-[11px]"
          >
            clear
          </button>
        )}
      </div>
      {open && (
        <div
          ref={ref}
          className="h-32 overflow-y-auto border-t border-zinc-900 px-3 py-2 font-mono text-[9px] leading-relaxed sm:h-40 sm:px-4 sm:text-[11px]"
        >
          {logs.length === 0 ? (
            <div className="text-zinc-700">— no output —</div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex gap-1.5 sm:gap-2">
                <span className="shrink-0 text-zinc-700">{l.time}</span>
                <span
                  className={cn(
                    'break-all',
                    l.level === 'error'
                      ? 'text-red-400'
                      : l.level === 'warn'
                        ? 'text-amber-400'
                        : l.level === 'debug'
                          ? 'text-zinc-600'
                          : 'text-zinc-400',
                  )}
                >
                  {l.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
