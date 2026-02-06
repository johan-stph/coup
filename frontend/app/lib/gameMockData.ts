// TODO: Replace with real WebSocket state

export interface GamePlayer {
  uid: string;
  userName: string;
  coins: number;
  cardCount: number;
  isLocal: boolean;
}

export interface GameEvent {
  id: string;
  timestamp: string;
  message: string;
}

// TODO: Replace with real WebSocket state
export function buildMockPlayers(
  players: { uid: string; userName: string }[],
  localUid: string,
): GamePlayer[] {
  return players.map((p) => ({
    uid: p.uid,
    userName: p.userName,
    coins: Math.floor(Math.random() * 5) + 1,
    cardCount: 2,
    isLocal: p.uid === localUid,
  }));
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
  actionName: string,
): GameEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toLocaleTimeString(),
    message: `${playerName} executed ${actionName}.`,
  };
}
