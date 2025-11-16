import { randomUUID } from 'node:crypto';
import { createEmptyBoard } from './gameController.js';

export function send(ws: WsWebSocket | null | undefined, type: CmdType, payload: unknown) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify({ type, data: JSON.stringify(payload), id: 0 }));
}

export function broadcastToAll(connections: Map<WsWebSocket, string | null>, type: CmdType, payload: unknown) {
  for (const ws of connections.keys()) {
    send(ws, type, payload);
  }
}

export function updateRoomsBroadcast(connections: Map<WsWebSocket, string | null>, waitingRooms: Map<string, Room>) {
  const roomsList = Array.from(waitingRooms.values()).map((room) => ({
    roomId: room.roomId,
    roomUsers: room.users.map((user) => ({ name: user, index: user })),
  }));
  broadcastToAll(connections, 'update_room', roomsList);
}

export function updateWinnersBroadcast(connections: Map<WsWebSocket, string | null>, users: Map<string, PlayerRecord>) {
  const winnersList = Array.from(users.values()).map((user) => ({ name: user.name, wins: user.wins }));
  broadcastToAll(connections, 'update_winners', winnersList);
}

export function findWs(connections: Map<WsWebSocket, string | null>, userName: string): WsWebSocket | null {
  for (const [ws, name] of connections.entries()) {
    if (name === userName) return ws;
  }
  return null;
}

export function createGamePlayer(userName: string, ws: WsWebSocket | null): GamePlayer {
  return {
    userName,
    gamePlayerId: randomUUID(),
    ws,
    ships: [],
    board: createEmptyBoard(),
  };
}

export function getRandomAvailableCell(board: Board): Cell | null {
  const availableCells: Cell[] = [];

  for (let y = 0; y < board.length; y++) {
    const row = board[y];
    if (!row) continue;

    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === 'empty' || cell === 'ship') {
        availableCells.push({ x, y });
      }
    }
  }

  if (availableCells.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableCells.length);
  const targetCell = availableCells[randomIndex];
  return targetCell ?? null;
}
