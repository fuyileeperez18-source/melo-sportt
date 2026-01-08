import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '@/lib/services';

export function useWishlistIds(userId?: string) {
  return useQuery({
    queryKey: ['wishlist', 'ids', userId],
    queryFn: () => wishlistService.getIds(),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

export function useWishlistItems(userId?: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['wishlist', 'items', userId, params],
    queryFn: () => wishlistService.getAll(params),
    enabled: !!userId,
  });
}

export function useAddToWishlist(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistService.add(productId),
    onMutate: async (productId) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ['wishlist', 'ids', userId] });

      const prevIds = queryClient.getQueryData<string[]>(['wishlist', 'ids', userId]);
      if (prevIds) {
        if (!prevIds.includes(productId)) {
          queryClient.setQueryData<string[]>(['wishlist', 'ids', userId], [...prevIds, productId]);
        }
      } else {
        queryClient.setQueryData<string[]>(['wishlist', 'ids', userId], [productId]);
      }

      return { prevIds };
    },
    onError: (_err, _productId, ctx) => {
      if (!userId) return;
      if (ctx?.prevIds) queryClient.setQueryData(['wishlist', 'ids', userId], ctx.prevIds);
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'ids', userId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'items', userId] });
    },
  });
}

export function useRemoveFromWishlist(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => wishlistService.remove(productId),
    onMutate: async (productId) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ['wishlist', 'ids', userId] });

      const prevIds = queryClient.getQueryData<string[]>(['wishlist', 'ids', userId]);
      if (prevIds) {
        queryClient.setQueryData<string[]>(
          ['wishlist', 'ids', userId],
          prevIds.filter((id) => id !== productId)
        );
      }

      return { prevIds };
    },
    onError: (_err, _productId, ctx) => {
      if (!userId) return;
      if (ctx?.prevIds) queryClient.setQueryData(['wishlist', 'ids', userId], ctx.prevIds);
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'ids', userId] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'items', userId] });
    },
  });
}

export function useToggleWishlist(userId?: string) {
  const { data: ids } = useWishlistIds(userId);
  const add = useAddToWishlist(userId);
  const remove = useRemoveFromWishlist(userId);

  const toggle = (productId: string) => {
    const isInWishlist = !!ids?.includes(productId);
    if (isInWishlist) remove.mutate(productId);
    else add.mutate(productId);
  };

  return {
    ids: ids || [],
    toggle,
    isToggling: add.isPending || remove.isPending,
  };
}
