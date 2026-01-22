import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AnalyticsDashboardData {
  monthlySales: Array<{
    month: string;
    sales: number;
    orders: number;
    activeProducts: number;
    totalProducts: number;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
    orders: number;
    image?: string;
  }>;
  topCategories: Array<{
    name: string;
    sales: number;
    quantity: number;
    products: number;
  }>;
  traffic: {
    totalViews: number;
    totalVisitors: number;
    conversionRate: number;
  };
  trafficSources: Array<{
    source: string;
    visits: number;
    orders: number;
    revenue: number;
  }>;
  generalStats: {
    totalSales: number;
    totalOrders: number;
    totalUsers: number;
    activeUsers: number;
  };
}

export interface AnalyticsChartData {
  monthlySales: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
  paymentMethods: Array<{
    method: string;
    orders: number;
    amount: number;
  }>;
  categories: Array<{
    category: string;
    sales: number;
    quantity: number;
  }>;
  trafficData: Array<{
    date: string;
    views: number;
    uniqueVisitors: number;
    conversionRate: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
    orders: number;
    revenue: number;
  }>;
}

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ['analytics', 'real-dashboard'],
    queryFn: async () => {
      const response = await api.get<AnalyticsDashboardData>('/analytics/real-dashboard');
      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.message || 'Error al obtener datos del dashboard');
      }
    },
    refetchInterval: 60000,
  });
}

export function useAnalyticsChartData() {
  return useQuery({
    queryKey: ['analytics', 'real-chart-data'],
    queryFn: async () => {
      const response = await api.get<AnalyticsChartData>('/analytics/real-chart-data');
      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.message || 'Error al obtener datos de gráficos');
      }
    },
    refetchInterval: 60000,
  });
}

export function useCalculateRealData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/analytics/calculate-real-data');
      if (!response.success) {
        throw new Error(response.message || 'Error al calcular datos');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidar y refetch los datos de analítica
      queryClient.invalidateQueries({ queryKey: ['analytics', 'real-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'real-chart-data'] });
    },
  });
}
