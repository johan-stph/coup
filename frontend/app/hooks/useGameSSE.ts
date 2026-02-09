import { useEffect, useRef, useState } from 'react';
import { auth } from '~/auth/firebase';
import { API_URL } from '~/config/environment';
import type { GameState } from '~/types/game';

interface UseGameSSEOptions {
  gameCode: string;
  onGameStateUpdate: (state: GameState) => void;
}

interface UseGameSSEResult {
  connected: boolean;
  disconnect: () => void;
}

export function useGameSSE({
  gameCode,
  onGameStateUpdate,
}: UseGameSSEOptions): UseGameSSEResult {
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onGameStateUpdateRef = useRef(onGameStateUpdate);

  // Keep callback ref fresh without causing reconnects
  useEffect(() => {
    onGameStateUpdateRef.current = onGameStateUpdate;
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

      // Handle game started event (initial state)
      es.addEventListener('game_started', (event) => {
        if (!mountedRef.current) return;
        const data: GameState = JSON.parse(event.data);
        onGameStateUpdateRef.current(data);
      });

      // Handle game state updates
      es.addEventListener('game_state_updated', (event) => {
        if (!mountedRef.current) return;
        const data: GameState = JSON.parse(event.data);
        onGameStateUpdateRef.current(data);
      });

      // Legacy player_joined event (for lobby state)
      es.addEventListener('player_joined', () => {
        // No-op, game hasn't started yet
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
