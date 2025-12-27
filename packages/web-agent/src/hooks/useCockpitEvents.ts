import { useEffect, useRef, useCallback } from 'react';
import type { CockpitEvent } from '../api/cockpit-types';

interface UseCockpitEventsOptions {
  sessionId: string | undefined;
  enabled: boolean;
  onEvent: (event: CockpitEvent) => void;
  onError?: (error: Event) => void;
}

export function useCockpitEvents({
  sessionId,
  enabled,
  onEvent,
  onError,
}: UseCockpitEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/cockpit/sessions/${sessionId}/events`, {
      withCredentials: true,
    });

    eventSource.addEventListener('connected', (e) => {
      console.log('Cockpit event stream connected:', JSON.parse(e.data));
    });

    eventSource.addEventListener('event', (e) => {
      try {
        const event = JSON.parse(e.data) as CockpitEvent;
        onEvent(event);
      } catch (err) {
        console.error('Failed to parse cockpit event:', err);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      // Keep-alive, no action needed
    });

    eventSource.onerror = (e) => {
      console.error('Cockpit event stream error:', e);
      onError?.(e);

      // Auto-reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (enabled) {
          connect();
        }
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [sessionId, enabled, onEvent, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled && sessionId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, enabled, connect, disconnect]);

  return { connect, disconnect };
}
