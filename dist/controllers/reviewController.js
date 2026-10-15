"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReview = addReview;
exports.getAllReviews = getAllReviews;
exports.getReviewsByProduct = getReviewsByProduct;
exports.getProductReviewSummary = getProductReviewSummary;
const db_js_1 = __importDefault(require("../db.js"));
const reviewAIService_js_1 = require("../services/reviewAIService.js");
function parseProductId(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const productId = Number(value);
    return Number.isInteger(productId) && productId > 0 ? productId : undefined;
}
function getReviewInput(body) {
    if (typeof body !== 'object' ||
        body === null ||
        !('product_id' in body) ||
        !('review_text' in body)) {
        return undefined;
    }
    const { product_id, review_text } = body;
    if (typeof product_id !== 'number' ||
        !Number.isInteger(product_id) ||
        product_id <= 0 ||
        typeof review_text !== 'string' ||
        review_text.trim().length === 0) {
        return undefined;
    }
    return { product_id, review_text: review_text.trim() };
}
async function addReview(req, res, next) {
    const review = getReviewInput(req.body);
    if (!review) {
        res.status(400).json({ error: 'A positive product_id and non-empty review_text are required.' });
        return;
    }
    try {
        const productResult = await db_js_1.default.query('SELECT product_name FROM products WHERE product_id = $1', [review.product_id]);
        if (productResult.rowCount === 0) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        const analysis = await (0, reviewAIService_js_1.analyzeReview)(review.review_text);
        const insertResult = await db_js_1.default.query(`INSERT INTO reviews
        (product_id, review_text, sentiment, rating, summary, recommended)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [
            review.product_id,
            review.review_text,
            analysis.sentiment,
            analysis.rating,
            analysis.summary,
            analysis.recommended,
        ]);
        res.status(201).json({
            ...insertResult.rows[0],
            product_name: productResult.rows[0].product_name,
        });
    }
    catch (error) {
        next(error);
    }
}
async function getAllReviews(_req, res, next) {
    try {
        const result = await db_js_1.default.query(`SELECT r.*, p.product_name
       FROM reviews r
       JOIN products p ON p.product_id = r.product_id
       ORDER BY r.created_at DESC, r.review_id DESC`);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
}
async function getReviewsByProduct(req, res, next) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
        res.status(400).json({ error: 'productId must be a positive integer.' });
        return;
    }
    try {
        const result = await db_js_1.default.query(`SELECT r.*, p.product_name
       FROM reviews r
       JOIN products p ON p.product_id = r.product_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC, r.review_id DESC`, [productId]);
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
}
async function getProductReviewSummary(req, res, next) {
    const productId = parseProductId(req.params.productId);
    if (!productId) {
        res.status(400).json({ error: 'productId must be a positive integer.' });
        return;
    }
    try {
        const productResult = await db_js_1.default.query('SELECT product_name FROM products WHERE product_id = $1', [productId]);
        if (productResult.rowCount === 0) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        const reviewsResult = await db_js_1.default.query('SELECT review_text FROM reviews WHERE product_id = $1 ORDER BY created_at', [productId]);
        const reviewTexts = reviewsResult.rows.map((row) => row.review_text);
        const summary = reviewTexts.length === 0
            ? 'No customer reviews are available yet.'
            : await (0, reviewAIService_js_1.summarizeProductReviews)(reviewTexts);
        res.json({
            product_id: productId,
            product_name: productResult.rows[0].product_name,
            review_count: reviewTexts.length,
            summary,
        });
    }
    catch (error) {
        next(error);
    }
}
