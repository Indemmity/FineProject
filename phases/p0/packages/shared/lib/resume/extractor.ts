export interface ResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary?: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
}

export interface ExperienceItem {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface EducationItem {
  degree?: string;
  school?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectItem {
  title?: string;
  description?: string;
  technologies?: string[];
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  date?: string;
}

export function extractResumeData(text: string): ResumeData {
  console.log('[extractResumeData] Starting extraction, text length:', text.length);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  console.log('[extractResumeData] Total lines:', lines.length);
  
  const data: ResumeData = {
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  };

  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    data.email = emailMatch[0];
    console.log('[extractResumeData] Found email:', data.email);
  }

  // Extract phone
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
  if (phoneMatch) {
    data.phone = phoneMatch[0];
    console.log('[extractResumeData] Found phone:', data.phone);
  }

  // Extract LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) {
    data.linkedin = linkedinMatch[0];
    console.log('[extractResumeData] Found LinkedIn:', data.linkedin);
  }

  // Extract GitHub
  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) {
    data.github = githubMatch[0];
    console.log('[extractResumeData] Found GitHub:', data.github);
  }

  // Extract skills (common tech keywords)
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express',
    'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'docker', 'kubernetes', 'aws', 'azure',
    'git', 'ci/cd', 'agile', 'scrum', 'rest', 'graphql', 'html', 'css', 'sass', 'tailwind',
    'nextjs', 'nestjs', 'django', 'flask', 'spring', 'linux', 'bash', 'testing', 'jest'
  ];
  
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  skillKeywords.forEach(skill => {
    if (lowerText.includes(skill)) {
      foundSkills.add(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  data.skills = Array.from(foundSkills);
  console.log('[extractResumeData] Found skills:', data.skills);

  // Extract experience section
  const experienceSection = extractSection(text, ['experience', 'work experience', 'employment', 'professional experience']);
  console.log('[extractResumeData] Experience section:', experienceSection ? 'found' : 'not found');
  if (experienceSection) {
    data.experience = parseExperience(experienceSection);
    console.log('[extractResumeData] Parsed experience items:', data.experience.length);
  }

  // Extract education section
  const educationSection = extractSection(text, ['education', 'academic', 'qualifications']);
  console.log('[extractResumeData] Education section:', educationSection ? 'found' : 'not found');
  if (educationSection) {
    data.education = parseEducation(educationSection);
    console.log('[extractResumeData] Parsed education items:', data.education.length);
  }

  // Extract projects section
  const projectsSection = extractSection(text, ['projects', 'personal projects', 'portfolio']);
  console.log('[extractResumeData] Projects section:', projectsSection ? 'found' : 'not found');
  if (projectsSection) {
    data.projects = parseProjects(projectsSection);
    console.log('[extractResumeData] Parsed project items:', data.projects.length);
  }

  // Extract certifications section
  const certificationsSection = extractSection(text, ['certifications', 'certificates', 'licenses', 'credentials']);
  console.log('[extractResumeData] Certifications section:', certificationsSection ? 'found' : 'not found');
  if (certificationsSection) {
    data.certifications = parseCertifications(certificationsSection);
    console.log('[extractResumeData] Parsed certification items:', data.certifications.length);
  }

  // Extract summary
  const summarySection = extractSection(text, ['summary', 'professional summary', 'objective', 'profile', 'about me']);
  console.log('[extractResumeData] Summary section:', summarySection ? 'found' : 'not found');
  if (summarySection) {
    data.summary = summarySection.substring(0, 500);
    console.log('[extractResumeData] Summary length:', data.summary.length);
  }

  // Try to extract name from first line (usually the name)
  if (lines.length > 0) {
    const firstLine = lines[0];
    console.log('[extractResumeData] First line:', firstLine);
    // Check if it looks like a name (no numbers, no special chars except spaces and hyphens)
    if (firstLine && /^[A-Za-z\s\-]+$/.test(firstLine) && firstLine.split(' ').length >= 2 && firstLine.split(' ').length <= 4) {
      data.name = firstLine;
      console.log('[extractResumeData] Extracted name:', data.name);
    }
  }

  // Try to extract location
  const locationPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/, // City, State
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z][a-z]+)/, // City, Country
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.location = match[1];
      console.log('[extractResumeData] Extracted location:', data.location);
      break;
    }
  }

  console.log('[extractResumeData] Final extracted data:', JSON.stringify(data, null, 2));
  return data;
}

function extractSection(text: string, headings: string[]): string | null {
  const lines = text.split('\n');
  let startIndex = -1;
  let endIndex = lines.length;

  // Find section start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim().toLowerCase();
    if (!line) continue;
    if (headings.some(heading => line.includes(heading.toLowerCase()))) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) return null;

  // Find section end (next major heading)
  const majorHeadings = ['experience', 'education', 'skills', 'projects', 'certifications', 'summary', 'objective'];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]?.trim().toLowerCase();
    if (!line) continue;
    if (majorHeadings.some(heading => line.includes(heading.toLowerCase()) && 
                              !headings.some(h => line.includes(h.toLowerCase())))) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trim();
}

function parseExperience(text: string): ExperienceItem[] {
  const items: ExperienceItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentItem: ExperienceItem | null = null;
  
  for (const line of lines) {
    // Check if this line looks like a job title/company line
    if (line.match(/^[A-Z][^a-z]*[A-Z]/) || line.includes(' at ') || line.includes(' - ')) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = { title: '', company: '', description: '' };
      
      // Try to parse title and company
      const atMatch = line.match(/(.+?)\s+(?:at|@|-|–)\s+(.+)/i);
      if (atMatch && atMatch[1] && atMatch[2]) {
        currentItem.title = atMatch[1].trim();
        currentItem.company = atMatch[2].trim();
      } else {
        currentItem.title = line;
      }
    } else if (currentItem) {
      // Add to description
      currentItem.description = (currentItem.description || '') + line + '\n';
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items.slice(0, 5); // Limit to 5 experiences
}

function parseEducation(text: string): EducationItem[] {
  const items: EducationItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentItem: EducationItem | null = null;
  
  for (const line of lines) {
    // Check if this line looks like a degree/school line
    if (line.includes('University') || line.includes('College') || line.includes('Institute') || 
        line.includes('Bachelor') || line.includes('Master') || line.includes('PhD') ||
        line.includes('B.S.') || line.includes('M.S.') || line.includes('B.Tech') || line.includes('M.Tech')) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = { degree: '', school: '' };
      
      // Try to parse degree and school
      const atMatch = line.match(/(.+?)\s+(?:at|from|,)\s+(.+)/i);
      if (atMatch && atMatch[1] && atMatch[2]) {
        currentItem.degree = atMatch[1].trim();
        currentItem.school = atMatch[2].trim();
      } else {
        currentItem.school = line;
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items.slice(0, 3); // Limit to 3 education entries
}

function parseProjects(text: string): ProjectItem[] {
  const items: ProjectItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentItem: ProjectItem | null = null;
  
  for (const line of lines) {
    // Check if this line looks like a project title line
    if (line.match(/^[A-Z]/) && !line.includes('University') && !line.includes('College')) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = { title: line, description: '', technologies: [] };
    } else if (currentItem) {
      // Add to description or extract technologies
      if (line.toLowerCase().includes('technologies') || line.toLowerCase().includes('tech') || line.toLowerCase().includes('stack')) {
        const techMatch = line.match(/(?:technologies|tech|stack)[:\s]+(.+)/i);
        if (techMatch && techMatch[1]) {
          currentItem.technologies = techMatch[1].split(',').map(t => t.trim()).filter(t => t);
        }
      } else {
        currentItem.description = (currentItem.description || '') + line + '\n';
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items.slice(0, 5); // Limit to 5 projects
}

function parseCertifications(text: string): CertificationItem[] {
  const items: CertificationItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentItem: CertificationItem | null = null;
  
  for (const line of lines) {
    // Check if this line looks like a certification name
    if (line.match(/^[A-Z]/) && (line.includes('Certification') || line.includes('Certificate') || line.includes('Course') || line.includes('Training'))) {
      if (currentItem) {
        items.push(currentItem);
      }
      currentItem = { name: line, issuer: '', date: '' };
    } else if (currentItem) {
      // Try to extract issuer and date
      if (line.match(/\d{4}/)) {
        currentItem.date = line.trim();
      } else if (line.length > 5) {
        currentItem.issuer = line.trim();
      }
    }
  }
  
  if (currentItem) {
    items.push(currentItem);
  }
  
  return items.slice(0, 5); // Limit to 5 certifications
}
