import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { Observable } from 'rxjs';

export interface ProductReview {
  id?: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  isVerified: boolean;
  helpful: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewStats {
  averageRating: string;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  stats: ReviewStats;
}

@Injectable({
  providedIn: 'root'
})
export class ProductReviewService {
  private apiUrl = `${environment.apiUrl}/api/reviews`;

  constructor(private http: HttpClient) {}

  // Get reviews for a product
  getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sort: string = 'createdAt',
    order: 'ASC' | 'DESC' = 'DESC'
  ): Observable<ProductReviewsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sort', sort)
      .set('order', order);

    return this.http.get<ProductReviewsResponse>(`${this.apiUrl}/product/${productId}`, { params });
  }

  // Create a new review
  createReview(review: Omit<ProductReview, 'id' | 'createdAt' | 'updatedAt' | 'helpful'>): Observable<ProductReview> {
    return this.http.post<ProductReview>(this.apiUrl, review);
  }

  // Update a review
  updateReview(reviewId: string, review: Partial<ProductReview>): Observable<ProductReview> {
    return this.http.put<ProductReview>(`${this.apiUrl}/${reviewId}`, review);
  }

  // Delete a review
  deleteReview(reviewId: string, customerId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reviewId}`, {
      body: { customerId }
    });
  }

  // Mark review as helpful
  markHelpful(reviewId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reviewId}/helpful`, {});
  }

  // Get customer's reviews
  getCustomerReviews(customerId: string): Observable<ProductReview[]> {
    return this.http.get<ProductReview[]>(`${this.apiUrl}/customer/${customerId}`);
  }

  // Calculate star rating display
  getStarArray(rating: number): boolean[] {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating);
    }
    return stars;
  }

  // Format rating for display
  formatRating(rating: number): string {
    return rating.toFixed(1);
  }

  // Check if customer can review product
  canReviewProduct(customerId: string, productId: string): Observable<boolean> {
    // This would check if customer has purchased the product
    // For now, we'll allow reviews from any customer
    return new Observable(subscriber => {
      subscriber.next(true);
      subscriber.complete();
    });
  }
}