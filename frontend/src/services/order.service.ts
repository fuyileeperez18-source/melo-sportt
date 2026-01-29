import api from '../lib/api';

import type { OrderList } from '@/types/order';


export const getUserOrders = async (userId: string): Promise<OrderList[]> => {
  const response = await api.get(`/api/orders/user/${userId}`);
  return response.data as OrderList[];
};

export default {
  getUserOrders
};
