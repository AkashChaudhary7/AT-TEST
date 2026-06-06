/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from "../types";

// Common stop words to exclude from index weighting for better relevance
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
  "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd",
  "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
  "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't",
  "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too",
  "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
  "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
  "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

/**
 * Tokenize a string into unique words, removing punctuation and filtering stop words.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

/**
 * High-performance client-side query indexing engine. Matches search terms against weighted target fields:
 * - Exact Match on Term: Weight 100
 * - In targetExam / subject: Weight 40
 * - In topic / subtopic: Weight 25
 * - In main question text: Weight 15
 * - In explanation text: Weight 5
 */
export function indexAndSearchQuestions(
  questions: Question[],
  queryText: string,
  subjectFilter: string = "all",
  difficultyFilter: string = "all",
  examFilter: string = "all"
): Question[] {
  // Pre-filter based on active filter settings to limit indexing overhead
  const candidates = questions.filter(q => {
    if (subjectFilter !== "all" && q.subject !== subjectFilter) return false;
    if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
    if (examFilter !== "all" && q.targetExam !== examFilter) return false;
    return true;
  });

  const query = queryText.toLowerCase().trim();
  if (!query) {
    return candidates;
  }

  // Tokenize the query terms
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // If query was all stop words, fall back to simple substring match
    return candidates.filter(q => 
      `${q.question} ${q.topic} ${q.subject}`.toLowerCase().includes(query)
    );
  }

  const results: SearchResult<Question>[] = [];

  for (const q of candidates) {
    let score = 0;

    const questionLower = q.question.toLowerCase();
    const topicLower = q.topic.toLowerCase();
    const subtopicLower = q.subtopic.toLowerCase();
    const subjectLower = q.subject.toLowerCase();
    const examLower = q.targetExam.toLowerCase();
    const explanationLower = q.explanation.toLowerCase();

    // 1. Exact phrase matches (Very high weight)
    if (questionLower.includes(query)) score += 150;
    if (topicLower.includes(query)) score += 100;
    if (subjectLower.includes(query)) score += 50;

    // 2. Token-based matching
    for (const term of queryTokens) {
      if (examLower.includes(term)) score += 40;
      if (subjectLower.includes(term)) score += 40;
      
      if (topicLower.includes(term)) score += 25;
      if (subtopicLower.includes(term)) score += 20;

      if (questionLower.includes(term)) {
        score += 15;
        // Boost score if term occurs frequent in question (Term Frequency)
        const occurrences = questionLower.split(term).length - 1;
        score += occurrences * 5;
      }

      if (explanationLower.includes(term)) score += 5;
    }

    if (score > 0) {
      results.push({ item: q, score });
    }
  }

  // Sort candidates from highest score to lowest relevance
  return results.sort((a, b) => b.score - a.score).map(r => r.item);
}
