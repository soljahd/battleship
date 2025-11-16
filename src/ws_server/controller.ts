import { randomUUID } from 'node:crypto';
import {
  parseData,
  isRegRequestData,
  isAddUserToRoomRequestData,
  isAddShipsRequestData,
  isAttackRequestData,
} from './typeGuard.js';
import { CONNECTIONS, GAMES, USERS, WAITING_ROOMS } from './db.js';

function send(ws: WsWebSocket | null | undefined, type: string, payload: unknown) {
  if (!ws) return;
  ws.send(JSON.stringify({ type, data: JSON.stringify(payload), id: 0 }));
}

function broadcastToAll(type: string, payload: unknown) {
  for (const ws of CONNECTIONS.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, data: JSON.stringify(payload), id: 0 }));
  }
}

function updateRoomsBroadcast() {
  const list = Array.from(WAITING_ROOMS.values()).map((room) => ({
    roomId: room.roomId,
    roomUsers: room.users.map((user) => ({ name: user, index: user })),
  }));
  broadcastToAll('update_room', list);
}

function updateWinnersBroadcast() {
  const arr = Array.from(USERS.values()).map((user) => ({ name: user.name, wins: user.wins }));
  broadcastToAll('update_winners', arr);
}

function handleReg(ws: WsWebSocket, { name, password }: RegRequestData) {
  if (!name || !password) {
    send(ws, 'reg', { name: '', index: '', error: true, errorText: 'invalid credentials' });
    return;
  }
  const existing = USERS.get(name);
  if (!existing) {
    USERS.set(name, { name, password, wins: 0, ws });
  } else {
    if (existing.password !== password) {
      send(ws, 'reg', { name: '', index: '', error: true, errorText: 'wrong password' });
      return;
    }
    existing.ws = ws;
    USERS.set(name, existing);
  }
  CONNECTIONS.set(ws, name);
  send(ws, 'reg', { name, index: name, error: false, errorText: '' });
  updateRoomsBroadcast();
  updateWinnersBroadcast();
  return;
}

function handleCreateRoom(ws: WsWebSocket) {
  const who = CONNECTIONS.get(ws);
  if (!who) return;
  const existingRoom = Array.from(WAITING_ROOMS.values()).find((room) => room.users.includes(who));
  if (existingRoom) return;
  const roomId = randomUUID();
  WAITING_ROOMS.set(roomId, { roomId, users: [who] });
  updateRoomsBroadcast();
}

export function handleCommand(ws: WsWebSocket, { type, data }: MsgEnvelope) {
  const dataParsed: unknown = data === '' ? '' : JSON.parse(data);
  switch (type) {
    case 'reg': {
      const data = parseData<RegRequestData>(dataParsed, isRegRequestData);
      if (data) handleReg(ws, data);
      break;
    }

    case 'create_room': {
      handleCreateRoom(ws);
      break;
    }

    case 'add_user_to_room': {
      const data = parseData<AddUserToRoomRequestData>(dataParsed, isAddUserToRoomRequestData);
      if (data) console.log(data);
      break;
    }

    case 'add_ships': {
      const data = parseData<AddShipsRequestData>(dataParsed, isAddShipsRequestData);
      if (data) console.log(data);
      break;
    }

    case 'attack': {
      const data = parseData<AttackRequestData>(dataParsed, isAttackRequestData);
      if (data) console.log(data);
      break;
    }

    case 'single_play': {
      break;
    }

    default: {
      break;
    }
  }
}

export function handleCloseConnection(user: string | null) {
  if (user) {
    for (const [roomId, room] of WAITING_ROOMS.entries()) if (room.users.includes(user)) WAITING_ROOMS.delete(roomId);
    for (const [gameId, game] of GAMES.entries()) {
      const playerIdx = game.players.findIndex((player) => player.userName === user);
      if (playerIdx >= 0) {
        const opponentIdx = playerIdx === 0 ? 1 : 0;
        const opponent = game.players[opponentIdx];
        if (!game.finished) {
          game.finished = true;
          send(opponent.ws, 'finish', { winPlayer: opponent.gamePlayerId });
          const rec = USERS.get(opponent.userName);
          if (rec) rec.wins = (rec.wins || 0) + 1;
        }
        GAMES.delete(gameId);
      }
    }
  }
  updateWinnersBroadcast();
  updateRoomsBroadcast();
}
