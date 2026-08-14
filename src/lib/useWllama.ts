import { useCallback, useRef, useState } from 'react';
import { Wllama } from '@wllama/wllama/esm/index.js';
import wllamaWasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url';
import type {
  EngineStatus,
  GenSettings,
  LoadSettings,
  LogLine,
  ModelInfo,
} from './types';

let logId = 0;

export interface WllamaEngine {
  status: EngineStatus;
  error: string | null;
  modelInfo: ModelInfo | null;
  logs: LogLine[];
  loadingPhase: string;
  startModel: (files: File[], settings: LoadSettings) => Promise<void>;
  unload: () => Promise<void>;
  generate: (
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    gen: GenSettings,
    onDelta: (fullText: string) => void,
  ) => Promise<{ text: string; tps?: number; nTokens?: number }>;
  stopGeneration: () => void;
  clearLogs: () => void;
}

export function useWllama(): WllamaEngine {
  const [status, setStatus] = useState<EngineStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loadingPhase, setLoadingPhase] = useState('');
  const wllamaRef = useRef<Wllama | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pushLog = useCallback((level: LogLine['level'], ...args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
      .join(' ')
      .trim();
    if (!text) return;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => {
      const next = [...prev, { id: logId++, level, text, time }];
      return next.length > 300 ? next.slice(next.length - 300) : next;
    });
  }, []);

  const startModel = useCallback(
    async (files: File[], settings: LoadSettings) => {
      setStatus('loading');
      setError(null);
      setLoadingPhase('Initializing WASM runtime…');
      pushLog('info', `[engine] init wllama runtime (llama.cpp wasm build)`);
      try {
        // Tear down any previous instance
        if (wllamaRef.current) {
          await wllamaRef.current.exit().catch(() => undefined);
          wllamaRef.current = null;
        }

        const wllama = new Wllama(
          { default: wllamaWasmUrl },
          {
            suppressNativeLog: false,
            logger: {
              debug: (...a: unknown[]) => pushLog('debug', ...a),
              log: (...a: unknown[]) => pushLog('info', ...a),
              warn: (...a: unknown[]) => pushLog('warn', ...a),
              error: (...a: unknown[]) => pushLog('error', ...a),
            },
          },
        );
        wllamaRef.current = wllama;

        const totalBytes = files.reduce((s, f) => s + (f as File).size, 0);
        pushLog(
          'info',
          `[engine] loading ${files.length} GGUF file(s), total ${(totalBytes / 1024 ** 2).toFixed(1)} MB`,
        );
        setLoadingPhase(
          `Reading ${files.length} GGUF shard${files.length > 1 ? 's' : ''} into memory…`,
        );

        // Pre-read files into ArrayBuffers to bypass wllama's async blob.slice().arrayBuffer()
        // which fails with NotReadableError on large GGUF files (>~1GB).
        // We create custom blob-like objects that store data in memory and handle
        // slice().arrayBuffer() and stream() reliably.
        const fileBuffers: Blob[] = [];
        for (let i = 0; i < files.length; i++) {
          setLoadingPhase(
            `Reading shard ${i + 1}/${files.length} into memory…`,
          );
          const arrayBuffer = await (files[i] as File).arrayBuffer();
          const name = files[i].name;
          const uint8 = new Uint8Array(arrayBuffer);
          // Create a proper streaming reader for the fileWrite path
          const makeStream = () => {
            const CHUNK = 16 * 1024 * 1024; // 16MB chunks
            let offset = 0;
            return {
              getReader: () => ({
                read: () => {
                  if (offset >= arrayBuffer.byteLength) {
                    return { done: true, value: undefined };
                  }
                  const end = Math.min(offset + CHUNK, arrayBuffer.byteLength);
                  const chunk = uint8.subarray(offset, end);
                  offset = end;
                  return { done: false, value: chunk };
                },
                releaseLock: () => {},
                closed: Promise.resolve(),
                cancel: () => Promise.resolve(),
              }),
              [Symbol.asyncIterator]: async function* () {
                let offset = 0;
                while (offset < arrayBuffer.byteLength) {
                  const end = Math.min(offset + CHUNK, arrayBuffer.byteLength);
                  yield uint8.subarray(offset, end);
                  offset = end;
                }
              },
            };
          };
          const blobLike: any = {
            size: arrayBuffer.byteLength,
            type: 'application/octet-stream',
            name: name,
            slice: (start: number, end: number) => {
              const sub = arrayBuffer.slice(start, end);
              return {
                size: sub.byteLength,
                type: 'application/octet-stream',
                arrayBuffer: () => Promise.resolve(sub),
                slice: (s: number, e: number) => blobLike.slice(start + s, start + e),
                stream: makeStream,
                text: () => new TextDecoder().decode(new Uint8Array(sub)),
              };
            },
            arrayBuffer: () => Promise.resolve(arrayBuffer),
            stream: makeStream,
            text: () => new TextDecoder().decode(uint8),
          };
          fileBuffers.push(blobLike as unknown as Blob);
        }

        setLoadingPhase(
          `Loading ${files.length} GGUF shard${files.length > 1 ? 's' : ''} into GPU…`,
        );

        // Attempt to load the model, with automatic retry on memory allocation errors
        const loadAttempt = async (wllama: Wllama, loadOpts: LoadSettings) => {
          await wllama.loadModel(fileBuffers as unknown as Blob[], {
            n_ctx: loadOpts.nCtx,
            ...(loadOpts.nThreads > 0 ? { n_threads: loadOpts.nThreads } : {}),
            n_gpu_layers: loadOpts.nGpuLayers,
            flash_attn: loadOpts.flashAttn,
          });
        };

        try {
          await loadAttempt(wllama, settings);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          const isMemError =
            errMsg.includes('could not allocate memory') ||
            errMsg.includes('RangeError') ||
            errMsg.includes('NotReadableError');

          if (isMemError) {
            // Tear down the failed instance and try again with reduced settings
            await wllama.exit().catch(() => undefined);
            wllamaRef.current = null;

            // Retry 1: CPU-only mode (no GPU layers)
            if (settings.nGpuLayers > 0) {
              pushLog('warn', `[engine] memory error with ${settings.nGpuLayers} GPU layers, retrying CPU-only (n_gpu_layers=0)`);
              setLoadingPhase('Loading model CPU-only (reduced memory)…');

              const retryWllama = new Wllama(
                { default: wllamaWasmUrl },
                {
                  suppressNativeLog: false,
                  logger: {
                    debug: (...a: unknown[]) => pushLog('debug', ...a),
                    log: (...a: unknown[]) => pushLog('info', ...a),
                    warn: (...a: unknown[]) => pushLog('warn', ...a),
                    error: (...a: unknown[]) => pushLog('error', ...a),
                  },
                },
              );
              wllamaRef.current = retryWllama;

              try {
                await loadAttempt(retryWllama, { ...settings, nGpuLayers: 0, flashAttn: false });
              } catch (retryErr) {
                const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
                const isStillMemError =
                  retryMsg.includes('could not allocate memory') ||
                  retryMsg.includes('RangeError');

                if (isStillMemError) {
                  // Retry 2: Reduced context window (512 tokens)
                  pushLog('warn', `[engine] still failing with CPU-only, trying reduced n_ctx=512`);
                  setLoadingPhase('Loading with reduced context (512 tokens)…');

                  await retryWllama.exit().catch(() => undefined);
                  wllamaRef.current = null;

                  const retry2Wllama = new Wllama(
                    { default: wllamaWasmUrl },
                    {
                      suppressNativeLog: false,
                      logger: {
                        debug: (...a: unknown[]) => pushLog('debug', ...a),
                        log: (...a: unknown[]) => pushLog('info', ...a),
                        warn: (...a: unknown[]) => pushLog('warn', ...a),
                        error: (...a: unknown[]) => pushLog('error', ...a),
                      },
                    },
                  );
                  wllamaRef.current = retry2Wllama;

                  await loadAttempt(retry2Wllama, { ...settings, nGpuLayers: 0, flashAttn: false, nCtx: 512 });
                } else {
                  throw retryErr;
                }
              }
            } else {
              // Already CPU-only, try reduced context window
              pushLog('warn', `[engine] memory error with CPU-only, trying reduced n_ctx=512`);
              setLoadingPhase('Loading with reduced context (512 tokens)…');

              const retryWllama = new Wllama(
                { default: wllamaWasmUrl },
                {
                  suppressNativeLog: false,
                  logger: {
                    debug: (...a: unknown[]) => pushLog('debug', ...a),
                    log: (...a: unknown[]) => pushLog('info', ...a),
                    warn: (...a: unknown[]) => pushLog('warn', ...a),
                    error: (...a: unknown[]) => pushLog('error', ...a),
                  },
                },
              );
              wllamaRef.current = retryWllama;

              await loadAttempt(retryWllama, { ...settings, nCtx: 512 });
            }
          } else {
            throw e;
          }
        }

        setLoadingPhase('Reading model metadata…');
        const meta = wllama.getModelMetadata();
        const m = meta.meta || {};
        const info: ModelInfo = {
          name:
            m['general.name'] ||
            files[0].name.replace(/\.gguf$/i, '').replace(/-\d+-of-\d+$/i, ''),
          files: files.map((f) => ({ name: f.name, size: f.size })),
          totalBytes,
          arch: m['general.architecture'],
          quant: m['general.file_type']
            ? fileTypeToQuant(m['general.file_type'])
            : undefined,
          sizeLabel: m['general.size_label'],
          nCtxTrain: meta.hparams?.nCtxTrain,
          nEmbd: meta.hparams?.nEmbd,
          nLayer: meta.hparams?.nLayer,
          nVocab: meta.hparams?.nVocab,
          nThreadsUsed: safeCall(() => wllama.getNumThreads()),
          multiThread: safeCall(() => wllama.isMultithread()),
          chatTemplate: !!safeCall(() => wllama.getChatTemplate()),
        };
        setModelInfo(info);
        setStatus('ready');
        setLoadingPhase('');
        pushLog(
          'info',
          `[engine] model ready: ${info.name} | arch=${info.arch ?? '?'} | ctx=${settings.nCtx} | threads=${info.nThreadsUsed ?? '?'} (${info.multiThread ? 'multi' : 'single'}-thread)`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus('error');
        setLoadingPhase('');
        pushLog('error', `[engine] failed to load model: ${msg}`);
        if (wllamaRef.current) {
          await wllamaRef.current.exit().catch(() => undefined);
          wllamaRef.current = null;
        }
      }
    },
    [pushLog],
  );

  const unload = useCallback(async () => {
    abortRef.current?.abort();
    if (wllamaRef.current) {
      pushLog('info', '[engine] ejecting model, freeing memory');
      await wllamaRef.current.exit().catch(() => undefined);
      wllamaRef.current = null;
    }
    setModelInfo(null);
    setStatus('idle');
    setError(null);
  }, [pushLog]);

  const generate = useCallback(
    async (
      messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
      gen: GenSettings,
      onDelta: (fullText: string) => void,
    ) => {
      const wllama = wllamaRef.current;
      if (!wllama) throw new Error('Model is not loaded');
      const ac = new AbortController();
      abortRef.current = ac;
      let full = '';
      let tps: number | undefined;
      let nTokens: number | undefined;
      try {
        const stream = await wllama.createChatCompletion({
          messages,
          stream: true,
          abortSignal: ac.signal,
          max_tokens: gen.maxTokens,
          temperature: gen.temperature,
          top_k: gen.topK,
          top_p: gen.topP,
          timings_per_token: true,
        });
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onDelta(full);
          }
          if (chunk.timings) {
            tps = chunk.timings.predicted_per_second;
            nTokens = chunk.timings.predicted_n;
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          pushLog('warn', '[engine] generation aborted by user');
        } else {
          throw e;
        }
      } finally {
        abortRef.current = null;
      }
      if (tps) {
        pushLog(
          'info',
          `[engine] generated ${nTokens ?? '?'} tokens @ ${tps.toFixed(2)} tok/s`,
        );
      }
      return { text: full, tps, nTokens };
    },
    [pushLog],
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    status,
    error,
    modelInfo,
    logs,
    loadingPhase,
    startModel,
    unload,
    generate,
    stopGeneration,
    clearLogs,
  };
}

function safeCall<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

function safeStringify(v: unknown): string {
  try {
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  } catch {
    return String(v);
  }
}

const QUANT_MAP: Record<string, string> = {
  '0': 'F32',
  '1': 'F16',
  '2': 'Q4_0',
  '3': 'Q4_1',
  '7': 'Q8_0',
  '8': 'Q5_0',
  '9': 'Q5_1',
  '10': 'Q2_K',
  '11': 'Q3_K_S',
  '12': 'Q3_K_M',
  '13': 'Q3_K_L',
  '14': 'Q4_K_S',
  '15': 'Q4_K_M',
  '16': 'Q5_K_S',
  '17': 'Q5_K_M',
  '18': 'Q6_K',
  '19': 'IQ2_XXS',
  '20': 'IQ2_XS',
  '21': 'Q2_K_S',
  '22': 'IQ3_XS',
  '23': 'IQ3_XXS',
  '24': 'IQ1_S',
  '25': 'IQ4_NL',
  '26': 'IQ3_S',
  '27': 'IQ3_M',
  '28': 'IQ2_S',
  '29': 'IQ2_M',
  '30': 'IQ4_XS',
  '31': 'IQ1_M',
  '32': 'BF16',
};

function fileTypeToQuant(ft: string): string {
  return QUANT_MAP[ft] ?? `type ${ft}`;
}
