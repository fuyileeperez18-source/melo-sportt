export interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface OrderList {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  user_id: string;
}