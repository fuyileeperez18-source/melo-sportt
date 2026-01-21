import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'products' | 'orders' | 'order_items' | 'users' | 'chat_messages';

interface RealtimeOptions {
  table: TableName;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: { column: string; value: string };
  onChange: (payload: any) => void;
}

// Cache para canales activos
const activeChannels = new Map<string, RealtimeChannel>();

// Detectar si Supabase está en modo demo/sin configurar
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return url && key && !url.includes('demo.supabase.co') && key !== 'demo-key';
};

/**
 * Hook para suscribirse a cambios en tiempo real en una tabla
 * Se desactiva automáticamente si Supabase no está configurado
 */
export function useRealtimeSubscription(options: RealtimeOptions) {
  const { table, event = '*', filter, onChange } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);

  const channelKey = `${table}-${event}-${filter?.column || 'all'}-${filter?.value || 'all'}`;

  useEffect(() => {
    // No intentar conectar si Supabase no está configurado
    if (!isSupabaseConfigured()) {
      console.log(`[Realtime] Deshabilitado - Supabase en modo demo`);
      return;
    }

    // Verificar si ya existe un canal para esta combinación
    if (activeChannels.has(channelKey)) {
      channelRef.current = activeChannels.get(channelKey)!;
      return;
    }

    // Construir filtro de canal
    let channelFilter = '';
    if (filter) {
      channelFilter = `${filter.column}=eq.${filter.value}`;
    }

    // Crear nuevo canal con manejo de errores
    const channel = supabase
      .channel(channelKey, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter: filter ? channelFilter : undefined,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          onChange(payload);
        }
      )
      .subscribe((status, error) => {
        // Solo loguear estados importantes para reducir ruido
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Conectado a ${channelKey}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] ⚠️ Error en ${channelKey}:`, error);
          // Opcional: Notificar al usuario de problemas de conexión
        }
      });

    channelRef.current = channel;
    activeChannels.set(channelKey, channel);

    // Cleanup al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        activeChannels.delete(channelKey);
        channelRef.current = null;
      }
    };
  }, [table, event, filter?.column, filter?.value, channelKey, onChange]);

  // Función para obtener el canal actual
  const getChannel = useCallback(() => {
    return channelRef.current;
  }, []);

  // Función para actualizar el handler
  const updateHandler = useCallback((newOnChange: (payload: any) => void) => {
    if (channelRef.current) {
      // Recrear el canal con el nuevo handler
      const oldChannel = channelRef.current;
      supabase.removeChannel(oldChannel);
      activeChannels.delete(channelKey);

      const newChannel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes' as any,
          {
            event,
            schema: 'public',
            table,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            newOnChange(payload);
          }
        )
        .subscribe();

      channelRef.current = newChannel;
      activeChannels.set(channelKey, newChannel);
    }
  }, [table, event, channelKey]);

  return { getChannel, updateHandler };
}

/**
 * Hook específico para escuchar cambios en productos (stock en tiempo real)
 */
export function useProductRealtime(onProductChange: (payload: any) => void) {
  return useRealtimeSubscription({
    table: 'products',
    event: '*',
    onChange: onProductChange,
  });
}

/**
 * Hook específico para escuchar nuevos pedidos
 */
export function useOrdersRealtime(onOrderChange: (payload: any) => void) {
  return useRealtimeSubscription({
    table: 'orders',
    event: '*',
    onChange: onOrderChange,
  });
}

/**
 * Hook específico para escuchar mensajes de chat
 */
export function useChatRealtime(conversationId: string, onMessage: (payload: any) => void) {
  return useRealtimeSubscription({
    table: 'chat_messages',
    event: 'INSERT',
    filter: { column: 'conversation_id', value: conversationId },
    onChange: onMessage,
  });
}

/**
 * Utilidad para suscribirse a múltiples tablas simultáneamente
 */
export function useMultiRealtime(
  subscriptions: Array<{ table: TableName; event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'; onChange: (payload: any) => void }>
) {
  useEffect(() => {
    const channels: RealtimeChannel[] = [];

    subscriptions.forEach((sub, index) => {
      const channel = supabase
        .channel(`multi-${index}-${sub.table}`)
        .on(
          'postgres_changes' as any,
          {
            event: sub.event || '*',
            schema: 'public',
            table: sub.table,
          },
          (payload) => {
            sub.onChange(payload);
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [subscriptions]);
}

/**
 * Utilidad para publishar eventos manualmente
 */
export async function publishRealtimeEvent(
  table: TableName,
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
) {
  // Usamos Supabase para broadcast pero también podríamos usar un endpoint del backend
  // Este método es más para comunicación entre clientes
  const channel = supabase.channel('broadcast-event');
  await channel.subscribe();
  await channel.send({
    type: 'broadcast',
    event: 'realtime_event',
    payload: { table, event, data: payload },
  });
  await supabase.removeChannel(channel);
}
