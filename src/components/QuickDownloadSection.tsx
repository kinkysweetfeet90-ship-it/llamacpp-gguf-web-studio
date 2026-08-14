import { useState, useCallback } from 'react';
import { cn } from '../utils/cn';

export interface QuickModel {
  id: string;
  name: string;
  filename: string;
  size: string;
  url: string;
  fallbackUrl?: string;
}

const abortControllers: Record<string, AbortController> = {};

export const QUICK_MODELS: QuickModel[] = [
  {
    id: 'qwen2.5-0.5b-q4_k_m',
    name: 'Qwen 2.5 0.5B',
    filename: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    size: '340 MB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen2.5-0.5b-q3_k_m',
    name: 'Qwen 2.5 0.5B',
    filename: 'qwen2.5-0.5b-instruct-q3_k_m.gguf',
    size: '245 MB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q3_k_m.gguf',
  },
  {
    id: 'qwen2.5-coder-0.5b-q4_k_m',
    name: 'Qwen 2.5 Coder 0.5B',
    filename: 'qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
    size: '340 MB',
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
  },
  {
    id: 'qwen1.5-0.5b-q4_k_m',
    name: 'Qwen 1.5 0.5B',
    filename: 'qwen1.5-0.5b-chat-q4_k_m.gguf',
    size: '330 MB',
    url: 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1.5-0.5b-chat-q4_k_m.gguf',
  },
  {
    id: 'phi3-mini-4k-q4_k_m',
    name: 'Phi-3 Mini 4K',
    filename: 'phi3-mini-4k-instruct-q4_k_m.gguf',
    size: '240 MB',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/phi3-mini-4k-instruct-q4_k_m.gguf',
  },
];

interface QuickDownloadProps {
  onFileDownload: (file: File) => void;
  disabled?: boolean;
}

export default function QuickDownloadSection({ onFileDownload, disabled }: QuickDownloadProps) {
  const [downloading, setDownloading] = useState<Record<string, { progress: number; error: string | null }>>({});

  const handleDownload = useCallback(async (model: QuickModel) => {
    const attemptDownload = async (url: string) => {
      const controller = new AbortController();
      abortControllers[model.id] = controller;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401 && model.fallbackUrl) {
          throw { useFallback: true };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    };

    setDownloading((prev) => ({ ...prev, [model.id]: { progress: 0, error: null } }));
    try {
      let response;
      try {
        response = await attemptDownload(model.url);
      } catch (fallbackErr) {
        if (fallbackErr && fallbackErr.useFallback && model.fallbackUrl) {
          response = await attemptDownload(model.fallbackUrl);
        } else {
          throw fallbackErr;
        }
      }
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Streaming not supported');
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0) setDownloading((prev) => ({ ...prev, [model.id]: { progress: (received / total) * 100, error: null } }));
        }
      }
      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const file = new File([blob], model.filename, { type: 'application/octet-stream' });
      setDownloading((prev) => ({ ...prev, [model.id]: { progress: 100, error: null } }));
      setTimeout(() => {
        setDownloading((prev) => {
          const updated = { ...prev };
          delete updated[model.id];
          return updated;
        });
      }, 1000);
      delete abortControllers[model.id];
      onFileDownload(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('aborted')) {
        setDownloading((prev) => {
          const updated = { ...prev };
          delete updated[model.id];
          return updated;
        });
      } else {
        setDownloading((prev) => ({ ...prev, [model.id]: { progress: 0, error: msg } }));
      }
    }
  }, [onFileDownload]);

  const handleCancel = useCallback((model: QuickModel) => {
    const controller = abortControllers[model.id];
    if (controller) {
      controller.abort();
      delete abortControllers[model.id];
    }
    setDownloading((prev) => {
      const updated = { ...prev };
      delete updated[model.id];
      return updated;
    });
  }, []);

  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Quick download
      </h3>
      <div className="space-y-2 rounded-xl bg-zinc-900/60 p-3">
        {QUICK_MODELS.map((model) => {
          const dlState = downloading[model.id];
          const isDownloading = !!dlState;
          return (
            <div key={model.id} className="flex items-center justify-between gap-2 rounded-md bg-zinc-900 px-2.5 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-200">{model.name}</div>
                <div className="text-[10px] text-zinc-500">{model.size} · {model.filename}</div>
                {isDownloading && dlState.error && (
                  <div className="mt-1 text-[10px] text-red-400">{dlState.error}</div>
                )}
              </div>
              {isDownloading && dlState.progress < 100 ? (
                <button
                  onClick={() => handleCancel(model)}
                  className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold bg-red-500 text-white hover:bg-red-400"
                >
                  CANCEL
                </button>
              ) : isDownloading && dlState.error ? (
                <button
                  onClick={() => handleDownload(model)}
                  disabled={disabled}
                  className={cn('shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold', 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400')}
                >
                  Retry
                </button>
              ) : (
                <button
                  onClick={() => handleDownload(model)}
                  disabled={disabled}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors',
                    isDownloading ? 'cursor-wait bg-zinc-800 text-zinc-500' : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
                  )}
                >
                  Download
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
