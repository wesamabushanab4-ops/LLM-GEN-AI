import type { Request, Response, NextFunction } from 'express';
import pool from '../db.js';

function parseProductId(value: string | string[]): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const productId = Number(value);
  return Number.isInteger(productId) && productId > 0 ? productId : undefined;
}

function parseProductInput(
  body: unknown,
): { product_name: string; price: number } | undefined {
  if (typeof body !== 'object' || body === null || !('product_name' in body) || !('price' in body)) {
    return undefined;
  }

  const { product_name, price } = body;
  if (
    typeof product_name !== 'string' ||
    product_name.trim().length === 0 ||
    (typeof price !== 'number' && typeof price !== 'string') ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return undefined;
  }

  return { product_name: product_name.trim(), price: Number(price) };
}

export async function getAllProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY product_id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  const productId = parseProductId(req.params.id);
  if (!productId) {
    res.status(400).json({ error: 'id must be a positive integer.' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM products WHERE product_id = $1', [productId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  const product = parseProductInput(req.body);
  if (!product) {
    res.status(400).json({ error: 'product_name and a non-negative price are required.' });
    return;
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (product_name, price) VALUES ($1, $2) RETURNING *',
      [product.product_name, product.price],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  const productId = parseProductId(req.params.id);
  const product = parseProductInput(req.body);
  if (!productId || !product) {
    res.status(400).json({ error: 'A positive id, product_name, and non-negative price are required.' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE products SET product_name = $1, price = $2 WHERE product_id = $3 RETURNING *',
      [product.product_name, product.price, productId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  const productId = parseProductId(req.params.id);
  if (!productId) {
    res.status(400).json({ error: 'id must be a positive integer.' });
    return;
  }

  try {
    const result = await pool.query(
      'DELETE FROM products WHERE product_id = $1 RETURNING product_id',
      [productId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
