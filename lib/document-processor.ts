export async function extractTextFromFile(
  fileBuffer: ArrayBuffer | string,
  fileName: string
): Promise<string> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'pdf':
        return await extractPdfText(fileBuffer as ArrayBuffer);
      case 'docx':
        return await extractDocxText(fileBuffer as ArrayBuffer);
      case 'txt':
      case 'md':
        return typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder().decode(fileBuffer);
      case 'json':
        try {
          const text =
            typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder().decode(fileBuffer);
          const parsed = JSON.parse(text);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder().decode(fileBuffer);
        }
      case 'csv':
        return typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder().decode(fileBuffer);
      default:
        return typeof fileBuffer === 'string' ? fileBuffer : new TextDecoder().decode(fileBuffer);
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(
      `Failed to extract text from ${extension?.toUpperCase() || 'file'}: ${String(error)}`
    );
  }
}

async function extractPdfText(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const PDFParser = (await import('pdf2json')).default;
    const buffer = Buffer.from(fileBuffer);

    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(errData.parserError));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          const textParts: string[] = [];

          // Extract text from each page
          if (pdfData.Pages) {
            for (const page of pdfData.Pages) {
              if (page.Texts) {
                for (const text of page.Texts) {
                  if (text.R) {
                    for (const r of text.R) {
                      if (r.T) {
                        // Safely decode URI-encoded text
                        try {
                          textParts.push(decodeURIComponent(r.T));
                        } catch {
                          // If decoding fails, use the text as-is
                          textParts.push(r.T);
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          const extractedText = textParts.join(' ').replace(/\s+/g, ' ').trim();

          if (!extractedText || extractedText.length < 10) {
            reject(new Error('PDF contains no extractable text'));
          } else {
            resolve(extractedText);
          }
        } catch (error) {
          reject(error);
        }
      });

      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${String(error)}`);
  }
}

async function extractDocxText(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
    return result.value;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to parse DOCX: ${String(error)}`);
  }
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.substring(start, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
  }

  return chunks.length > 0 ? chunks : [text];
}

export function generateDocumentId(fileName: string, chunkIndex: number): string {
  return `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_chunk_${chunkIndex}`;
}
