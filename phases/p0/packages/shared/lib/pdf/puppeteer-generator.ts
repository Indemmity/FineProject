import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface PuppeteerPDFOptions {
  data: ResumeData;
  template?: 'modern' | 'classic' | 'minimal';
}

export interface ResumeData {
  name: string;
  contact: string;
  summary: string;
  experience: string;
  education: string;
  skills: string;
}

export async function generatePDFWithPuppeteer(
  options: PuppeteerPDFOptions,
): Promise<Buffer> {
  const { data, template } = options;
  
  // Determine which template to use
  const templateName = template || 'professional';
  
  // Load template - handle path resolution for different environments
  let templatePath: string;
  try {
    // Try relative path first
    templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.html`
    );
    if (!fs.existsSync(templatePath)) {
      // Try absolute path from package root
      /*turbopackIgnore: true*/
      templatePath = path.join(
        process.cwd(),
        'phases',
        'p0',
        'packages',
        'shared',
        'lib',
        'pdf',
        'templates',
        `${templateName}.html`
      );
    }
  } catch (error) {
    throw new Error(`Could not resolve template path: ${error}`);
  }
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace placeholders with data
  html = html.replace('{{name}}', data.name);
  html = html.replace('{{contact}}', data.contact);
  html = html.replace('{{summary}}', data.summary);
  html = html.replace('{{experience}}', data.experience);
  html = html.replace('{{education}}', data.education);
  html = html.replace('{{skills}}', data.skills);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set content and generate PDF
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  
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
}
