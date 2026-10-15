import { Router } from 'express';
import {
  addReview,
  getAllReviews,
  getProductReviewSummary,
  getReviewsByProduct,
} from '../controllers/reviewController.js';

const router = Router();

router.post('/', addReview);
router.get('/', getAllReviews);
router.get('/product/:productId/summary', getProductReviewSummary);
router.get('/product/:productId', getReviewsByProduct);

export default router;
