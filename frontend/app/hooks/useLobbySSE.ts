import { useEffect, useRef, useState } from 'react';
import { auth } from '~/auth/firebase';
import { API_URL } from '~/config/environment';

interface GamePlayer {
  uid: string;
  userName: string;
}

interface UseLobbySSEOptions {
  gameCode: string;
  initialPlayers: GamePlayer[];
}

interface UseLobbySSEResult {
  players: GamePlayer[];
  connected: boolean;
  gameStarted: boolean;
  disconnect: () => void;
}

export function useLobbySSE({ gameCode, initialPlayers }: UseLobbySSEOptions): UseLobbySSEResult {
  const [players, setPlayers] = useState<GamePlayer[]>(initialPlayers);
  const [connected, setConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

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

      es.addEventListener('player_joined', (event) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(event.data);
        setPlayers(data.players);
      });

      es.addEventListener('player_left', (event) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(event.data);
        setPlayers(data.players);
      });

      es.addEventListener('game_started', () => {
        if (!mountedRef.current) return;
        setGameStarted(true);
      });

      es.onopen = () => {
        if (mountedRef.current) setConnected(true);
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        es.close();
        esRef.current = null;
        // Reconnect after 3s with a fresh token
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

  return { players, connected, gameStarted, disconnect };
}
