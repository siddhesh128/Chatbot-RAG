import { NextRequest, NextResponse } from 'next/server';
import { chunkText, extractTextFromFile, generateDocumentId } from '@/lib/document-processor';
import { addDocumentsToCollection } from '@/lib/chroma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as ArrayBuffer for binary files or text for text files
    let fileContent: ArrayBuffer | string;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (['pdf', 'docx'].includes(extension || '')) {
      fileContent = await file.arrayBuffer();
    } else {
      fileContent = await file.text();
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(fileContent, file.name);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'No text content found in document' }, { status: 400 });
    }

    // Split into chunks
    const chunks = chunkText(extractedText);

    // Prepare data for Chroma
    const ids = chunks.map((_, index) => generateDocumentId(file.name, index));
    const metadatas = chunks.map((_, index) => ({
      fileName: file.name,
      chunkIndex: index,
      totalChunks: chunks.length,
    }));

    // Add to Chroma collection
    await addDocumentsToCollection('RAGAI_v2', chunks, ids, metadatas);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunksAdded: chunks.length,
      message: `Document "${file.name}" uploaded and processed successfully`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to process document',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
