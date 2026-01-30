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
    collection = null;

    try {
      // Try to get existing collection first
      collection = await chromaClient.getCollection({
        name: collectionName,
        embeddingFunction: embeddingFunction,
      });
      currentCollectionName = collectionName;
    } catch (e) {
      // Collection doesn't exist, create a new one
      try {
        collection = await chromaClient.createCollection({
          name: collectionName,
          embeddingFunction: embeddingFunction,
        });
        currentCollectionName = collectionName;
      } catch (createError) {
        console.error('Error creating collection:', createError);
        throw createError;
      }
    }
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

    // Add documents - ChromaDB will use the embedding function automatically
    await collection.add({
      ids: ids,
      documents: documents,
      metadatas: metadatas,
    });
  } catch (error) {
    console.error('Error adding documents:', error);
    throw new Error(`Failed to add documents to collection: ${String(error)}`);
  }
}

export async function queryCollection(collectionName: string, query: string, nResults: number = 3) {
  const collection = await createOrGetCollection(collectionName);

  try {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Query collection - ChromaDB will use the embedding function automatically
    const results = await collection.query({
      queryTexts: [query],
      nResults: nResults,
    });

    return results;
  } catch (error) {
    console.error('Error querying collection:', error);
    throw new Error(`Failed to query collection: ${String(error)}`);
  }
}
