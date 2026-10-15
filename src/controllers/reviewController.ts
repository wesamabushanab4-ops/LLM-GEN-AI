import type { Request, Response, NextFunction } from 'express';
import pool from '../db.js';
import { analyzeReview, summarizeProductReviews } from '../services/reviewAIService.js';

function parseProductId(value: string | string[]): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const productId = Number(value);
  return Number.isInteger(productId) && productId > 0 ? productId : undefined;
}

function getReviewInput(
  body: unknown,
): { product_id: number; review_text: string } | undefined {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('product_id' in body) ||
    !('review_text' in body)
  ) {
    return undefined;
  }

  const { product_id, review_text } = body;
  if (
    typeof product_id !== 'number' ||
    !Number.isInteger(product_id) ||
    product_id <= 0 ||
    typeof review_text !== 'string' ||
    review_text.trim().length === 0
  ) {
    return undefined;
  }

  return { product_id, review_text: review_text.trim() };
}

export async function addReview(req: Request, res: Response, next: NextFunction) {
  const review = getReviewInput(req.body);
  if (!review) {
    res.status(400).json({ error: 'A positive product_id and non-empty review_text are required.' });
    return;
  }

  try {
    const productResult = await pool.query(
      'SELECT product_name FROM products WHERE product_id = $1',
      [review.product_id],
    );
    if (productResult.rowCount === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const analysis = await analyzeReview(review.review_text);
    const insertResult = await pool.query(
      `INSERT INTO reviews
        (product_id, review_text, sentiment, rating, summary, recommended)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        review.product_id,
        review.review_text,
        analysis.sentiment,
        analysis.rating,
        analysis.summary,
        analysis.recommended,
      ],
    );

    res.status(201).json({
      ...insertResult.rows[0],
      product_name: productResult.rows[0].product_name,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllReviews(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      `SELECT r.*, p.product_name
       FROM reviews r
       JOIN products p ON p.product_id = r.product_id
       ORDER BY r.created_at DESC, r.review_id DESC`,
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getReviewsByProduct(req: Request, res: Response, next: NextFunction) {
  const productId = parseProductId(req.params.productId);
  if (!productId) {
    res.status(400).json({ error: 'productId must be a positive integer.' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT r.*, p.product_name
       FROM reviews r
       JOIN products p ON p.product_id = r.product_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC, r.review_id DESC`,
      [productId],
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getProductReviewSummary(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const productId = parseProductId(req.params.productId);
  if (!productId) {
    res.status(400).json({ error: 'productId must be a positive integer.' });
    return;
  }

  try {
    const productResult = await pool.query(
      'SELECT product_name FROM products WHERE product_id = $1',
      [productId],
    );
    if (productResult.rowCount === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const reviewsResult = await pool.query(
      'SELECT review_text FROM reviews WHERE product_id = $1 ORDER BY created_at',
      [productId],
    );
    const reviewTexts: string[] = reviewsResult.rows.map(
      (row: { review_text: string }) => row.review_text,
    );
    const summary =
      reviewTexts.length === 0
        ? 'No customer reviews are available yet.'
        : await summarizeProductReviews(reviewTexts);

    res.json({
      product_id: productId,
      product_name: productResult.rows[0].product_name,
      review_count: reviewTexts.length,
      summary,
    });
  } catch (error) {
    next(error);
  }
}
