# Products API with Gemini review analysis

Express and TypeScript API backed by PostgreSQL. Reviews are analyzed with Gemini before they are saved. Gemini integration is implemented in `src/services/reviewAIService.ts`.

## Requirements

- Node.js 20 or later
- PostgreSQL (Neon works)
- A Gemini API key

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and `GEMINI_API_KEY`.
3. Run `sql/schema.sql` against the database.
4. Start the development server with `npm run dev`.

The server listens on port `3000` by default. Override it with `PORT`.

## Endpoints

### Products

- `GET /products`
- `GET /products/:id`
- `POST /products` with `{ "product_name": "Arduino Kit", "price": 299 }`
- `PUT /products/:id` with `{ "product_name": "Arduino Kit", "price": 299 }`
- `DELETE /products/:id` (deleting a product cascades to its reviews)

### Reviews

- `POST /api/reviews` with `{ "product_id": 1, "review_text": "Easy to use and worth the money." }`
- `GET /api/reviews`
- `GET /api/reviews/product/:productId`
- `GET /api/reviews/product/:productId/summary`

Review responses include the original text, Gemini sentiment/rating/summary/recommendation, product name, and creation time.

The schema includes the optional `recommended` challenge field. The `ALTER TABLE` statement in `sql/schema.sql` also adds it to an existing `reviews` table.
