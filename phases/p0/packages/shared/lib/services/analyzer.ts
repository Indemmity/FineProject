import { llm } from "../llm/client";
import { isMockMode } from "../llm/mock";
import { loadCachedPrompt, renderPrompt } from "../llm/prompts";
import {
  buildResumeMatchInsights,
  type ResumeAnalysisResult,
  type ResumeSkillBreakdown,
} from "./resume-matching";

export type MatchResult = ResumeAnalysisResult;
export type SkillBreakdown = ResumeSkillBreakdown;

export async function analyzeResume(
  resumeText: string,
  jdText: string,
): Promise<MatchResult> {
  if (isMockMode()) {
    return buildResumeMatchInsights(resumeText, jdText).analysis;
  }

  const template = await loadCachedPrompt("resume", "analyze");
  const prompt = renderPrompt(template, {
    jd_excerpt: jdText.slice(0, 3000),
    resume_text: resumeText.slice(0, 4000),
  });

  const response = await llm.complete(prompt);

  try {
    const parsed = JSON.parse(response.content);
    return {
      score: parsed.score ?? 0,
      skillBreakdown: parsed.skillBreakdown ?? [],
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
    };
  } catch {
    return buildResumeMatchInsights(resumeText, jdText).analysis;
  }
}
