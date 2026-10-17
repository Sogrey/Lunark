/**
 * 本机 Ollama HTTP 客户端（改写 / 续写 / 翻译 / 摘要）。
 * 默认 http://127.0.0.1:11434 ，需用户自行运行 ollama serve。
 */

export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

export type AiAction = "rewrite" | "continue" | "translate" | "summarize";

export interface OllamaOptions {
  endpoint?: string;
  model?: string;
}

function baseUrl(endpoint: string): string {
  return (endpoint.trim() || DEFAULT_OLLAMA_ENDPOINT).replace(/\/+$/, "");
}

function systemPrompt(action: AiAction): string {
  switch (action) {
    case "rewrite":
      return "You rewrite the user's Markdown text to be clearer and better written. Preserve meaning, language, and Markdown structure. Output only the rewritten text, no preamble.";
    case "continue":
      return "You continue the user's Markdown writing in the same language, style, and tone. Output only the continuation text to append, no preamble.";
    case "translate":
      return "Translate the user's Markdown. If it is Chinese, translate to English; if English (or other), translate to Simplified Chinese. Preserve Markdown structure. Output only the translation.";
    case "summarize":
      return "Summarize the user's Markdown concisely in the same language. Use short bullet points if helpful. Output only the summary.";
  }
}

export async function runOllamaAction(
  action: AiAction,
  text: string,
  opts: OllamaOptions = {},
): Promise<string> {
  const input = text.trim();
  if (!input) throw new Error("empty selection");

  const endpoint = baseUrl(opts.endpoint ?? DEFAULT_OLLAMA_ENDPOINT);
  const model = (opts.model ?? DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL;

  const resp = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt(action) },
        { role: "user", content: input },
      ],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Ollama HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as {
    message?: { content?: string };
    error?: string;
  };
  if (data.error) throw new Error(data.error);
  const out = data.message?.content?.trim();
  if (!out) throw new Error("Ollama returned empty content");
  return out;
}

export async function pingOllama(endpoint?: string): Promise<boolean> {
  try {
    const resp = await fetch(`${baseUrl(endpoint ?? DEFAULT_OLLAMA_ENDPOINT)}/api/tags`, {
      method: "GET",
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/** 列出本机已拉取的模型名（如 llama3.2:latest） */
export async function listOllamaModels(
  endpoint?: string,
): Promise<string[]> {
  const resp = await fetch(
    `${baseUrl(endpoint ?? DEFAULT_OLLAMA_ENDPOINT)}/api/tags`,
    { method: "GET" },
  );
  if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
  const data = (await resp.json()) as {
    models?: { name?: string; model?: string }[];
  };
  const names = (data.models ?? [])
    .map((m) => (m.name || m.model || "").trim())
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}
