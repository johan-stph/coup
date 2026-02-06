import { Response } from 'express';

interface SSEClient {
  uid: string;
  res: Response;
}

const lobbies = new Map<string, SSEClient[]>();

export function addClient(gameCode: string, uid: string, res: Response): void {
  if (!lobbies.has(gameCode)) {
    lobbies.set(gameCode, []);
  }

  const clients = lobbies.get(gameCode)!;

  // Replace existing connection for the same uid (handles reconnect)
  const existingIndex = clients.findIndex((c) => c.uid === uid);
  if (existingIndex !== -1) {
    clients.splice(existingIndex, 1);
  }

  clients.push({ uid, res });
}

export function removeClient(
  gameCode: string,
  uid: string,
  res: Response
): void {
  const clients = lobbies.get(gameCode);
  if (!clients) {
    return;
  }

  // Only remove if the res reference matches (prevents stale close handler
  // from removing a fresh reconnection)
  const index = clients.findIndex((c) => c.uid === uid && c.res === res);
  if (index !== -1) {
    clients.splice(index, 1);
  }

  if (clients.length === 0) {
    lobbies.delete(gameCode);
  }
}

export function closeClient(gameCode: string, uid: string): void {
  const clients = lobbies.get(gameCode);
  if (!clients) {
    return;
  }

  const index = clients.findIndex((c) => c.uid === uid);
  if (index !== -1) {
    clients[index].res.end();
    clients.splice(index, 1);
  }

  if (clients.length === 0) {
    lobbies.delete(gameCode);
  }
}

export function broadcast(
  gameCode: string,
  event: string,
  data: unknown
): void {
  const clients = lobbies.get(gameCode);
  if (!clients) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    client.res.write(message);
  }
}
