/** Thin Workers-friendly OpenAI chat completions client. Never log apiKey. */

export type ChatTextPart = { type: "text"; text: string };
export type ChatImagePart = {
  type: "image_url";
  image_url: { url: string; detail?: "low" | "high" | "auto" };
};

export type ChatMessageContent = string | Array<ChatTextPart | ChatImagePart>;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: ChatMessageContent;
};

export type ChatCompletionOpts = {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  /** Caps completion tokens (cheap replies). */
  maxTokens?: number;
  /** Override the API base (local mock / proxy). Defaults to https://api.openai.com/v1. */
  baseUrl?: string;
  /** Abort the request after this many ms (no abort when unset). */
  timeoutMs?: number;
};

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ChatCompletionResult = {
  content: string;
  model: string;
  usage?: ChatUsage;
};

type OpenAiChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export const chatCompletion = async (
  opts: ChatCompletionOpts,
): Promise<ChatCompletionResult> => {
  const base = (opts.baseUrl?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  const data = (await res.json()) as OpenAiChatResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? `OpenAI HTTP ${res.status}`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned empty content");

  const usage =
    data.usage != null
      ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          completionTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        }
      : undefined;

  return { content, model: data.model ?? opts.model, usage };
};
