import { apiClient } from '@/lib/api';

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  expires_at?: string;
  starts_at?: string;
  applicable_to: 'all' | 'specific';
  product_ids?: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponData {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase?: number;
  max_discount?: number;
  usage_limit?: number;
  expires_at?: string;
  starts_at?: string;
  applicable_to?: 'all' | 'specific';
  product_ids?: string[];
  active?: boolean;
}

export interface UpdateCouponData extends Partial<CreateCouponData> {}

export interface ValidateCouponData {
  code: string;
  cartItems: any[];
  subtotal: number;
}

export interface ValidateCouponResponse {
  success: boolean;
  data?: {
    coupon: {
      id: string;
      code: string;
      discount_type: string;
      discount_value: number;
    };
    discount_amount: number;
  };
  message: string;
}

interface GetCouponsResponse {
  success: boolean;
  data: {
    coupons: Coupon[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

class CouponService {
  private baseUrl = '/coupons';

  async getAll(params?: { page?: number; limit?: number; status?: string }): Promise<GetCouponsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.status) queryParams.status = params.status;

    const response = await apiClient.get<GetCouponsResponse>(this.baseUrl, queryParams);
    if (!response || !response.data) {
      // Return empty structure instead of throwing
      return {
        success: true,
        data: {
          coupons: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      };
    }
    // Ensure coupons array exists
    if (!response.data.data) {
      response.data.data = {
        coupons: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
    if (!response.data.data.coupons) {
      response.data.data.coupons = [];
    }
    return response.data;
  }

  async getById(id: string) {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async create(data: CreateCouponData) {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  async update(id: string, data: UpdateCouponData) {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  async delete(id: string) {
    const response = await apiClient.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async validate(data: ValidateCouponData): Promise<ValidateCouponResponse> {
    const response = await apiClient.post(`${this.baseUrl}/validate`, data);
    return response.data as ValidateCouponResponse;
  }

  async incrementUsage(couponId: string) {
    const response = await apiClient.post(`${this.baseUrl}/increment-usage`, {
      couponId,
    });
    return response.data;
  }
}

export const couponService = new CouponService();
export default couponService;
