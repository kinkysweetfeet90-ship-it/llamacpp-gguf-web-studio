import { useEffect, useRef } from 'react';
import type { ChatMsg } from '../lib/types';
import { cn } from '../utils/cn';

interface ChatPanelProps {
  messages: ChatMsg[];
  streamingText: string | null;
  isGenerating: boolean;
  engineReady: boolean;
  engineLabel: string;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  voiceButton?: React.ReactNode;
  ttsButton?: React.ReactNode;
}

export default function ChatPanel(p: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [p.messages, p.streamingText]);

  useEffect(() => {
    if (p.engineReady && !p.isGenerating) p.inputRef.current?.focus();
  }, [p.engineReady, p.isGenerating, p.inputRef]);

  const send = () => {
    const text = p.inputValue.trim();
    if (!text || !p.engineReady || p.isGenerating) return;
    p.setInputValue('');
    p.onSend(text);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5',
              p.isGenerating
                ? 'animate-pulse bg-amber-400'
                : p.engineReady
                  ? 'bg-emerald-400'
                  : 'bg-zinc-600',
            )}
          />
          <span className="truncate text-xs font-medium text-zinc-200 sm:text-sm">
            {p.isGenerating
              ? 'Generating…'
              : p.engineReady
                ? p.engineLabel.length > 25
                  ? p.engineLabel.slice(0, 25) + '…'
                  : p.engineLabel
                : 'No model'}
          </span>
        </div>
        {p.messages.length > 0 && (
          <button
            onClick={p.onClear}
            disabled={p.isGenerating}
            className="hidden text-xs text-zinc-500 hover:text-red-400 disabled:opacity-40 sm:block"
          >
            ✕ clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
        {p.messages.length === 0 && p.streamingText === null ? (
          <EmptyState ready={p.engineReady} />
        ) : (
          <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
            {p.messages.map((m) => (
              <Bubble key={m.id} msg={m} />
            ))}
            {p.streamingText !== null && (
              <Bubble
                msg={{ id: '__stream', role: 'assistant', content: p.streamingText }}
                streaming
              />
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={p.inputRef}
            value={p.inputValue}
            onChange={(e) => p.setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={
              p.engineReady
                ? 'Send a message…'
                : 'Load a model first'
            }
            disabled={!p.engineReady || p.isGenerating}
            className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-emerald-500 disabled:opacity-50 sm:px-4 sm:py-3"
          />
          {p.voiceButton}
          {p.ttsButton}
          {p.isGenerating ? (
            <button
              onClick={p.onStop}
              className="h-[50px] shrink-0 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-xs font-bold text-red-300 hover:bg-red-500/20 sm:h-[58px] sm:px-5 sm:text-sm"
            >
              ■ Stop
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!p.engineReady || !p.inputValue.trim()}
              className={cn(
                'h-[50px] shrink-0 rounded-xl px-3 text-xs font-bold transition-colors sm:h-[58px] sm:px-5 sm:text-sm',
                p.engineReady && p.inputValue.trim()
                  ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-600',
              )}
            >
              <span className="hidden sm:inline">Send ↵</span>
              <span className="sm:hidden">Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, streaming }: { msg: ChatMsg; streaming?: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[85%] sm:px-4 sm:py-3',
          isUser
            ? 'rounded-br-sm bg-emerald-600/90 text-white'
            : 'rounded-bl-sm border border-zinc-800 bg-zinc-900 text-zinc-100',
        )}
      >
        <div className="whitespace-pre-wrap break-words font-[inherit] text-xs sm:text-sm">
          {msg.content || (streaming ? '' : '…')}
          {streaming && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-emerald-400 align-text-bottom sm:h-4 sm:w-2" />
          )}
        </div>
        {!isUser && msg.tps != null && (
          <div className="mt-1 text-[9px] font-mono text-zinc-500 sm:mt-1.5 sm:text-[10px]">
            {msg.nTokens != null ? `${msg.nTokens} tok · ` : ''}
            {msg.tps.toFixed(1)} tok/s
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ ready }: { ready: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 text-4xl ring-1 ring-emerald-500/20 sm:h-20 sm:w-20 sm:text-5xl">
        🦙
      </div>
      <h2 className="mt-4 text-lg font-bold sm:mt-5 sm:text-xl">
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          LASTIC
        </span>
        <span className="text-zinc-500"> </span>
        <span className="text-zinc-300">Studio</span>
      </h2>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500 sm:mt-3 sm:max-w-md sm:text-sm">
        {ready ? (
          <>Model loaded — start chatting below.</>
        ) : (
          <>
            Open the menu to load a{' '}
            <span className="font-mono text-emerald-400">.gguf</span> model or
            connect to llama-server.
          </>
        )}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-1.5 text-[9px] text-zinc-500 sm:mt-6 sm:gap-2 sm:text-[11px]">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 sm:px-3 sm:py-1">
          100% local
        </span>
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 sm:px-3 sm:py-1">
          no uploads
        </span>
        <span className="rounded-full border border-teal-500/20 bg-teal-500/5 px-2 py-0.5 sm:px-3 sm:py-1">
          streaming
        </span>
      </div>
    </div>
  );
}
