// ChromaDB Cloud integration
import { CloudClient, Collection, Metadata, EmbeddingFunction } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Create a custom Gemini embedding function class
class GeminiEmbeddingFunction implements EmbeddingFunction {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  }

  public async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const result = await this.model.embedContent(text);
      embeddings.push(result.embedding.values);
    }
    return embeddings;
  }
}

// Create embedding function instance
const embeddingFunction = new GeminiEmbeddingFunction();

// Log environment variables for debugging
console.log('[v0] ChromaDB Config:', {
  hasApiKey: !!process.env.CHROMA_API_KEY,
  hasTenant: !!process.env.CHROMA_TENANT,
  hasDatabase: !!process.env.CHROMA_DATABASE,
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  tenant: process.env.CHROMA_TENANT,
  database: process.env.CHROMA_DATABASE,
});

// Initialize ChromaDB Cloud client
const chromaClient = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY!,
  tenant: process.env.CHROMA_TENANT!,
  database: process.env.CHROMA_DATABASE!,
});

let collection: Collection | null = null;
let currentCollectionName: string | null = null;

export async function createOrGetCollection(collectionName: string) {
  if (!collection || currentCollectionName !== collectionName) {
    console.log('[v0] Getting or creating collection:', collectionName);

    // Reset collection to null to force recreation
    collection = null;

    try {
      // First, try to delete if it exists with wrong config
      await chromaClient.deleteCollection({ name: collectionName });
      console.log('[v0] Deleted existing collection');
    } catch (e) {
      console.log('[v0] No existing collection to delete');
    }

    // Create new collection with Gemini embedding function
    collection = await chromaClient.createCollection({
      name: collectionName,
      embeddingFunction: embeddingFunction,
    });

    currentCollectionName = collectionName;
    console.log('[v0] Collection created:', collectionName);
    console.log('[v0] Collection ready:', collectionName);
  }
  return collection;
}

export async function addDocumentsToCollection(
  collectionName: string,
  documents: string[],
  ids: string[],
  metadatas?: Record<string, any>[]
) {
  const collection = await createOrGetCollection(collectionName);

  try {
    if (documents.length === 0) {
      throw new Error('No documents to add');
    }

    if (ids.length !== documents.length) {
      throw new Error('IDs and documents length mismatch');
    }

    console.log('[v0] Adding', documents.length, 'documents to collection:', collectionName);

    // Add documents - ChromaDB will use the embedding function automatically
    await collection.add({
      ids: ids,
      documents: documents,
      metadatas: metadatas,
    });

    console.log('[v0] Successfully added documents to ChromaDB collection');
  } catch (error) {
    console.error('[v0] Error adding documents:', error);
    throw new Error(`Failed to add documents to collection: ${String(error)}`);
  }
}

export async function queryCollection(collectionName: string, query: string, nResults: number = 3) {
  const collection = await createOrGetCollection(collectionName);

  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    console.log('[v0] Querying ChromaDB collection:', collectionName, 'Query:', query);

    // Query collection - ChromaDB will use the embedding function automatically
    const results = await collection.query({
      queryTexts: [query],
      nResults: nResults,
    });

    console.log('[v0] Query results found:', results.documents[0]?.length || 0, 'documents');

    return results;
  } catch (error) {
    console.error('[v0] Error querying collection:', error);
    throw new Error(`Failed to query collection: ${String(error)}`);
  }
}
