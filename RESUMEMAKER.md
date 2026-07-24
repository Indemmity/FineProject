# Resume Maker - Architecture & Implementation Plan

> Based on analysis of [resume-lm](https://github.com/olyaiy/resume-lm) (AGPL-3.0)
> Adapted for our Job Application Platform monorepo

---

## 1. How resume-lm Works (Source Analysis)

### Tech Stack
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **AI**: Vercel AI SDK (`ai` package) with OpenAI, Anthropic, OpenRouter providers
- **DB**: Supabase (PostgreSQL + Auth + RLS)
- **PDF**: `@react-pdf/renderer` for client-side PDF generation
- **UI**: Shadcn UI + Tailwind CSS + Framer Motion
- **Editor**: TipTap rich text editor

### Core Flow
```
User Input (text/file) → AI Parsing → Structured Resume Data → Editor → PDF Export
```

### Key Components
1. **Resume Data Model** - Structured JSON with sections: personal info, work experience, education, skills, projects
2. **AI Chat Assistant** - Uses Vercel AI SDK `streamText` with tool-calling for resume modifications
3. **PDF Renderer** - `@react-pdf/renderer` generates ATS-optimized PDFs from structured data
4. **Prompt Engineering** - Specialized system prompts for: formatting, importing, generating bullet points, improving content

### AI Tools (Function Calling)
- `getResume` - Read resume sections
- `suggest_work_experience_improvement` - Improve work entries
- `suggest_project_improvement` - Improve project entries
- `suggest_skill_improvement` - Add/remove skills
- `suggest_education_improvement` - Improve education entries
- `modifyWholeResume` - Bulk update multiple sections

### Database Schema (resume-lm)
- **profiles** - User base info + resume components (JSON fields)
- **resumes** - Base + tailored resume versions, linked to jobs
- **jobs** - Job listings with requirements
- All tables use Row Level Security (RLS)

---

## 2. Our Current Project State

### Existing Structure
```
Final-Project/
├── phases/p0/
│   ├── apps/web/           # Next.js web app
│   │   └── app/
│   │       ├── api/        # API routes (applications, auth, jobs, outreach, resume)
│   │       ├── dashboard/
│   │       └── login/
│   └── packages/shared/    # Shared code
│       ├── db/schema.ts    # Drizzle ORM schema
│       ├── types.ts        # Zod schemas + TypeScript types
│       └── auth/           # Auth utilities
```

### Current Resume Schema (Minimal)
```typescript
// phases/p0/packages/shared/db/schema.ts
resumes = {
  id, userId, originalFilePath, originalFileContent,
  parsedText, tailoredText (jsonb), matchScore, gapAnalysis, createdAt
}
```

### What's Missing for Full Resume Making
- No structured resume data (work experience, education, skills, projects as separate fields)
- No PDF generation
- No AI chat assistant for resume editing
- No resume builder/editor UI
- No template system
- No ATS scoring

---

## 3. Full Architecture Plan

### 3.1 Directory Structure (New Files)

```
phases/p0/
├── apps/web/
│   ├── app/
│   │   ├── api/
│   │   │   └── resume/
│   │   │       ├── create/route.ts        # Create new resume
│   │   │       ├── [id]/route.ts          # Get/update/delete resume
│   │   │       ├── [id]/pdf/route.ts      # Generate PDF
│   │   │       ├── [id]/score/route.ts    # ATS scoring
│   │   │       ├── [id]/tailor/route.ts   # Tailor for job
│   │   │       └── chat/route.ts          # AI assistant chat
│   │   └── dashboard/
│   │       └── resume/
│   │           ├── page.tsx               # Resume list/management
│   │           ├── new/page.tsx           # Create new resume
│   │           └── [id]/
│   │               ├── page.tsx           # Resume editor
│   │               └── preview/page.tsx   # PDF preview + download
│   └── components/
│       └── resume/
│           ├── editor/
│           │   ├── ResumeEditor.tsx       # Main editor container
│           │   ├── PersonalInfoForm.tsx   # Contact info form
│           │   ├── WorkExperienceForm.tsx # Work experience section
│           │   ├── EducationForm.tsx      # Education section
│           │   ├── SkillsForm.tsx         # Skills section
│           │   ├── ProjectsForm.tsx       # Projects section
│           │   └── SectionOrderer.tsx     # Drag-drop section reordering
│           ├── preview/
│           │   ├── ResumePreview.tsx      # Live preview panel
│           │   └── PDFGenerator.tsx       # @react-pdf/renderer component
│           ├── templates/
│           │   ├── ModernTemplate.tsx     # Modern design
│           │   ├── ClassicTemplate.tsx    # Traditional design
│           │   └── MinimalTemplate.tsx    # Clean/minimal design
│           ├── assistant/
│           │   ├── ChatAssistant.tsx      # AI chat sidebar
│           │   └── SuggestionCard.tsx     # AI suggestion display
│           └── import/
│               ├── TextImport.tsx         # Paste text import
│               └── FileImport.tsx         # PDF/DOCX file import
│
├── packages/shared/
│   ├── db/
│   │   ├── schema.ts          # UPDATE: Add structured resume tables
│   │   └── migrations/        # New migration for resume tables
│   ├── types.ts               # UPDATE: Add resume types
│   └── lib/
│       ├── ai/
│       │   ├── prompts.ts     # AI system prompts
│       │   ├── models.ts      # AI model configurations
│       │   ├── tools.ts       # AI function calling tools
│       │   └── schemas.ts     # OpenAI/Zod schemas for structured output
│       └── resume/
│           ├── scoring.ts     # ATS scoring logic
│           ├── tailor.ts      # Resume tailoring logic
│           └── templates.ts   # Template configurations
```

### 3.2 Database Schema Changes

#### New Tables

```sql
-- Extended resume data (structured fields)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_title TEXT DEFAULT 'My Resume';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_base_resume BOOLEAN DEFAULT true;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id);

-- Personal info fields
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS github_url TEXT DEFAULT '';

-- Structured sections (JSONB)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]';

-- Layout/template settings
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS section_order JSONB DEFAULT '["work_experience", "education", "skills", "projects"]';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS section_configs JSONB DEFAULT '{}';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS document_settings JSONB DEFAULT '{}';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS template_id TEXT DEFAULT 'modern';

-- Cover letter
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS has_cover_letter BOOLEAN DEFAULT false;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS cover_letter JSONB;
```

#### Drizzle Schema Update

```typescript
// phases/p0/packages/shared/db/schema.ts - ADD to resumes table

// After existing columns, add:
resumeTitle: text('resume_title').default('My Resume'),
targetRole: text('target_role').default(''),
isBaseResume: boolean('is_base_resume').default(true),
jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),

// Personal info
firstName: text('first_name').default(''),
lastName: text('last_name').default(''),
email: text('email').default(''),
phoneNumber: text('phone_number').default(''),
location: text('location').default(''),
website: text('website').default(''),
linkedinUrl: text('linkedin_url').default(''),
githubUrl: text('github_url').default(''),

// Structured sections
workExperience: jsonb('work_experience').default('[]'),
education: jsonb('education').default('[]'),
skills: jsonb('skills').default('[]'),
projects: jsonb('projects').default('[]'),

// Layout
sectionOrder: jsonb('section_order').default('["work_experience","education","skills","projects"]'),
sectionConfigs: jsonb('section_configs').default('{}'),
documentSettings: jsonb('document_settings').default('{}'),
templateId: text('template_id').default('modern'),

// Cover letter
hasCoverLetter: boolean('has_cover_letter').default(false),
coverLetter: jsonb('cover_letter'),
```

### 3.3 TypeScript Types

```typescript
// phases/p0/packages/shared/types.ts - ADD

export interface WorkExperience {
  company: string;
  position: string;
  location?: string;
  date: string;
  description: string[];
  technologies?: string[];
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  location?: string;
  date: string;
  gpa?: string;
  achievements?: string[];
}

export interface Project {
  name: string;
  description: string[];
  date?: string;
  technologies?: string[];
  url?: string;
  githubUrl?: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface SectionConfig {
  visible: boolean;
  maxItems?: number | null;
  style?: 'grouped' | 'list' | 'grid';
}

export interface DocumentSettings {
  fontSize: number;
  lineHeight: number;
  marginVertical: number;
  marginHorizontal: number;
  headerNameSize: number;
  headerNameBottomSpacing: number;
}

export interface Resume {
  id: string;
  userId: string;
  jobId?: string | null;
  resumeTitle: string;
  targetRole: string;
  isBaseResume: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  sectionOrder: string[];
  sectionConfigs: Record<string, SectionConfig>;
  documentSettings: DocumentSettings;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 AI Integration

#### Dependencies to Install

```bash
cd phases/p0/apps/web
npm install ai @ai-sdk/openai @ai-sdk/anthropic @react-pdf/renderer zod
```

#### AI Prompts (`packages/shared/lib/ai/prompts.ts`)

```typescript
export const RESUME_FORMATTER_SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are an expert resume formatter. Parse and structure resume content...
  [Adapt from resume-lm/src/lib/prompts.ts - RESUME_FORMATTER_SYSTEM_MESSAGE]`
};

export const WORK_EXPERIENCE_GENERATOR_MESSAGE = {
  role: 'system',
  content: `You are an ATS-optimized resume writer...generate bullet points...
  [Adapt from resume-lm/src/lib/prompts.ts - WORK_EXPERIENCE_GENERATOR_MESSAGE]`
};

export const AI_ASSISTANT_SYSTEM_MESSAGE = {
  role: 'system',
  content: `You are an AI resume assistant with tool-calling capabilities...
  [Adapt from resume-lm/src/lib/prompts.ts - AI_ASSISTANT_SYSTEM_MESSAGE]`
};
```

#### AI Tools (`packages/shared/lib/ai/tools.ts`)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const getResumeTool = tool({
  description: 'Get the user resume sections',
  parameters: z.object({
    sections: z.array(z.enum([
      'all', 'personal_info', 'work_experience',
      'education', 'skills', 'projects'
    ])),
  }),
});

export const suggestWorkExperienceTool = tool({
  description: 'Suggest improvements for a work experience entry',
  parameters: z.object({
    index: z.number(),
    improvedExperience: z.object({
      company: z.string(),
      position: z.string(),
      date: z.string(),
      description: z.array(z.string()),
      technologies: z.array(z.string()).optional(),
    }),
  }),
});

export const modifyWholeResumeTool = tool({
  description: 'Modify multiple resume sections at once',
  parameters: z.object({
    basicInfo: z.object({/* ... */}).optional(),
    workExperience: z.array(z.object({/* ... */})).optional(),
    education: z.array(z.object({/* ... */})).optional(),
    skills: z.array(z.object({/* ... */})).optional(),
    projects: z.array(z.object({/* ... */})).optional(),
  }),
});
```

### 3.5 API Routes

#### POST `/api/resume/create`
```typescript
// Create new resume from text import or blank
// Input: { text?: string, templateId?: string }
// Calls AI to parse text into structured resume data
// Returns: Resume object
```

#### GET/PUT `/api/resume/[id]`
```typescript
// GET: Fetch full resume with all sections
// PUT: Update resume fields (section edits from editor)
```

#### POST `/api/resume/[id]/pdf`
```typescript
// Generate PDF from resume data
// Uses @react-pdf/renderer server-side or returns data for client rendering
// Returns: PDF buffer or base64
```

#### POST `/api/resume/[id]/score`
```typescript
// AI-powered ATS scoring
// Analyzes resume against best practices
// Returns: { score: number, suggestions: string[], breakdown: {...} }
```

#### POST `/api/resume/chat`
```typescript
// AI assistant chat for resume editing
// Streaming response with tool calling
// Input: { messages: Message[], resume: Resume, targetRole: string }
// Uses Vercel AI SDK streamText()
```

### 3.6 PDF Generation

Using `@react-pdf/renderer` (same as resume-lm):

```tsx
// components/resume/preview/PDFGenerator.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export function ResumePDF({ resume, settings }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.firstName} {resume.lastName}</Text>
          <Text>{resume.email} | {resume.phoneNumber}</Text>
        </View>

        {/* Sections in order */}
        {resume.sectionOrder.map(section => {
          if (section === 'work_experience') return <WorkExperienceSection ... />;
          if (section === 'education') return <EducationSection ... />;
          if (section === 'skills') return <SkillsSection ... />;
          if (section === 'projects') return <ProjectsSection ... />;
        })}
      </Page>
    </Document>
  );
}
```

### 3.7 UI Components

#### Resume Editor (Main Page)
```
┌─────────────────────────────────────────────────────┐
│  Resume Editor                          [Save] [PDF]│
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  ┌────────────────┐  │  ┌────────────────────────┐  │
│  │ Personal Info  │  │  │                        │  │
│  │ [First Name]   │  │  │    LIVE PREVIEW        │  │
│  │ [Last Name]    │  │  │    (PDF-like view)     │  │
│  │ [Email]        │  │  │                        │  │
│  │ [Phone]        │  │  │                        │  │
│  │ [Location]     │  │  │                        │  │
│  └────────────────┘  │  │                        │  │
│                      │  │                        │  │
│  ┌────────────────┐  │  │                        │  │
│  │ Work Experience│  │  └────────────────────────┘  │
│  │ [+ Add Entry]  │  │                              │
│  │ ┌────────────┐ │  │  ┌────────────────────────┐  │
│  │ │ Company    │ │  │  │ 🤖 AI Assistant        │  │
│  │ │ Position   │ │  │  │ [Chat input...]        │  │
│  │ │ Bullets... │ │  │  │                        │  │
│  │ └────────────┘ │  │  │ "Improve my work       │  │
│  └────────────────┘  │  │  experience at Google" │  │
│                      │  └────────────────────────┘  │
│  ┌────────────────┐  │                              │
│  │ Education      │  │                              │
│  └────────────────┘  │                              │
│                      │                              │
│  ┌────────────────┐  │                              │
│  │ Skills         │  │                              │
│  └────────────────┘  │                              │
│                      │                              │
│  ┌────────────────┐  │                              │
│  │ Projects       │  │                              │
│  └────────────────┘  │                              │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
```

---

## 4. Implementation Phases

### Phase 1: Database & Types (Day 1)
- [ ] Update `schema.ts` with new resume fields
- [ ] Add TypeScript types to `types.ts`
- [ ] Run migration
- [ ] Create basic CRUD API routes

### Phase 2: Resume Editor UI (Days 2-3)
- [ ] Create resume list page (`/dashboard/resume`)
- [ ] Create new resume page (`/dashboard/resume/new`)
- [ ] Build editor components (PersonalInfo, WorkExperience, Education, Skills, Projects)
- [ ] Implement live preview panel
- [ ] Add section reordering (drag-drop)

### Phase 3: PDF Generation (Day 4)
- [ ] Install `@react-pdf/renderer`
- [ ] Create PDF template components
- [ ] Build PDF preview + download functionality
- [ ] Add document settings (fonts, margins, spacing)

### Phase 4: AI Integration (Days 5-6)
- [ ] Install Vercel AI SDK + providers
- [ ] Create AI prompts library
- [ ] Build AI chat assistant component
- [ ] Implement tool-calling for resume modifications
- [ ] Add text import (paste text → structured resume)

### Phase 5: ATS Scoring & Tailoring (Day 7)
- [ ] Build ATS scoring algorithm
- [ ] Create resume tailoring for specific jobs
- [ ] Add keyword optimization suggestions
- [ ] Integrate with existing job matching pipeline

### Phase 6: Templates & Polish (Day 8)
- [ ] Create 3 resume templates (Modern, Classic, Minimal)
- [ ] Add template switcher
- [ ] Mobile responsive design
- [ ] Error handling + loading states

---

## 5. Key Dependencies

```json
{
  "dependencies": {
    "ai": "^4.0.23",
    "@ai-sdk/openai": "^1.0.12",
    "@ai-sdk/anthropic": "^1.0.6",
    "@react-pdf/renderer": "^4.1.6",
    "zod": "^3.24.1",
    "framer-motion": "^11.15.0",
    "@tiptap/react": "^2.11.0",
    "react-beautiful-dnd": "^13.1.1"
  }
}
```

---

## 6. Environment Variables

```env
# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: OpenRouter for more model choices
OPENROUTER_API_KEY=sk-or-...
```

---

## 7. Integration with Existing Pipeline

The resume maker integrates with the existing job application pipeline:

```
Job Discovery → Resume Upload/Create → AI Tailoring → Application → Outreach
                      ↑                       ↑
               [Resume Maker]         [Resume Tailoring]
```

- **Base Resume**: User creates a comprehensive base resume
- **Tailored Resume**: For each job application, system creates a tailored version
- **Match Score**: AI scores resume-job fit
- **Gap Analysis**: Identifies missing skills/experience

---

## 8. Notes

- **License**: resume-lm is AGPL-3.0. We're using it as reference only, not copying code directly.
- **Simplification**: We skip Supabase (use our existing Drizzle + PostgreSQL setup).
- **Simplification**: We skip Stripe/subscription (not needed for our use case).
- **Enhancement**: We integrate with our existing job scraping + application pipeline.
- **Enhancement**: We use our existing auth system instead of Supabase Auth.
