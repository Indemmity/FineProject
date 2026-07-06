import Groq from "groq-sdk";
import { loadLLMConfig, DEFAULT_LLM_CONFIG, type EnvLLMConfig } from "./config";
import { getCached, setCache, cacheKey } from "./cache";
import { getMockResponse, isMockMode } from "./mock";

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: "TIMEOUT" | "RATE_LIMIT" | "VALIDATION" | "INTERNAL",
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export class LLMClient {
  private client: Groq | null = null;
  private config: EnvLLMConfig;
  private circuitOpen = false;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor() {
    this.config = loadLLMConfig();
  }

  private getClient(): Groq {
    if (!this.client) {
      if (!this.config.GROQ_API_KEY) {
        throw new LLMError(
          "GROQ_API_KEY is not configured — set it in your environment or enable MOCK_MODE=true",
          "VALIDATION",
          false,
        );
      }
      this.client = new Groq({ apiKey: this.config.GROQ_API_KEY });
    }
    return this.client;
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
  ): Promise<LLMResponse> {
    if (isMockMode()) {
      const mock = await getMockResponse("analyze");
      return {
        content: mock.content,
        model: "mock",
        usage: {
          promptTokens: mock.usage.promptTokens,
          completionTokens: mock.usage.completionTokens,
          totalTokens: mock.usage.promptTokens + mock.usage.completionTokens,
        },
      };
    }

    if (this.circuitOpen) {
      const cooldownRemaining = Date.now() - this.lastFailureTime;
      if (cooldownRemaining < 60000) {
        throw new LLMError(
          "Circuit breaker open — too many recent failures",
          "INTERNAL",
          true,
        );
      }
      this.circuitOpen = false;
      this.failureCount = 0;
    }

    const cKey = cacheKey(prompt, this.config.LLM_MODEL);
    const cached = getCached(cKey);
    if (cached) {
      return {
        content: cached,
        model: this.config.LLM_MODEL,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    const messages: { role: "system" | "user"; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    let lastError: Error | null = null;
    const maxAttempts = DEFAULT_LLM_CONFIG.retry.maxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.LLM_TIMEOUT_MS ?? DEFAULT_LLM_CONFIG.timeoutMs,
        );

        const response = await this.getClient().chat.completions.create(
          {
            model: this.config.LLM_MODEL,
            messages,
            temperature: DEFAULT_LLM_CONFIG.temperature,
            max_tokens: DEFAULT_LLM_CONFIG.maxTokens,
          },
          { signal: controller.signal },
        );

        clearTimeout(timeoutId);

        const content = response.choices[0]?.message?.content ?? "";
        this.failureCount = 0;

        setCache(
          cKey,
          content,
          this.config.LLM_CACHE_TTL_MS ?? DEFAULT_LLM_CONFIG.cacheTtlMs,
        );

        return {
          content,
          model: this.config.LLM_MODEL,
          usage: {
            promptTokens: response.usage?.prompt_tokens ?? 0,
            completionTokens: response.usage?.completion_tokens ?? 0,
            totalTokens: response.usage?.total_tokens ?? 0,
          },
        };
      } catch (err) {
        lastError = err as Error;

        if ((err as Error).name === "AbortError") {
          throw new LLMError("LLM request timed out", "TIMEOUT", true);
        }

        if (typeof (err as Record<string, unknown>).status === "number") {
          const status = (err as Record<string, number>).status;
          if (status === 429) {
            throw new LLMError(
              "Rate limit exceeded",
              "RATE_LIMIT",
              true,
            );
          }
        }

        if (attempt < maxAttempts) {
          const backoff = Math.min(
            DEFAULT_LLM_CONFIG.retry.backoffMs * Math.pow(2, attempt - 1),
            DEFAULT_LLM_CONFIG.retry.maxBackoffMs,
          );
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= 5) {
      this.circuitOpen = true;
    }

    throw new LLMError(
      lastError?.message ?? "LLM request failed after retries",
      "INTERNAL",
      true,
    );
  }
}

export const llm = new LLMClient();