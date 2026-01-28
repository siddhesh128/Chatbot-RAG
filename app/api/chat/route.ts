import { NextRequest, NextResponse } from 'next/server';
import { queryCollection } from '@/lib/chroma';
import { generateResponse } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    // Query Chroma for relevant documents
    const searchResults = await queryCollection('RAGAI_v2', message, 5);

    // Extract relevant context from search results
    let context = '';
    if (searchResults.documents && searchResults.documents.length > 0) {
      context = searchResults.documents[0].join('\n\n---\n\n');
    }

    if (!context) {
      return NextResponse.json({
        response:
          "I don't have any documents loaded yet. Please upload a document first to get started.",
        context: '',
        sources: [],
      });
    }

    // Generate response using Gemini
    const response = await generateResponse(message, context);

    // Extract source metadata
    const sources =
      searchResults.metadatas && searchResults.metadatas.length > 0
        ? searchResults.metadatas[0].slice(0, 3).map((meta: any) => ({
            fileName: meta.fileName,
            chunkIndex: meta.chunkIndex,
          }))
        : [];

    return NextResponse.json({
      response,
      context,
      sources,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: String(error) },
      { status: 500 }
    );
  }
}
