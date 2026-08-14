import type { GenSettings } from './types';

export interface ServerProbeResult {
  ok: boolean;
  models: string[];
  error?: string;
}

/** Probe a llama.cpp `llama-server` (or any OpenAI-compatible endpoint). */
export async function probeServer(
  baseUrl: string,
  apiKey?: string,
): Promise<ServerProbeResult> {
  try {
    const res = await fetch(`${trimUrl(baseUrl)}/v1/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });
    if (!res.ok) {
      return { ok: false, models: [], error: `HTTP ${res.status} ${res.statusText}` };
    }
    const json = await res.json();
    const models: string[] = Array.isArray(json?.data)
      ? json.data.map((m: { id?: string }) => m.id ?? 'unknown')
      : [];
    return { ok: true, models };
  } catch (e) {
    return {
      ok: false,
      models: [],
      error:
        e instanceof Error
          ? e.message
          : 'Connection failed (is llama-server running? CORS enabled?)',
    };
  }
}

/** Stream a chat completion from llama-server via SSE. Calls onDelta with accumulated text. */
export async function streamServerChat(
  baseUrl: string,
  apiKey: string,
  messages: { role: string; content: string }[],
  gen: GenSettings,
  onDelta: (fullText: string) => void,
  signal: AbortSignal,
): Promise<{ text: string; tps?: number; nTokens?: number }> {
  const res = await fetch(`${trimUrl(baseUrl)}/v1/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      messages,
      stream: true,
      temperature: gen.temperature,
      top_k: gen.topK,
      top_p: gen.topP,
      max_tokens: gen.maxTokens,
      timings_per_token: true,
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error(`Server error: HTTP ${res.status} ${body.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let tps: number | undefined;
  let nTokens: number | undefined;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(full);
        }
        if (json?.timings) {
          tps = json.timings.predicted_per_second;
          nTokens = json.timings.predicted_n;
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }
  return { text: full, tps, nTokens };
}

function trimUrl(u: string): string {
  return u.replace(/\/+$/, '');
}
