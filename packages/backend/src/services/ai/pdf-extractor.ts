import { PDFParse } from 'pdf-parse';
import type { LoadParameters } from 'pdf-parse';

export interface PDFExtractionResult {
  text: string;
  pages: number;
  info: {
    Title?: string;
    Author?: string;
    Producer?: string;
    CreationDate?: string;
  };
}

/**
 * Extract text content from PDF buffer.
 * Uses pdf-parse library for text-based PDFs.
 * 
 * Note: This approach works best for text-based PDFs.
 * Complex layouts (multi-column, tables) may have degraded accuracy.
 * Scanned PDFs (image-based) will return empty or garbled text.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const options: LoadParameters & { disableWorker?: boolean } = {
      data: buffer,
      disableWorker: true,
    };
    const parser = new PDFParse(options);
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    await parser.destroy();

    return {
      text: textResult.text,
      pages: textResult.total,
      info: {
        Title: infoResult.info?.Title,
        Author: infoResult.info?.Author,
        Producer: infoResult.info?.Producer,
        CreationDate: infoResult.info?.CreationDate,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
    throw new Error('Failed to extract PDF text: Unknown error');
  }
}

/**
 * Validate PDF buffer before extraction.
 */
export function isPDFBuffer(buffer: Buffer): boolean {
  // Check for PDF header signature: %PDF
  const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(pdfHeader);
}
