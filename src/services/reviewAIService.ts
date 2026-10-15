import { GoogleGenAI, Type } from '@google/genai';
import type { ReviewAnalysis } from '../types/Review.js';

const model = 'gemini-2.5-flash';

let ai: GoogleGenAI | undefined;

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required to analyze reviews.');
  }

  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

function normalizeGeminiJson(text: string | undefined): string {
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Gemini returned an empty response.');
  }

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const prefixedMatch = trimmed.match(/^json\s+([\s\S]+)$/i);
  if (prefixedMatch) {
    return prefixedMatch[1].trim();
  }

  return trimmed;
}

function parseResponse(response: { text?: string } | undefined): unknown {
  try {
    return JSON.parse(normalizeGeminiJson(response?.text)) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Gemini returned invalid JSON.', { cause: error });
    }
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseReviewAnalysis(value: unknown): ReviewAnalysis {
  if (!isRecord(value)) {
    throw new Error('Gemini returned an invalid review analysis object.');
  }

  const { sentiment, rating, summary, recommended } = value;
  if (
    (sentiment !== 'positive' && sentiment !== 'neutral' && sentiment !== 'negative') ||
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    typeof summary !== 'string' ||
    summary.trim().length === 0 ||
    typeof recommended !== 'boolean'
  ) {
    throw new Error('Gemini returned review analysis with invalid fields.');
  }

  return { sentiment, rating, summary, recommended };
}

export async function analyzeReview(reviewText: string): Promise<ReviewAnalysis> {
  const trimmedReviewText = reviewText.trim();
  if (!trimmedReviewText) {
    throw new Error('Review text must not be empty.');
  }

  const response = await getAI().models.generateContent({
    model,
    contents: trimmedReviewText,
    config: {
      systemInstruction: `You analyze customer product reviews.

Rules:
1. Determine the sentiment.
2. sentiment must be positive, neutral, or negative.
3. Give the review a rating from 1 to 5.
4. Create a short summary of the review.
5. Decide whether the customer recommends the product.
6. Return only the requested structured data.`,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentiment: {
            type: Type.STRING,
            enum: ['positive', 'neutral', 'negative'],
          },
          rating: { type: Type.INTEGER, minimum: 1, maximum: 5 },
          summary: { type: Type.STRING },
          recommended: { type: Type.BOOLEAN },
        },
        required: ['sentiment', 'rating', 'summary', 'recommended'],
      },
    },
  });

  return parseReviewAnalysis(parseResponse(response));
}

export async function summarizeProductReviews(reviewTexts: string[]): Promise<string> {
  const validReviewTexts = reviewTexts
    .map((text) => text.trim())
    .filter((text) => text.length > 0);

  if (validReviewTexts.length === 0) {
    return 'No customer reviews are available yet.';
  }

  const response = await getAI().models.generateContent({
    model,
    contents: `Summarize the common customer opinions in these product reviews:\n\n${validReviewTexts
      .map((text, index) => `${index + 1}. ${text}`)
      .join('\n\n')}`,
    config: {
      systemInstruction:
        'Summarize customer opinions across product reviews in a short, balanced paragraph. Return only the requested structured data.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
        },
        required: ['summary'],
      },
    },
  });

  const result = parseResponse(response);
  if (!isRecord(result) || typeof result.summary !== 'string' || !result.summary.trim()) {
    throw new Error('Gemini returned an invalid product review summary.');
  }

  return result.summary;
}
