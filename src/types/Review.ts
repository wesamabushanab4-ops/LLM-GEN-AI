export type ReviewAnalysis = {
  sentiment: 'positive' | 'neutral' | 'negative';
  rating: number;
  summary: string;
  recommended: boolean;
};

export type Review = {
  review_id: number;
  product_id: number;
  product_name: string;
  review_text: string;
  sentiment: ReviewAnalysis['sentiment'];
  rating: number;
  summary: string;
  recommended: boolean;
  created_at: Date;
};
