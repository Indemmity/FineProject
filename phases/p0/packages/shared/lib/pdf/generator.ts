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

  const baseFontSize = options.fontSize ?? 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
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
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102); // Dark blue
    checkPageBreak(30);
    doc.text(name, pageWidth / 2, y, { align: "center" });
    y += 12;
  }
  
  if (contactMatches && contactMatches.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    const contactText = contactMatches
      .map(c => c.replace(/<[^>]+>/g, ""))
      .join(" • ");
    checkPageBreak(20);
    doc.text(contactText, pageWidth / 2, y, { align: "center" });
    y += 8;
  }
  
  // Draw separator line
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Process each section
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i]!;
    
    // Extract section title
    const titleEndMatch = section.match(/<\/h2>/i);
    if (!titleEndMatch) continue;
    
    const sectionTitle = section.substring(0, titleEndMatch.index).replace(/<[^>]+>/g, "").trim();
    
    // Section title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    checkPageBreak(25);
    doc.text(sectionTitle.toUpperCase(), margin, y);
    y += 4;
    
    // Draw line under section title
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
    
    // Extract section content
    const contentMatch = section.match(/<div[^>]*class="section-content"[^>]*>([\s\S]*?)<\/div>/i);
    if (!contentMatch) continue;
    
    const content = contentMatch[1]!;
    
    // Check if it's skills section (comma-separated)
    if (sectionTitle.toLowerCase().includes("skill")) {
      const skillsText = content.replace(/<[^>]+>/g, "").trim();
      doc.setFontSize(baseFontSize);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      
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
          doc.setTextColor(40, 40, 40);
          checkPageBreak(baseFontSize + 12);
          doc.text(header, margin, y);
          y += baseFontSize + 6;
        }
        
        // Extract bullet points
        const listItems = job.match(/<li[^>]*>(.*?)<\/li>/gi);
        if (listItems) {
          doc.setFontSize(baseFontSize);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          
          for (const item of listItems) {
            const text = item.replace(/<[^>]+>/g, "").trim();
            const wrappedText = doc.splitTextToSize(text, maxWidth - 15);
            
            for (let k = 0; k < wrappedText.length; k++) {
              checkPageBreak(baseFontSize + 4);
              if (k === 0) {
                doc.text("•", margin + 5, y);
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
        doc.setTextColor(40, 40, 40);
        
        for (const item of eduItems) {
          const text = item.replace(/<[^>]+>/g, "").trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth);
          
          for (const line of wrappedText) {
            checkPageBreak(baseFontSize + 4);
            doc.text(line, margin, y);
            y += baseFontSize + 4;
          }
        }
      }
    }
    // Generic sections with bullet points
    else {
      const listItems = content.match(/<li[^>]*>(.*?)<\/li>/gi);
      if (listItems) {
        doc.setFontSize(baseFontSize);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        
        for (const item of listItems) {
          const text = item.replace(/<[^>]+>/g, "").trim();
          const wrappedText = doc.splitTextToSize(text, maxWidth - 15);
          
          for (let k = 0; k < wrappedText.length; k++) {
            checkPageBreak(baseFontSize + 4);
            if (k === 0) {
              doc.text("•", margin + 5, y);
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