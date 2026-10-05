import { config } from '../config/env.js';
import { QuestionMetadata } from '../types/index.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarity: number;
  matchedQuestion?: string;
  matchedTopic?: string;
  matchType: 'none' | 'distinct_aspect' | 'semantic_duplicate' | 'exact_duplicate';
  reason: string;
}

export class DuplicateDetector {
  private threshold: number;

  constructor(threshold = config.duplicateSimilarityThreshold) {
    this.threshold = threshold;
  }

  /**
   * Tokenizes and normalizes text for vector computation
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }

  /**
   * Generates a term frequency vector representation
   */
  private getTermVector(tokens: string[]): Map<string, number> {
    const vector = new Map<string, number>();
    for (const token of tokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    return vector;
  }

  /**
   * Calculates cosine similarity between two term frequency vectors
   */
  public calculateCosineSimilarity(textA: string, textB: string): number {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const vecA = this.getTermVector(tokensA);
    const vecB = this.getTermVector(tokensB);

    const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const key of allKeys) {
      const valA = vecA.get(key) || 0;
      const valB = vecB.get(key) || 0;

      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Checks if candidate question is duplicate against previously asked questions
   */
  public checkDuplicate(
    candidateQuestion: string,
    candidateTopic: string,
    existingQuestions: QuestionMetadata[]
  ): DuplicateCheckResult {
    const cleanCandidate = candidateQuestion.trim().toLowerCase();

    let maxSimilarity = 0;
    let mostSimilarQuestion: QuestionMetadata | null = null;

    for (const prev of existingQuestions) {
      const cleanPrev = prev.question.trim().toLowerCase();

      // 1. Exact Duplicate
      if (cleanCandidate === cleanPrev) {
        return {
          isDuplicate: true,
          similarity: 1.0,
          matchedQuestion: prev.question,
          matchedTopic: prev.topic,
          matchType: 'exact_duplicate',
          reason: 'Identical question previously asked in this session.',
        };
      }

      // 2. Vector Cosine Similarity
      const similarity = this.calculateCosineSimilarity(candidateQuestion, prev.question);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        mostSimilarQuestion = prev;
      }
    }

    if (!mostSimilarQuestion) {
      return {
        isDuplicate: false,
        similarity: 0,
        matchType: 'none',
        reason: 'First question in session.',
      };
    }

    // Classify based on threshold
    if (maxSimilarity >= this.threshold) {
      return {
        isDuplicate: true,
        similarity: parseFloat(maxSimilarity.toFixed(3)),
        matchedQuestion: mostSimilarQuestion.question,
        matchedTopic: mostSimilarQuestion.topic,
        matchType: 'semantic_duplicate',
        reason: `Semantic duplicate detected (similarity ${Math.round(
          maxSimilarity * 100
        )}% >= ${Math.round(this.threshold * 100)}%). Both questions test essentially the same core concept.`,
      };
    }

    if (maxSimilarity >= 0.52) {
      return {
        isDuplicate: false,
        similarity: parseFloat(maxSimilarity.toFixed(3)),
        matchedQuestion: mostSimilarQuestion.question,
        matchedTopic: mostSimilarQuestion.topic,
        matchType: 'distinct_aspect',
        reason: `Related domain (${Math.round(
          maxSimilarity * 100
        )}% similarity), but probing a distinct technical subtopic. Approved.`,
      };
    }

    return {
      isDuplicate: false,
      similarity: parseFloat(maxSimilarity.toFixed(3)),
      matchType: 'none',
      reason: 'Distinct question topic. Approved.',
    };
  }
}

export const duplicateDetector = new DuplicateDetector();
