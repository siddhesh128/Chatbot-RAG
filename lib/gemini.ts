import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateResponse(
  userQuery: string,
  context: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `You are a helpful assistant that answers questions based on the provided context. 
If the context doesn't contain information to answer the question, say you don't have enough information.
Keep your answers concise and relevant to the question.`;

    const message = `Context:\n${context}\n\nQuestion: ${userQuery}\n\nProvide a helpful answer based on the context above.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${message}` }],
        },
      ],
    });

    const response = result.response.text();
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    throw error;
  }
}
