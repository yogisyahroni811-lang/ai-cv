import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  generatePdf(content: string, filename: string = 'Optimized_CV.pdf') {
    const doc = new jsPDF();
    
    // Page configurations
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Font Config
    const setNormalFont = () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(40);
    };
    
    const setHeaderFont = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);
    };

    setNormalFont();

    // Clean up content: Normalize newlines
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const lines = normalizedContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Page break check (leave 20mm buffer at bottom)
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Handle empty lines (Spacing)
      if (!line) {
        yPosition += 6; // Standard gap
        continue;
      }

      // 1. Headers (### Header)
      // Also catch if AI used **Header** style by mistake
      if (line.startsWith('###') || (line.startsWith('**') && line.endsWith('**') && line.length < 40)) {
        const headerText = line.replace(/###/g, '').replace(/\*\*/g, '').trim();
        
        yPosition += 4; // Add a little space before header
        setHeaderFont();
        doc.text(headerText, margin, yPosition);
        yPosition += 8; // Space after header
        
        setNormalFont();
        continue;
      }

      // 2. Bullet Points
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        // Clean markdown bolding in bullets (**text**)
        let bulletContent = line.replace(/^[-*•]\s*/, '').trim();
        bulletContent = bulletContent.replace(/\*\*/g, ''); 

        const splitBullet = doc.splitTextToSize(bulletContent, maxLineWidth - 5);
        
        doc.text('•', margin, yPosition); // Bullet char
        doc.text(splitBullet, margin + 5, yPosition); // Indented text
        
        yPosition += (splitBullet.length * 5) + 3;
        continue;
      }

      // 3. Normal Text / Paragraphs
      // Remove any accidental bold markdown
      line = line.replace(/\*\*/g, '');
      const splitText = doc.splitTextToSize(line, maxLineWidth);
      doc.text(splitText, margin, yPosition);
      yPosition += (splitText.length * 5) + 2;
    }

    doc.save(filename);
  }
}