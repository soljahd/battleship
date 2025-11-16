import { randomUUID } from 'node:crypto';
import {
  parseData,
  isRegRequestData,
  isAddUserToRoomRequestData,
  isAddShipsRequestData,
  isAttackRequestData,
} from './typeGuard.js';
import { CONNECTIONS, deleteRoomByUser, GAMES, USERS, WAITING_ROOMS } from './db.js';
import { buildShipCells, createEmptyBoard, safeSetCell } from './gameController.js';

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

function handleAddUserToRoom(ws: WsWebSocket, { indexRoom }: AddUserToRoomRequestData) {
  const who = CONNECTIONS.get(ws);
  if (!who) return;
  if (!indexRoom) return;
  const room = WAITING_ROOMS.get(String(indexRoom));
  if (!room) return;
  if (room.users.includes(who)) return;
  if (room.users.length >= 2) return;
  room.users.push(who);
  createGameFromRoom(room);
  return;
}

export function createGameFromRoom(room: Room) {
  const gameId = randomUUID();
  const [user1, user2] = room.users;
  if (!user1 || !user2) return;
  const gp1: GamePlayer = {
    userName: user1,
    gamePlayerId: randomUUID(),
    ws: null,
    board: createEmptyBoard(),
    ships: [],
  };
  const gp2: GamePlayer = {
    userName: user2,
    gamePlayerId: randomUUID(),
    ws: null,
    board: createEmptyBoard(),
    ships: [],
  };
  for (const [ws, name] of CONNECTIONS.entries()) {
    if (name === user1) gp1.ws = ws;
    if (name === user2) gp2.ws = ws;
  }
  const game: Game = { gameId: gameId, players: [gp1, gp2], currentPlayer: gp1.gamePlayerId };
  GAMES.set(gameId, game);
  for (const player of game.players)
    send(player.ws, 'create_game', { idGame: game.gameId, idPlayer: player.gamePlayerId });
  WAITING_ROOMS.delete(room.roomId);
  deleteRoomByUser(user2);
  updateRoomsBroadcast();
  return game;
}

function handleAddShips({ gameId, ships, indexPlayer }: AddShipsRequestData) {
  const game = GAMES.get(String(gameId));
  if (!game) return;
  const gamePlayer = game.players.find((player) => player.gamePlayerId === String(indexPlayer));
  if (!gamePlayer) return;
  gamePlayer.ships = ships.map((ship: ShipSpec) => ({
    id: randomUUID(),
    type: ship.type,
    cells: buildShipCells(ship.position, ship.direction, ship.length),
    hits: [],
    sunk: false,
  }));
  gamePlayer.board = gamePlayer.board ?? createEmptyBoard();

  gamePlayer.board = gamePlayer.board ?? createEmptyBoard();

  for (const ship of gamePlayer.ships ?? []) {
    for (const cell of ship.cells) {
      safeSetCell(gamePlayer.board, cell.x, cell.y, 'ship');
    }
  }

  if (game.players.every((p) => p.ships && p.ships.length > 0)) {
    game.currentPlayer = Math.random() < 0.5 ? game.players[0].gamePlayerId : game.players[1].gamePlayerId;
    for (const player of game.players) {
      send(player.ws, 'start_game', { ships: player.ships || [], currentPlayerIndex: game.currentPlayer });
    }
    for (const player of game.players) {
      send(player.ws, 'turn', { currentPlayer: game.currentPlayer });
    }
  }
  return;
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
      if (data) handleAddUserToRoom(ws, data);
      break;
    }

    case 'add_ships': {
      const data = parseData<AddShipsRequestData>(dataParsed, isAddShipsRequestData);
      if (data) handleAddShips(data);
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
