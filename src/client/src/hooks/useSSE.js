import { useEffect, useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Subscribe to the server-sent events stream for real-time updates.
 * Automatically reconnects on connection loss.
 *
 * @param {(event: object) => void} onEvent  Called with each parsed event object.
 * @param {boolean} [enabled=true]           Set to false to skip connecting.
 */
export default function useSSE(onEvent, enabled = true) {
  const esRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const retryRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !enabled) return;

    // EventSource doesn't support custom headers, so token goes in query string
    const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEventRef.current?.(data);
      } catch (_) {}
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5 s
      retryRef.current = setTimeout(connect, 5000);
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      esRef.current?.close();
    };
  }, [connect]);
}
