import api from '../lib/api';

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
  return response.data.data || response.data || [];
};

export default {
  getUserOrders
};
