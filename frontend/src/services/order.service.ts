import api from '../lib/api';

import type { OrderList } from '@/types/order';

export interface OrderList {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  user_id: string;
}

export const getUserOrders = async (userId: string): Promise<OrderList[]> => {
  const response = await api.get(`/api/orders/user/${userId}`);
  return response.data as OrderList[];
};

export default {
  getUserOrders
};
