// TODO: Replace with real WebSocket state

export interface PlayerCard {
  card: string | null;
  revealed: boolean;
}

export interface GamePlayer {
  uid: string;
  userName: string;
  coins: number;
  cards: PlayerCard[];
  isLocal: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: string;
  message: string;
  playerName?: string;
  actionName?: string;
}

// TODO: Replace with real WebSocket state
export function getInitialEvents(): GameEvent[] {
  const now = Date.now();
  return [
    {
      id: crypto.randomUUID(),
      timestamp: new Date(now - 2000).toLocaleTimeString(),
      message: 'SYSTEM: Operation commenced. All operatives deployed.',
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(now - 1000).toLocaleTimeString(),
      message: 'SYSTEM: Influence cards distributed. Awaiting first move.',
    },
    {
      id: crypto.randomUUID(),
      timestamp: new Date(now).toLocaleTimeString(),
      message: 'SYSTEM: Treasury initialized. Credits are live.',
    },
  ];
}

// TODO: Replace with real WebSocket state
export function createActionEvent(
  playerName: string,
  actionName: string
): GameEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    message: `${playerName} executes ${actionName}`,
    playerName,
    actionName,
  };
}
