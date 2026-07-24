import { jsPDF } from "jspdf";

export interface PDFOptions {
  title?: string;
  fontSize?: number;
  pageSize?: "A4" | "Letter";
}

export async function generatePDF(
  htmlContent: string,
  options: PDFOptions = {},
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: options.pageSize === "Letter" ? "letter" : "a4",
  });

  const baseFontSize = options.fontSize ?? 11;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72; // Standard 1-inch margin for ATS
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Parse HTML structure
  const sections = htmlContent.split(/<h2[^>]*class="section-title"[^>]*>/i);
  
  // Extract name and contact from header
  const nameMatch = htmlContent.match(/<h1[^>]*class="name"[^>]*>(.*?)<\/h1>/i);
  const contactMatches = htmlContent.match(/<p[^>]*class="contact"[^>]*>(.*?)<\/p>/gi);
  
  if (nameMatch) {
    const name = nameMatch[1]!.replace(/<[^>]+>/g, "");
    doc.setFontSize(24);
    doc.setFont("times", "bold");
    doc.setTextColor(0, 0, 0);
    checkPageBreak(30);
    doc.text(name, margin, y);
    y += 14;
  }
  
  if (contactMatches && contactMatches.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const contactText = contactMatches
      .map(c => c.replace(/<[^>]+>/g, ""))
      .join(" | ");
    checkPageBreak(15);
    doc.text(contactText, margin, y);
    y += 10;
  }
  
  // Check for summary/professional profile
  const summaryMatch = htmlContent.match(/<p[^>]*class="summary"[^>]*>(.*?)<\/p>/i);
  if (summaryMatch) {
    const summary = summaryMatch[1]!.replace(/<[^>]+>/g, "");
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    checkPageBreak(20);
    const wrappedSummary = doc.splitTextToSize(summary, maxWidth);
    for (const line of wrappedSummary) {
      doc.text(line, margin, y);
      y += baseFontSize + 4;
    }
    y += 10;
  }
  
  y += 8;

  // Process each section
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i]!;
    
    // Extract section title
    const titleEndMatch = section.match(/<\/h2>/i);
    if (!titleEndMatch) continue;
    
    const sectionTitle = section.substring(0, titleEndMatch.index).replace(/<[^>]+>/g, "").trim();
    
    // Section title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    checkPageBreak(20);
    doc.text(sectionTitle.toUpperCase(), margin, y);
    y += 8;
    
    // Extract section content
    const contentMatch = section.match(/<div[^>]*class="section-content"[^>]*>([\s\S]*?)<\/div>/i);
    if (!contentMatch) continue;
    
    const content = contentMatch[1]!;
    
    // Check if it's skills section (comma-separated)
    if (sectionTitle.toLowerCase().includes("skill")) {
      const skillsText = content.replace(/<[^>]+>/g, "").trim();
      doc.setFontSize(baseFontSize);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      const wrappedSkills = doc.splitTextToSize(skillsText, maxWidth);
      for (const line of wrappedSkills) {
        checkPageBreak(baseFontSize + 4);
        doc.text(line, margin, y);
        y += baseFontSize + 4;
      }
    } 
    // Check if it's experience section (job blocks)
    else if (sectionTitle.toLowerCase().includes("experience") || 
             sectionTitle.toLowerCase().includes("employment") ||
             sectionTitle.toLowerCase().includes("work")) {
      const jobBlocks = content.split(/<div[^>]*class="job"[^>]*>/i);
      
      for (let j = 1; j < jobBlocks.length; j++) {
        const job = jobBlocks[j]!;
        
        // Extract job header
        const headerMatch = job.match(/<div[^>]*class="job-header"[^>]*>(.*?)<\/div>/i);
        if (headerMatch) {
          const header = headerMatch[1]!.replace(/<[^>]+>/g, "").trim();
          doc.setFontSize(baseFontSize + 1);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          checkPageBreak(baseFontSize + 10);
          doc.text(header, margin, y);
          y += baseFontSize + 6;
        }
        
        // Extract bullet points
        const listItems = job.match(/<li[^>]*>(.*?)<\/li>/gi);
        if (listItems) {
          doc.setFontSize(baseFontSize);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);
          
          for (const item of listItems) {
            const text = item.replace(/<[^>]+>/g, "").trim();
            const wrappedText = doc.splitTextToSize(text, maxWidth - 15);
            
            for (let k = 0; k < wrappedText.length; k++) {
              checkPageBreak(baseFontSize + 4);
              if (k === 0) {
                doc.text("•", margin + 8, y);
                doc.text(wrappedText[k], margin + 15, y);
              } else {
                doc.text(wrappedText[k], margin + 15, y);
              }
              y += baseFontSize + 4;
            }
          }
          y += 6;
        }
      }
    }
    // Education or other sections
    else if (sectionTitle.toLowerCase().includes("education")) {
      const eduItems = content.match(/<p[^>]*class="education"[^>]*>(.*?)<\/p>/gi);
      if (eduItems) {
        doc.setFontSize(baseFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        for (const item of eduItems) {
          const text = item.replace(/<[^>]+>/g, "").trim();
          checkPageBreak(baseFontSize + 4);
          const wrappedText = doc.splitTextToSize(text, maxWidth);
          for (const line of wrappedText) {
            doc.text(line, margin, y);
            y += baseFontSize + 4;
          }
          y += 4;
        }
      }
    }
    // Generic sections with bullet points
    else {
      const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gi);
      if (listItems) {
        doc.setFontSize(baseFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        
        for (const item of listItems) {
          const text = item.replace(/<[^>]+>/g, "").trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth - 15);
          
          for (let k = 0; k < wrappedText.length; k++) {
            checkPageBreak(baseFontSize + 4);
            if (k === 0) {
              doc.text("•", margin + 8, y);
              doc.text(wrappedText[k], margin + 15, y);
            } else {
              doc.text(wrappedText[k], margin + 15, y);
            }
            y += baseFontSize + 4;
          }
        }
      }
    }
    
    y += 8;
  }

  const pdfOutput = doc.output("arraybuffer");
  return Buffer.from(pdfOutput);
}