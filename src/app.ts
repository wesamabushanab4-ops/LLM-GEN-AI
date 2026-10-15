import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import productRoutes from './routes/productRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();

app.use(express.json({ limit: '32kb' }));
app.use('/products', productRoutes);
app.use('/api/reviews', reviewRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Request failed:', error);

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Request body must contain valid JSON.' });
    return;
  }

  res.status(500).json({ error: 'Internal server error.' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Products API listening on port ${port}`);
});

export default app;
