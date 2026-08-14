export type EngineMode = 'wasm' | 'server';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** tokens per second for assistant messages */
  tps?: number;
  /** number of generated tokens */
  nTokens?: number;
}

export interface GenSettings {
  temperature: number;
  topK: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface LoadSettings {
  nCtx: number;
  nThreads: number; // -1 = auto
  nGpuLayers: number;
  flashAttn: boolean;
}

export interface ModelInfo {
  name: string;
  files: { name: string; size: number }[];
  totalBytes: number;
  arch?: string;
  quant?: string;
  sizeLabel?: string;
  nCtxTrain?: number;
  nEmbd?: number;
  nLayer?: number;
  nVocab?: number;
  nThreadsUsed?: number;
  multiThread?: boolean;
  chatTemplate?: boolean;
}

export interface LogLine {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  text: string;
  time: string;
}

export const DEFAULT_GEN: GenSettings = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxTokens: 1024,
  systemPrompt: 'You are a helpful AI assistant running locally via llama.cpp.',
};

export const DEFAULT_LOAD: LoadSettings = {
  nCtx: 4096,
  nThreads: -1,
  nGpuLayers: 99,
  flashAttn: false,
};

export function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(2) + ' GB';
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}
