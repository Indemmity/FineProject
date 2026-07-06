import { z } from "zod";

export const EnvLLMConfigSchema = z.object({
  GROQ_API_KEY: z.string().default(""),
  LLM_MODEL: z.string().default("llama-3.3-70b-versatile"),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
  LLM_MAX_TOKENS: z.coerce.number().positive().default(4096),
  LLM_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  LLM_CACHE_TTL_MS: z.coerce.number().positive().default(3600000),
  MOCK_MODE: z
    .string()
    .transform((v) => v === "true" || v === "1")
    .default("true"),
});

export type EnvLLMConfig = z.infer<typeof EnvLLMConfigSchema>;

export function loadLLMConfig(): EnvLLMConfig {
  const parsed = EnvLLMConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    console.warn("LLM config validation failed:", parsed.error.flatten());
    return EnvLLMConfigSchema.parse({});
  }
  return parsed.data;
}

export const DEFAULT_LLM_CONFIG = {
  model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  maxTokens: 4096,
  retry: {
    maxAttempts: 3,
    backoffMs: 1000,
    maxBackoffMs: 10000,
  },
  cacheTtlMs: 3600000,
  timeoutMs: 30000,
} as const;