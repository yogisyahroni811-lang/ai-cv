import { Injectable } from '@angular/core';
import { GoogleGenAI, Type, SchemaType } from '@google/genai';

export interface InterviewQuestion {
  question: string;
  context: string;
  answerTips: string[];
}

export interface CvAnalysisResult {
  matchScore: number;
  summary: string;
  pros: string[];
  cons: string[];
  missingKeywords: string[];
  optimizedCv: string;
  coverLetter: string;
  interviewQuestions: InterviewQuestion[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async analyzeAndOptimize(cvText: string, jobDescription: string, language: 'English' | 'Indonesian'): Promise<CvAnalysisResult> {
    
    const langInstruction = language === 'Indonesian' 
      ? 'IMPORTANT: Output response MUST be in INDONESIAN language (Bahasa Indonesia).' 
      : 'IMPORTANT: Output response MUST be in ENGLISH language.';

    const prompt = `
      You are an expert HR Specialist and Resume Optimizer. 
      Your task is to analyze a candidate's CV against a specific Job Description.

      LANGUAGE REQUIREMENT:
      ${langInstruction}

      JOB DESCRIPTION:
      ${jobDescription}

      CANDIDATE CV:
      ${cvText}

      Perform the following:
      1. Calculate a match score (0-100) based on skills, experience, and relevance.
      2. Write a brief executive summary of the fit.
      3. List specific Pros (why they fit).
      4. List specific Cons (gaps or weaknesses).
      5. Identify critical Keywords/Skills missing from the CV that are in the Job Description.
      6. Write an OPTIMIZED version of the CV.
      7. Write a PROFESSIONAL COVER LETTER tailored to this specific company and role.
      8. List 5 POTENTIAL INTERVIEW QUESTIONS with Context and Answer Tips.

      CRITICAL RULES FOR "OPTIMIZED CV":
      - **Integrity**: Do NOT invent skills/experience. Optimize what exists.
      - **Formatting**: You MUST follow the layout below EXACTLY to ensure it is readable.
      - **Headers**: Use "### " (Triple hash + space) for section headers.
      - **Spacing**: YOU MUST INSERT AN EMPTY LINE (Double Newline) BEFORE every Header and BETWEEN every Job Role.
      - **Clean Text**: Do NOT use bolding (**) inside the body text/bullets. Only use Markdown for Headers.

      REQUIRED LAYOUT STRUCTURE FOR OPTIMIZED CV:
      --------------------------------------------------
      [Candidate Name]
      [Contact Info]

      ### Summary
      [Optimized Summary Paragraph]

      ### Experience
      [Role Name] | [Company Name] | [Dates]
      - [Strong Action Verb] [Result/Achievement 1]
      - [Strong Action Verb] [Result/Achievement 2]
      
      [INSERT EMPTY LINE HERE]

      [Role Name] | [Company Name] | [Dates]
      - [Bullet point 1]
      - [Bullet point 2]

      ### Education
      [Degree] | [University]
      
      ### Skills
      - [Skill 1], [Skill 2], [Skill 3]
      --------------------------------------------------

      9. Return the result in the specified JSON format.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        matchScore: { type: Type.INTEGER, description: "A score from 0 to 100 indicating fit." },
        summary: { type: Type.STRING, description: "A 2-3 sentence summary of the candidate's suitability." },
        pros: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of strengths regarding this role." 
        },
        cons: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of weaknesses or gaps regarding this role." 
        },
        missingKeywords: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "Important keywords found in JD but missing in CV." 
        },
        optimizedCv: { 
          type: Type.STRING, 
          description: "The full text of the rewritten CV. MUST have blank lines between sections and jobs." 
        },
        coverLetter: {
          type: Type.STRING,
          description: "A professional cover letter text."
        },
        interviewQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              context: { type: Type.STRING, description: "Why this question is being asked." },
              answerTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key points to mention in the answer." }
            },
            required: ["question", "context", "answerTips"]
          },
          description: "List of 5 interview questions with context and tips."
        }
      },
      required: ["matchScore", "summary", "pros", "cons", "missingKeywords", "optimizedCv", "coverLetter", "interviewQuestions"]
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.3
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No response from AI');
      }

      return JSON.parse(text) as CvAnalysisResult;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
}