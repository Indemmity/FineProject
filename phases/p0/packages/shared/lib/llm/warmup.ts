/**
 * LLM cache warm-up — pre-populates cache with common queries.
 *
 * Run during application startup to improve first-request latency.
 */

export const COMMON_QUERIES: Array<{ promptType: string; variables: Record<string, string> }> = [
  { promptType: "resume/analyze", variables: { jd_excerpt: "Software Engineer", resume_text: "Experienced developer" } },
  { promptType: "resume/gaps", variables: { jd_excerpt: "Senior Developer", resume_text: "Junior Developer" } },
  { promptType: "resume/tailor", variables: { original_bullet: "Built apps", jd_excerpt: "Senior role", target_skills: "React, TypeScript" } },
];

export async function warmUpCache(): Promise<void> {
  const { loadCachedPrompt, renderPrompt } = await import("../llm/prompts");
  const { llm } = await import("../llm/client");

  for (const query of COMMON_QUERIES) {
    try {
      const [category, name] = query.promptType.split("/");
      const template = await loadCachedPrompt(category!, name!);
      const prompt = renderPrompt(template, query.variables);
      await llm.complete(prompt);
      console.log(`[cache-warm] Primed: ${query.promptType}`);
    } catch {
      // Warm-up failures are non-critical
      console.warn(`[cache-warm] Skipped: ${query.promptType}`);
    }
  }
}