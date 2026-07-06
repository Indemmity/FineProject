import { llm } from "../llm/client";
import { isMockMode } from "../llm/mock";
import { loadCachedPrompt, renderPrompt } from "../llm/prompts";
import {
  buildResumeMatchInsights,
  type ResumeGapItem,
} from "./resume-matching";

export type GapItem = ResumeGapItem;

export async function analyzeGaps(
  resumeText: string,
  jdText: string,
): Promise<GapItem[]> {
  if (isMockMode()) {
    return buildResumeMatchInsights(resumeText, jdText).gaps;
  }

  const template = await loadCachedPrompt("resume", "gaps");
  const prompt = renderPrompt(template, {
    jd_excerpt: jdText.slice(0, 3000),
    resume_text: resumeText.slice(0, 4000),
  });

  const response = await llm.complete(prompt);

  try {
    const parsed = JSON.parse(response.content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return buildResumeMatchInsights(resumeText, jdText).gaps;
  }
}
