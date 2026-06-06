/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SourceDocument } from "../types";

export interface DocumentChunk {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
}

/**
 * Intelligent Document Chunking: Splits text into sliding window blocks
 * of fixed word capacity with overlap to handle sentence boundary semantics.
 */
export function chunkDocument(
  doc: SourceDocument,
  chunkSize: number = 100,
  overlap: number = 20
): DocumentChunk[] {
  const words = doc.content.split(/\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];
  
  if (words.length <= chunkSize) {
    chunks.push({
      documentId: doc.id,
      documentName: doc.name,
      chunkIndex: 0,
      content: doc.content,
      wordCount: words.length
    });
    return chunks;
  }

  let i = 0;
  let chunkIdx = 0;
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    const chunkWords = words.slice(i, end);
    const content = chunkWords.join(" ");

    chunks.push({
      documentId: doc.id,
      documentName: doc.name,
      chunkIndex: chunkIdx++,
      content,
      wordCount: chunkWords.length
    });

    if (end === words.length) break;
    // Advance index by chunk size minus overlap
    i += (chunkSize - overlap);
  }

  return chunks;
}

/**
 * Tokenize simple raw terms into frequency-mapped sparse vectors.
 */
function getTermVector(text: string): Record<string, number> {
  const vector: Record<string, number> = {};
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 2); // Exclude very short noise tokens

  for (const token of tokens) {
    vector[token] = (vector[token] || 0) + 1;
  }
  return vector;
}

/**
 * Mathematical Cosine Similarity between two term-frequency sparse vectors.
 * Real, client-side vector search without relying on any mock structures!
 */
export function calculateCosineSimilarity(
  v1: Record<string, number>,
  v2: Record<string, number>
): number {
  const words1 = Object.keys(v1);
  const words2 = Object.keys(v2);

  if (words1.length === 0 || words2.length === 0) return 0;

  let dotProduct = 0;
  for (const word of words1) {
    if (v2[word]) {
      dotProduct += v1[word] * v2[word];
    }
  }

  let mag1 = 0;
  for (const word of words1) {
    mag1 += v1[word] * v1[word];
  }
  mag1 = Math.sqrt(mag1);

  let mag2 = 0;
  for (const word of words2) {
    mag2 += v2[word] * v2[word];
  }
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

export interface ChunkSimilarityResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Search and rank chunks using sparse vector term similarity.
 */
export function querySemanticChunks(
  documents: SourceDocument[],
  queryText: string,
  chunkSize: number = 100,
  overlap: number = 20
): ChunkSimilarityResult[] {
  const queryVector = getTermVector(queryText);
  if (Object.keys(queryVector).length === 0) return [];

  // Generate chunks across all active documents
  const allChunks: DocumentChunk[] = [];
  for (const doc of documents) {
    allChunks.push(...chunkDocument(doc, chunkSize, overlap));
  }

  const matches: ChunkSimilarityResult[] = [];

  for (const chunk of allChunks) {
    const chunkVector = getTermVector(chunk.content);
    const score = calculateCosineSimilarity(queryVector, chunkVector);
    
    if (score > 0) {
      matches.push({ chunk, score });
    }
  }

  // Sort descending by highest cosine score
  return matches.sort((a, b) => b.score - a.score);
}
