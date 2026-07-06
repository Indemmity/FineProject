/**
 * Mock LLM provider — returns deterministic responses for UI development.
 * Toggle via MOCK_MODE=true in env.
 */

export interface MockResponse {
  content: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

const MOCK_RESPONSES: Record<string, string> = {
  analyze: JSON.stringify({
    score: 72,
    skillBreakdown: [
      { skill: "TypeScript", level: "advanced", relevance: 95 },
      { skill: "React", level: "advanced", relevance: 90 },
      { skill: "Python", level: "intermediate", relevance: 60 },
      { skill: "Docker", level: "intermediate", relevance: 70 },
      { skill: "AWS", level: "intermediate", relevance: 65 },
      { skill: "PostgreSQL", level: "intermediate", relevance: 55 },
    ],
    strengths: ["Strong full-stack experience", "System design skills"],
    weaknesses: ["Limited cloud-native experience", "No Kubernetes"],
  }),

  tailor: JSON.stringify({
    sections: [
      {
        section: "experience",
        original: "Built web applications with React",
        tailored: "Architected scalable React applications serving 100K+ users, improving page load by 40%",
        reason: "Added impact metrics and scaled context to match senior expectations",
      },
      {
        section: "experience",
        original: "Worked with databases",
        tailored: "Designed and optimised PostgreSQL schemas for high-traffic applications, reducing query latency by 60%",
        reason: "Specified database type and added measurable performance improvement",
      },
    ],
  }),

  gaps: JSON.stringify([
    { skill: "Kubernetes", importance: "high", category: "technical", suggestedAction: "Complete CKAD certification and build a sample deployment" },
    { skill: "GraphQL", importance: "medium", category: "technical", suggestedAction: "Take Apollo GraphQL tutorial and add to side project" },
    { skill: "Team Leadership", importance: "medium", category: "soft_skill", suggestedAction: "Lead a cross-functional project and document outcomes" },
  ]),

  guardrails: JSON.stringify({
    passed: true,
    issues: [
      { type: "warning", field: "job_title", message: "Title 'Senior Engineer' matches original" },
    ],
    severity: "low",
  }),
};

export async function getMockResponse(
  promptType: string,
): Promise<MockResponse> {
  const content = MOCK_RESPONSES[promptType] ?? JSON.stringify({ message: "Mock response" });
  return {
    content,
    model: "mock-model",
    usage: { promptTokens: 0, completionTokens: content.length },
  };
}

export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true" || process.env.MOCK_MODE === "1" || !process.env.GROQ_API_KEY;
}