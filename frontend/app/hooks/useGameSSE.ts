import { useEffect, useRef, useState } from 'react';
import { auth } from '~/auth/firebase';
import { API_URL } from '~/config/environment';

interface ActionEvent {
  uid: string;
  userName: string;
  action: string;
}

interface UseGameSSEOptions {
  gameCode: string;
  onAction: (event: ActionEvent) => void;
}

interface UseGameSSEResult {
  connected: boolean;
  disconnect: () => void;
}

export function useGameSSE({
  gameCode,
  onAction,
}: UseGameSSEOptions): UseGameSSEResult {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onActionRef = useRef(onAction);

  // Keep callback ref fresh without causing reconnects
  useEffect(() => {
    onActionRef.current = onAction;
  });

  useEffect(() => {
    mountedRef.current = true;

    function cleanup() {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    }

    async function connect() {
      cleanup();

      if (!mountedRef.current) return;

      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const url = `${API_URL}/games/${gameCode}/events?token=${encodeURIComponent(token)}`;

      const es = new EventSource(url);
      esRef.current = es;

      // No-op listener to silence the initial state event
      es.addEventListener('player_joined', () => {});

      es.addEventListener('action_performed', (event) => {
        if (!mountedRef.current) return;
        const data: ActionEvent = JSON.parse(event.data);
        onActionRef.current(data);
      });

      es.onopen = () => {
        if (mountedRef.current) setConnected(true);
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        esRef.current = null;
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3_000);
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [gameCode]);

  function disconnect() {
    mountedRef.current = false;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }

  return { connected, disconnect };
}
