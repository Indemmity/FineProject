import puppeteer from 'puppeteer';

export interface JSONResumeData {
  basics: {
    name: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    location?: {
      address?: string;
      postalCode?: string;
      city?: string;
      countryCode?: string;
      region?: string;
    };
    profiles?: Array<{
      network: string;
      username: string;
      url: string;
    }>;
    summary?: string;
  };
  work?: Array<{
    company: string;
    position: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    courses?: string[];
  }>;
  skills?: Array<{
    name: string;
    keywords?: string[];
  }>;
}

export interface JSONResumePDFOrOptions {
  theme: string;
  data: JSONResumeData;
}

export async function generatePDFWithJSONResume(
  options: JSONResumePDFOrOptions,
): Promise<Buffer> {
  const { theme, data } = options;
  
  try {
    // Dynamically import the theme module
    const themeName = `jsonresume-theme-${theme}`;
    let themeModule;
    
    try {
      themeModule = require(themeName);
    } catch (importError) {
      // Try with @jsonresume prefix for official themes
      try {
        themeModule = require(`@jsonresume/theme-${theme}`);
      } catch (officialError) {
        throw new Error(`Theme ${themeName} not found. Please install it first.`);
      }
    }
    
    // Call the theme's render function
    const html = themeModule.render ? themeModule.render(data) : themeModule(data);
    
    if (typeof html !== 'string') {
      throw new Error(`Theme ${themeName} did not return HTML string`);
    }
    
    // Use puppeteer to convert HTML to PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true
    });
    
    await browser.close();
    
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('JSON Resume generation failed:', error);
    throw new Error(`Failed to generate PDF with JSON Resume theme: ${error}`);
  }
}

export function convertResumeToJSONResume(
  filename: string,
  text: string,
): JSONResumeData {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  // Extract name from filename
  const name = filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]/g, " ");
  
  const data: JSONResumeData = {
    basics: {
      name,
      summary: "",
    },
    work: [],
    education: [],
    skills: [],
  };
  
  let currentSection = "";
  let sectionContent: string[] = [];
  
  const sectionHeadings = [
    /summary|objective|profile/i,
    /experience|employment|work history/i,
    /education|academic/i,
    /skills|technical skills|competencies/i,
  ];
  
  const flushSection = () => {
    if (currentSection && sectionContent.length > 0) {
      const content = sectionContent.join("\n");
      
      if (currentSection.toLowerCase().includes("summary") || 
          currentSection.toLowerCase().includes("objective") ||
          currentSection.toLowerCase().includes("profile")) {
        data.basics.summary = content;
      } else if (currentSection.toLowerCase().includes("experience") || 
                 currentSection.toLowerCase().includes("employment") ||
                 currentSection.toLowerCase().includes("work")) {
        // Parse work experience
        let jobBlock: string[] = [];
        for (const line of sectionContent) {
          if (line.match(/^[A-Z][a-z]+ [A-Z]/) || line.includes(" at ") || line.includes("|") || 
              line.match(/\d{4}/) || line.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)) {
            if (jobBlock.length > 0) {
              const job = parseJobBlock(jobBlock);
              if (job) data.work!.push(job);
            }
            jobBlock = [line];
          } else {
            jobBlock.push(line);
          }
        }
        if (jobBlock.length > 0) {
          const job = parseJobBlock(jobBlock);
          if (job) data.work!.push(job);
        }
      } else if (currentSection.toLowerCase().includes("education")) {
        // Parse education
        for (const line of sectionContent) {
          const edu = parseEducationLine(line);
          if (edu) data.education!.push(edu);
        }
      } else if (currentSection.toLowerCase().includes("skill")) {
        // Parse skills
        const skills = content.split(/,|•|\n/).map(s => s.trim()).filter(s => s);
        data.skills = [{
          name: "Skills",
          keywords: skills
        }];
      }
      
      sectionContent = [];
    }
  };
  
  for (const line of lines) {
    const isHeading = sectionHeadings.some(re => re.test(line));
    
    if (isHeading && line.length < 50) {
      flushSection();
      currentSection = line;
    } else if (currentSection) {
      sectionContent.push(line);
    } else {
      // Before first section - collect contact info
      if (line.includes("@")) {
        data.basics.email = line;
      } else if (line.match(/\(\d{3}\)/) || line.includes("phone")) {
        data.basics.phone = line;
      } else if (line.includes("linkedin")) {
        data.basics.profiles = data.basics.profiles || [];
        data.basics.profiles.push({
          network: "LinkedIn",
          username: line,
          url: line
        });
      } else if (line.includes("http")) {
        data.basics.url = line;
      } else if (line.length > 20 && !line.match(/^[A-Z][a-z]+ [A-Z]/)) {
        // Likely summary/professional profile text
        data.basics.summary += (data.basics.summary ? " " : "") + line;
      }
    }
  }
  
  flushSection();
  
  return data;
}

function parseJobBlock(lines: string[]): any {
  if (lines.length === 0) return null;
  
  const header = lines[0];
  const bullets = lines.slice(1);
  
  // Try to extract company, position, and dates from header
  const parts = header.split(/ at | - | — |,/);
  
  let company = "";
  let position = "";
  let dates = "";
  
  if (parts.length >= 2) {
    position = parts[0]!.trim();
    company = parts.slice(1).join(" at ").trim();
  } else {
    position = header.trim();
  }
  
  return {
    company,
    position,
    summary: bullets.join("\n"),
    highlights: bullets.filter(b => b.trim().length > 0)
  };
}

function parseEducationLine(line: string): any {
  const parts = line.split(/ at | - | — |,/);
  
  if (parts.length >= 2) {
    return {
      institution: parts[1]!.trim(),
      area: parts[0]!.trim(),
      studyType: "Degree"
    };
  }
  
  return {
    institution: line.trim(),
    area: "",
    studyType: "Degree"
  };
}
