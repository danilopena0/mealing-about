import pdfParse from 'pdf-parse';

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

    const result = await pdfParse(buffer);
    if (result.text && result.text.length > 100) {
      return result.text;
    }

    return null;
  } catch {
    return null;
  }
}
