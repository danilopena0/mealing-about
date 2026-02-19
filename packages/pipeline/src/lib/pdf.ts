import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export async function extractPdfText(pdfUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch(pdfUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try native text extraction first
    try {
      const result = await pdfParse(buffer);
      if (result.text && result.text.length > 100) {
        return result.text;
      }
    } catch {
      // Text extraction failed, fall through to vision
    }

    // Fall back to Gemini Vision for scanned/image PDFs
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const base64 = buffer.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64,
        },
      },
      'Extract all menu items and their descriptions from this restaurant menu PDF. List every item with its name, description, and price if shown.',
    ]);

    const text = result.response.text();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
