export interface ResumeTheme {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'modern' | 'classic' | 'minimal';
}

export const AVAILABLE_THEMES: ResumeTheme[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, ATS-friendly design with standard formatting',
    category: 'professional'
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary design with blue accents and clean layout',
    category: 'modern'
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional Times New Roman formatting with centered header',
    category: 'classic'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Compact design with simple, clean typography',
    category: 'minimal'
  }
];

export function getThemeById(id: string): ResumeTheme | undefined {
  return AVAILABLE_THEMES.find(theme => theme.id === id);
}

export function getThemesByCategory(category: ResumeTheme['category']): ResumeTheme[] {
  return AVAILABLE_THEMES.filter(theme => theme.category === category);
}
