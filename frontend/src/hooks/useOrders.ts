import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/lib/services';
import type { Order } from '@/types';

// Orders hooks
export function useOrders(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => orderService.getAll(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getById(id),
    enabled: !!id,
  });
}

export function useUserOrders(userId: string) {
  return useQuery({
    queryKey: ['orders', 'user', userId],
    queryFn: () => orderService.getByUser(userId),
    enabled: !!userId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: Parameters<typeof orderService.create>[0]) => orderService.create(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderService.updateStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

export function useUpdateOrderTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      trackingNumber,
      trackingUrl,
    }: {
      id: string;
      trackingNumber: string;
      trackingUrl?: string;
    }) => orderService.updateTracking(id, trackingNumber, trackingUrl),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}
