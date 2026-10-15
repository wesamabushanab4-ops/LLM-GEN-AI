"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeReview = analyzeReview;
exports.summarizeProductReviews = summarizeProductReviews;
const genai_1 = require("@google/genai");
const model = 'gemini-2.5-flash';
let ai;
function getAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required to analyze reviews.');
    }
    ai ??= new genai_1.GoogleGenAI({ apiKey });
    return ai;
}
function parseResponse(text) {
    if (!text) {
        throw new Error('Gemini returned an empty response.');
    }
    try {
        return JSON.parse(text);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Gemini returned invalid JSON.', { cause: error });
        }
        throw error;
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function parseReviewAnalysis(value) {
    if (!isRecord(value)) {
        throw new Error('Gemini returned an invalid review analysis object.');
    }
    const { sentiment, rating, summary, recommended } = value;
    if ((sentiment !== 'positive' && sentiment !== 'neutral' && sentiment !== 'negative') ||
        typeof rating !== 'number' ||
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5 ||
        typeof summary !== 'string' ||
        summary.trim().length === 0 ||
        typeof recommended !== 'boolean') {
        throw new Error('Gemini returned review analysis with invalid fields.');
    }
    return { sentiment, rating, summary, recommended };
}
async function analyzeReview(reviewText) {
    const response = await getAI().models.generateContent({
        model,
        contents: reviewText,
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
                type: genai_1.Type.OBJECT,
                properties: {
                    sentiment: {
                        type: genai_1.Type.STRING,
                        enum: ['positive', 'neutral', 'negative'],
                    },
                    rating: { type: genai_1.Type.INTEGER, minimum: 1, maximum: 5 },
                    summary: { type: genai_1.Type.STRING },
                    recommended: { type: genai_1.Type.BOOLEAN },
                },
                required: ['sentiment', 'rating', 'summary', 'recommended'],
            },
        },
    });
    return parseReviewAnalysis(parseResponse(response.text));
}
async function summarizeProductReviews(reviewTexts) {
    const response = await getAI().models.generateContent({
        model,
        contents: `Summarize the common customer opinions in these product reviews:\n\n${reviewTexts
            .map((text, index) => `${index + 1}. ${text}`)
            .join('\n\n')}`,
        config: {
            systemInstruction: 'Summarize customer opinions across product reviews in a short, balanced paragraph. Return only the requested structured data.',
            responseMimeType: 'application/json',
            responseSchema: {
                type: genai_1.Type.OBJECT,
                properties: {
                    summary: { type: genai_1.Type.STRING },
                },
                required: ['summary'],
            },
        },
    });
    const result = parseResponse(response.text);
    if (!isRecord(result) || typeof result.summary !== 'string' || !result.summary.trim()) {
        throw new Error('Gemini returned an invalid product review summary.');
    }
    return result.summary;
}
