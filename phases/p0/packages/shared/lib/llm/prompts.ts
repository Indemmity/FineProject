import { promises as fs, existsSync } from "node:fs";
import * as path from "node:path";

// Resolve prompts directory — walk up from cwd to find the "prompts" folder
function findPromptsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "prompts");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "prompts");
}

const PROMPTS_DIR = findPromptsDir();

export class PromptError extends Error {
  constructor(message: string, public readonly templateName: string) {
    super(message);
    this.name = "PromptError";
  }
}

export async function loadPrompt(
  category: string,
  name: string,
): Promise<string> {
  const filePath = path.join(PROMPTS_DIR, category, `${name}.txt`);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    throw new PromptError(
      `Prompt template not found: ${category}/${name}.txt`,
      `${category}/${name}`,
    );
  }
}

export function renderPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  // Warn about unfilled variables
  const unfilled = result.match(/\{\{[^}]+\}\}/g);
  if (unfilled) {
    console.warn(
      `Unfilled template variables: ${unfilled.join(", ")}`,
    );
  }
  return result;
}

const cachedTemplates = new Map<string, string>();

export async function loadCachedPrompt(
  category: string,
  name: string,
): Promise<string> {
  const key = `${category}/${name}`;
  if (!cachedTemplates.has(key)) {
    const content = await loadPrompt(category, name);
    cachedTemplates.set(key, content);
  }
  return cachedTemplates.get(key)!;
}

export function clearPromptCache(): void {
  cachedTemplates.clear();
}