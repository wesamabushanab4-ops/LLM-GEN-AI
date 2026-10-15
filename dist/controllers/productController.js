"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProducts = getAllProducts;
exports.getProductById = getProductById;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
const db_js_1 = __importDefault(require("../db.js"));
function parseProductId(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const productId = Number(value);
    return Number.isInteger(productId) && productId > 0 ? productId : undefined;
}
function parseProductInput(body) {
    if (typeof body !== 'object' || body === null || !('product_name' in body) || !('price' in body)) {
        return undefined;
    }
    const { product_name, price } = body;
    if (typeof product_name !== 'string' ||
        product_name.trim().length === 0 ||
        (typeof price !== 'number' && typeof price !== 'string') ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0) {
        return undefined;
    }
    return { product_name: product_name.trim(), price: Number(price) };
}
async function getAllProducts(_req, res, next) {
    try {
        const result = await db_js_1.default.query('SELECT * FROM products ORDER BY product_id');
        res.json(result.rows);
    }
    catch (error) {
        next(error);
    }
}
async function getProductById(req, res, next) {
    const productId = parseProductId(req.params.id);
    if (!productId) {
        res.status(400).json({ error: 'id must be a positive integer.' });
        return;
    }
    try {
        const result = await db_js_1.default.query('SELECT * FROM products WHERE product_id = $1', [productId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
}
async function createProduct(req, res, next) {
    const product = parseProductInput(req.body);
    if (!product) {
        res.status(400).json({ error: 'product_name and a non-negative price are required.' });
        return;
    }
    try {
        const result = await db_js_1.default.query('INSERT INTO products (product_name, price) VALUES ($1, $2) RETURNING *', [product.product_name, product.price]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
}
async function updateProduct(req, res, next) {
    const productId = parseProductId(req.params.id);
    const product = parseProductInput(req.body);
    if (!productId || !product) {
        res.status(400).json({ error: 'A positive id, product_name, and non-negative price are required.' });
        return;
    }
    try {
        const result = await db_js_1.default.query('UPDATE products SET product_name = $1, price = $2 WHERE product_id = $3 RETURNING *', [product.product_name, product.price, productId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        next(error);
    }
}
async function deleteProduct(req, res, next) {
    const productId = parseProductId(req.params.id);
    if (!productId) {
        res.status(400).json({ error: 'id must be a positive integer.' });
        return;
    }
    try {
        const result = await db_js_1.default.query('DELETE FROM products WHERE product_id = $1 RETURNING product_id', [productId]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Product not found.' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
}
