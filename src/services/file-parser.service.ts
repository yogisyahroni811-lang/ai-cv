import { Injectable } from '@angular/core';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import mammoth from 'mammoth';

@Injectable({
  providedIn: 'root'
})
export class FileParserService {
  private pdfJs: any;

  constructor() {
    // Initialize PDF JS
    this.pdfJs = (pdfjsLib as any).default || pdfjsLib;
    
    if (this.pdfJs && this.pdfJs.GlobalWorkerOptions) {
      this.pdfJs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  async parseFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
      // PDF
      if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await this.extractPdfText(file);
      }
      
      // Word
      if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')
      ) {
        return await this.extractDocxText(file);
      }

      // Default to text
      return await file.text();

    } catch (error) {
      console.error('File parsing error:', error);
      throw new Error(`Failed to read file: ${(error as any).message}`);
    }
  }

  private async extractPdfText(file: File): Promise<string> {
    if (!this.pdfJs) {
      throw new Error('PDF library not initialized.');
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = this.pdfJs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate over all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      let pageText = '';
      let lastY = -1;

      // Simple heuristic: if Y changes significantly, insert newline.
      // Note: items are not always guaranteed to be in reading order by pdf.js, 
      // but usually they are close enough for basic extraction.
      for (const item of items) {
        const str = item.str;
        if (!str || str.trim() === '') continue;

        // transform[5] is the Y translation
        const y = item.transform ? item.transform[5] : 0;

        if (lastY !== -1 && Math.abs(y - lastY) > 6) {
          // Significant vertical gap -> New line
          pageText += '\n' + str;
        } else {
          // Same line -> Append with space if needed
          if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
             pageText += ' ';
          }
          pageText += str;
        }
        lastY = y;
      }
      
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  }

  private async extractDocxText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // Handle potential default export for mammoth
    const mammothLib = (mammoth as any).default || mammoth;

    // Extract raw text from docx
    const result = await mammothLib.extractRawText({ arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
      console.warn('Mammoth messages:', result.messages);
    }
    
    return result.value;
  }
}