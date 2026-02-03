import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, CvAnalysisResult } from './services/gemini.service';
import { FileParserService } from './services/file-parser.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private fileParserService = inject(FileParserService);
  private pdfGeneratorService = inject(PdfGeneratorService);

  // State Signals
  step = signal<'input' | 'analyzing' | 'result'>('input');
  cvText = signal<string>('');
  jobDesc = signal<string>('');
  analysisResult = signal<CvAnalysisResult | null>(null);
  errorMessage = signal<string | null>(null);
  isLoadingFile = signal<boolean>(false);
  
  // Language State
  language = signal<'Indonesian' | 'English'>('Indonesian');

  // Translations
  t = computed(() => {
    const isId = this.language() === 'Indonesian';
    return {
      appTitle: isId ? 'Review & Optimasi CV' : 'CV Match & Optimizer',
      startNew: isId ? 'Analisis Baru' : 'Start New Analysis',
      heroTitle: isId ? 'Optimalkan CV Anda untuk Pekerjaan Apapun' : 'Optimize your CV for any job',
      heroDesc: isId ? 'Tempel CV dan deskripsi pekerjaan untuk mendapatkan umpan balik AI instan, resume yang disesuaikan, dan persiapan wawancara.' : 'Paste your CV and the job description to get instant AI feedback, a tailored resume, and interview prep.',
      
      labelCv: isId ? 'CV / Resume Anda' : 'Your CV / Resume',
      btnImport: isId ? 'Impor PDF / Word / Teks' : 'Import PDF / Word / Text',
      processing: isId ? 'Memproses...' : 'Processing...',
      phCvLoading: isId ? 'Mengekstrak teks dari file...' : 'Extracting text from file...',
      phCv: isId ? 'Tempel isi CV di sini...' : 'Paste your CV content here...',
      
      labelJob: isId ? 'Deskripsi Pekerjaan' : 'Job Description',
      phJob: isId ? 'Tempel deskripsi pekerjaan di sini (persyaratan, tanggung jawab)...' : 'Paste the job description here (requirements, responsibilities)...',
      
      btnAnalyze: isId ? 'Analisis & Cocokkan' : 'Analyze & Match',
      
      analyzingTitle: isId ? 'Menganalisis Kecocokan...' : 'Analyzing Compatibility...',
      analyzingDesc: isId ? 'AI sedang meninjau pengalaman Anda, membuat surat lamaran, dan menyiapkan pertanyaan wawancara...' : 'Our AI is reviewing your experience, crafting a cover letter, and preparing interview questions...',
      
      summaryTitle: isId ? 'Ringkasan Analisis' : 'Analysis Summary',
      matchLabel: isId ? 'Kecocokan' : 'Match',
      
      tabAnalysis: isId ? 'Analisis' : 'Analysis',
      tabOptimized: isId ? 'CV Teroptimasi' : 'Optimized CV',
      tabCoverLetter: isId ? 'Surat Lamaran' : 'Cover Letter',
      tabInterview: isId ? 'Wawancara' : 'Interview Prep',
      
      sectStrengths: isId ? 'Kekuatan' : 'Strengths',
      sectWeaknesses: isId ? 'Kelemahan & Celah' : 'Gaps & Weaknesses',
      sectMissing: isId ? 'Kata Kunci Hilang' : 'Missing Keywords',
      noMissing: isId ? 'Tidak ada kata kunci utama yang hilang!' : 'No major keywords missing!',
      
      suggestionTitle: isId ? 'Saran CV yang Disesuaikan' : 'Tailored CV Suggestion',
      coverLetterTitle: isId ? 'Surat Lamaran yang Disarankan' : 'Suggested Cover Letter',
      interviewTitle: isId ? 'Prediksi Pertanyaan Wawancara' : 'Predicted Interview Questions',
      interviewContext: isId ? 'Mengapa ditanyakan?' : 'Why is this asked?',
      interviewTips: isId ? 'Tips Jawaban' : 'Answer Tips',
      
      copyBtn: isId ? 'Salin Teks' : 'Copy Text',
      downloadBtn: isId ? 'Unduh PDF' : 'Download PDF',
      
      errFile: isId ? 'Gagal membaca file: ' : 'Could not read file: ',
      errGeneric: isId ? 'Gagal menganalisis CV. Silakan coba lagi.' : 'Failed to analyze CV. Please try again.',
      manualCopy: isId ? '. Silakan coba salin teks secara manual.' : '. Please try copying the text manually.',
      
      templateNote: isId 
        ? 'Catatan: PDF akan diunduh dengan format standar bersih. Desain asli tidak dapat dipertahankan karena ekstraksi teks.'
        : 'Note: PDF will be downloaded in a clean standard format. Original design cannot be preserved due to text extraction.'
    };
  });

  // Computed
  hasData = computed(() => this.cvText().length > 20 && this.jobDesc().length > 20);
  
  scoreColor = computed(() => {
    const score = this.analysisResult()?.matchScore || 0;
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  });

  activeTab = signal<'analysis' | 'optimized' | 'coverLetter' | 'interview'>('analysis');

  async handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.isLoadingFile.set(true);
    this.errorMessage.set(null);

    try {
      const text = await this.fileParserService.parseFile(file);
      if (!text || text.trim().length === 0) {
        throw new Error("The file appears to be empty or text could not be extracted.");
      }
      this.cvText.set(text);
    } catch (e: any) {
      console.error(e);
      this.errorMessage.set(`${this.t().errFile}${e.message || 'Unknown error'}${this.t().manualCopy}`);
    } finally {
      this.isLoadingFile.set(false);
      // Reset input so same file can be selected again if needed
      input.value = '';
    }
  }

  async analyze() {
    if (!this.hasData()) return;

    this.step.set('analyzing');
    this.errorMessage.set(null);

    try {
      const result = await this.geminiService.analyzeAndOptimize(
        this.cvText(), 
        this.jobDesc(),
        this.language()
      );
      this.analysisResult.set(result);
      this.step.set('result');
    } catch (error) {
      console.error(error);
      this.errorMessage.set(this.t().errGeneric);
      this.step.set('input');
    }
  }

  reset() {
    this.step.set('input');
    this.analysisResult.set(null);
    this.activeTab.set('analysis');
  }

  copyToClipboard(text: string | undefined) {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }

  downloadOptimizedCv() {
    const text = this.analysisResult()?.optimizedCv;
    if (text) {
      this.pdfGeneratorService.generatePdf(text, 'Optimized_CV.pdf');
    }
  }

  downloadCoverLetter() {
    const text = this.analysisResult()?.coverLetter;
    if (text) {
      this.pdfGeneratorService.generatePdf(text, 'Cover_Letter.pdf');
    }
  }
}