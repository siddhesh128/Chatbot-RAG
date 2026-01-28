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

    console.log('[v0] Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Read file as ArrayBuffer for binary files or text for text files
    let fileContent: ArrayBuffer | string;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (['pdf', 'docx'].includes(extension || '')) {
      console.log('[v0] Reading', extension, 'as binary buffer');
      fileContent = await file.arrayBuffer();
    } else {
      console.log('[v0] Reading as text');
      fileContent = await file.text();
    }

    console.log('[v0] File read successfully, extracting text...');

    // Extract text from file
    const extractedText = await extractTextFromFile(fileContent, file.name);

    console.log('[v0] Text extracted, length:', extractedText.length, 'characters');

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({ error: 'No text content found in document' }, { status: 400 });
    }

    console.log('[v0] Chunking text...');

    // Split into chunks
    const chunks = chunkText(extractedText);

    console.log('[v0] Created', chunks.length, 'chunks');

    // Prepare data for Chroma
    const ids = chunks.map((_, index) => generateDocumentId(file.name, index));
    const metadatas = chunks.map((_, index) => ({
      fileName: file.name,
      chunkIndex: index,
      totalChunks: chunks.length,
    }));

    console.log('[v0] Adding documents to Chroma...');

    // Add to Chroma collection
    await addDocumentsToCollection('RAGAI_v2', chunks, ids, metadatas);

    console.log('[v0] Successfully uploaded:', file.name, 'Chunks:', chunks.length);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      chunksAdded: chunks.length,
      message: `Document "${file.name}" uploaded and processed successfully`,
    });
  } catch (error) {
    console.error('[v0] Upload error:', error);
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
