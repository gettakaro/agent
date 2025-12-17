import OpenAI from 'openai';
import { config } from '../config.js';

const EMBEDDING_MODEL = 'qwen/qwen3-embedding-8b';
const EMBEDDING_DIMENSIONS = 1536; // pgvector index limit is 2000

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!config.openrouterApiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is required for knowledge base embeddings'
      );
    }
    client = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
  return client;
}

/**
 * Generate embedding for a single text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0]!;
}

/**
 * Generate embeddings for multiple texts in a batch.
 * More efficient than calling generateEmbedding multiple times.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Sort by index to ensure correct order
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Get the embedding model being used.
 */
export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}

/**
 * Get the embedding dimensions.
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}
