import { randomUUID } from 'node:crypto';
import {
  parseData,
  isRegRequestData,
  isAddUserToRoomRequestData,
  isAddShipsRequestData,
  isAttackRequestData,
  isRandomAttackData,
} from './typeGuard.js';
import { CONNECTIONS, deleteRoomByUser, GAMES, USERS, WAITING_ROOMS } from './db.js';
import {
  BOARD_SIZE,
  buildShipCells,
  createEmptyBoard,
  safeSetCell,
  getSurroundingUniqueCells,
} from './gameController.js';
import {
  send,
  updateRoomsBroadcast,
  updateWinnersBroadcast,
  findWs,
  createGamePlayer,
  getRandomAvailableCell,
  logIncoming,
} from './utils.js';
import { botMakeMove, setupBotShips } from './bot.js';

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
  updateRoomsBroadcast(CONNECTIONS, WAITING_ROOMS);
  updateWinnersBroadcast(CONNECTIONS, USERS);
}

function handleCreateRoom(ws: WsWebSocket) {
  const who = CONNECTIONS.get(ws);
  if (!who) return;
  const existingRoom = Array.from(WAITING_ROOMS.values()).find((room) => room.users.includes(who));
  if (existingRoom) return;
  const roomId = randomUUID();
  WAITING_ROOMS.set(roomId, { roomId, users: [who] });
  updateRoomsBroadcast(CONNECTIONS, WAITING_ROOMS);
}

function handleAddUserToRoom(ws: WsWebSocket, { indexRoom }: AddUserToRoomRequestData) {
  const who = CONNECTIONS.get(ws);
  if (!who || !indexRoom) return;
  const room = WAITING_ROOMS.get(String(indexRoom));
  if (!room || room.users.includes(who) || room.users.length >= 2) return;
  room.users.push(who);
  createGameFromRoom(room);
}

function createGameFromRoom(room: Room) {
  if (room.users.length < 2) return;
  const [user1, user2] = room.users;
  if (!user1 || !user2) throw new Error('user1 and user2 not found');
  const gp1: GamePlayer = createGamePlayer(user1, findWs(CONNECTIONS, user1));
  const gp2: GamePlayer = createGamePlayer(user2, findWs(CONNECTIONS, user2));
  const gameId = randomUUID();
  const players: [GamePlayer, GamePlayer] = [gp1, gp2];
  const game = { gameId, players, currentPlayer: gp1.gamePlayerId };
  GAMES.set(gameId, game);
  for (const player of game.players) {
    send(player.ws, 'create_game', { idGame: gameId, idPlayer: player.gamePlayerId });
  }
  WAITING_ROOMS.delete(room.roomId);
  deleteRoomByUser(user2);
  updateRoomsBroadcast(CONNECTIONS, WAITING_ROOMS);
  return game;
}

function handleAddShips({ gameId, ships, indexPlayer }: AddShipsRequestData) {
  const game = GAMES.get(String(gameId));
  if (!game) return;
  const player = game.players.find((player) => player.gamePlayerId === String(indexPlayer));
  if (!player) return;
  player.ships = ships.map((ship) => ({
    id: randomUUID(),
    type: ship.type,
    cells: buildShipCells(ship.position, ship.direction, ship.length),
    hits: [],
    sunk: false,
  }));
  player.board = player.board ?? createEmptyBoard();
  for (const ship of player.ships) {
    for (const cell of ship.cells) safeSetCell(player.board, cell.x, cell.y, 'ship');
  }

  const botPlayer = game.players.find((player) => player.isBot);
  if (botPlayer && (!botPlayer.ships || botPlayer.ships.length === 0)) {
    setupBotShips(botPlayer);
  }

  if (game.players.every((player) => player.ships && player.ships.length > 0)) {
    game.currentPlayer = Math.random() < 0.5 ? game.players[0].gamePlayerId : game.players[1].gamePlayerId;
    for (const player of game.players) {
      send(player.ws, 'start_game', { ships: player.ships, currentPlayerIndex: game.currentPlayer });
      if (!player.isBot) send(player.ws, 'turn', { currentPlayer: game.currentPlayer });
    }

    if (game.players.find((player) => player.gamePlayerId === game.currentPlayer)?.isBot) {
      botMakeMove(game);
    }
  }
}

export function handleAttack({ gameId, x, y, indexPlayer }: AttackRequestData) {
  const game = GAMES.get(String(gameId));
  if (!game || game.finished) return;

  const attackerIndex = game.players.findIndex((player) => player.gamePlayerId === indexPlayer);
  if (attackerIndex === -1) return;

  const attackingPlayer = game.players[attackerIndex];
  const defendingPlayer = game.players[1 - attackerIndex];
  if (!attackingPlayer || !defendingPlayer) throw new Error('Attacker or defender not found');
  if (game.currentPlayer !== attackingPlayer.gamePlayerId) return;

  attackingPlayer.board ??= createEmptyBoard();
  defendingPlayer.board ??= createEmptyBoard();

  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;
  if (!defendingPlayer.ships) return;

  const targetShip = defendingPlayer.ships.find((ship) => ship.cells.some((cell) => cell.x === x && cell.y === y));
  let wasHit = false;

  if (targetShip) {
    if (!targetShip.hits.some((hit) => hit.x === x && hit.y === y)) {
      targetShip.hits.push({ x, y });
    }

    safeSetCell(defendingPlayer.board, x, y, 'hit');
    wasHit = true;

    if (targetShip.hits.length === targetShip.cells.length) {
      targetShip.sunk = true;
      for (const cell of targetShip.cells) {
        safeSetCell(defendingPlayer.board, cell.x, cell.y, 'killed');
      }
      const surroundingCellsForShip = getSurroundingUniqueCells(targetShip.cells).filter(
        (cell) => !targetShip.cells.some((shipCell) => shipCell.x === cell.x && shipCell.y === cell.y),
      );
      for (const cell of surroundingCellsForShip) {
        safeSetCell(defendingPlayer.board, cell.x, cell.y, 'miss');
      }
      sendAttackToAll(game, attackingPlayer, targetShip.cells, 'killed');
      sendAttackToAll(game, attackingPlayer, surroundingCellsForShip, 'miss');
      const isDefenderAlive = defendingPlayer.ships.some((ship) => !ship.sunk);
      if (!isDefenderAlive) {
        finishGame(game, attackingPlayer);
        return;
      }
    } else {
      sendAttackToAll(game, attackingPlayer, [{ x, y }], 'shot');
    }
  } else {
    safeSetCell(defendingPlayer.board, x, y, 'miss');
    sendAttackToAll(game, attackingPlayer, [{ x, y }], 'miss');
    wasHit = false;
  }
  if (wasHit) {
    if (attackingPlayer.isBot) {
      botMakeMove(game);
    } else {
      broadcastTurn(game);
    }
  } else {
    game.currentPlayer = defendingPlayer.gamePlayerId;

    if (defendingPlayer.isBot) {
      botMakeMove(game);
    } else {
      broadcastTurn(game);
    }
  }
}

function sendAttackToAll(
  game: Game,
  attacker: GamePlayer,
  cells: { x: number; y: number }[],
  status: 'miss' | 'shot' | 'killed',
) {
  for (const cell of cells) {
    for (const player of game.players) {
      send(player.ws, 'attack', { position: cell, currentPlayer: attacker.gamePlayerId, status });
    }
  }
}

function broadcastTurn(game: Game) {
  for (const player of game.players) {
    send(player.ws, 'turn', { currentPlayer: game.currentPlayer });
  }
}

function finishGame(game: Game, winner: GamePlayer) {
  game.finished = true;
  for (const player of game.players) send(player.ws, 'finish', { winPlayer: winner.gamePlayerId });
  const rec = USERS.get(winner.userName);
  if (rec) rec.wins += 1;
  GAMES.delete(game.gameId);
  updateWinnersBroadcast(CONNECTIONS, USERS);
  updateRoomsBroadcast(CONNECTIONS, WAITING_ROOMS);
}

function handleRandomAttack({ gameId, indexPlayer }: RandomAttackData) {
  const game = GAMES.get(String(gameId));
  if (!game || game.finished) return;

  const attackerIndex = game.players.findIndex((player) => player.gamePlayerId === indexPlayer);
  if (attackerIndex === -1) return;

  const attackingPlayer = game.players[attackerIndex];
  const defendingPlayer = game.players[1 - attackerIndex];
  if (!attackingPlayer || !defendingPlayer) return;

  if (game.currentPlayer !== attackingPlayer.gamePlayerId) return;

  defendingPlayer.board ??= createEmptyBoard();

  const targetCell = getRandomAvailableCell(defendingPlayer.board);
  if (!targetCell) return;

  handleAttack({ gameId, x: targetCell.x, y: targetCell.y, indexPlayer });
}

function createSinglePlayerGame(ws: WsWebSocket) {
  const playerName = CONNECTIONS.get(ws);
  if (!playerName) return;
  const gameId = crypto.randomUUID();

  const humanPlayer: GamePlayer = {
    userName: playerName,
    gamePlayerId: crypto.randomUUID(),
    ws: USERS.get(playerName)?.ws ?? null,
    board: createEmptyBoard(),
    ships: [],
  };

  const botPlayer: GamePlayer = {
    userName: 'BOT',
    gamePlayerId: crypto.randomUUID(),
    board: createEmptyBoard(),
    ships: [],
    isBot: true,
  };

  const game: Game = {
    gameId,
    players: [humanPlayer, botPlayer],
    currentPlayer: humanPlayer.gamePlayerId,
  };

  GAMES.set(gameId, game);
  send(humanPlayer.ws, 'create_game', { idGame: gameId, idPlayer: humanPlayer.gamePlayerId });

  return game;
}

export function handleCommand(ws: WsWebSocket, { type, data }: MsgEnvelope) {
  const dataParsed: unknown = data === '' ? '' : JSON.parse(data);

  const message = {
    type,
    data: dataParsed,
    id: 0,
  };

  logIncoming(ws, message);
  switch (type) {
    case 'reg':
      handleCmd(dataParsed, isRegRequestData, (data) => {
        handleReg(ws, data);
      });
      break;
    case 'create_room':
      handleCreateRoom(ws);
      break;
    case 'add_user_to_room':
      handleCmd(dataParsed, isAddUserToRoomRequestData, (data) => {
        handleAddUserToRoom(ws, data);
      });
      break;
    case 'add_ships':
      handleCmd(dataParsed, isAddShipsRequestData, handleAddShips);
      break;
    case 'attack':
      handleCmd(dataParsed, isAttackRequestData, handleAttack);
      break;
    case 'randomAttack':
      handleCmd(dataParsed, isRandomAttackData, handleRandomAttack);
      break;
    case 'single_play':
      createSinglePlayerGame(ws);
      break;
  }
}

function handleCmd<T>(data: unknown, guard: (data: unknown) => data is T, handler: (data: T) => void) {
  const parsed = parseData(data, guard);
  if (parsed) handler(parsed);
}

export function handleCloseConnection(user: string | null) {
  if (!user) return;
  for (const [roomId, room] of WAITING_ROOMS.entries()) {
    if (room.users.includes(user)) WAITING_ROOMS.delete(roomId);
  }
  for (const [gameId, game] of GAMES.entries()) {
    const playerIdx = game.players.findIndex((player) => player.userName === user);
    if (playerIdx >= 0) {
      const opponent = game.players[1 - playerIdx];
      if (!game.finished && opponent) {
        finishGame(game, opponent);
      }
      GAMES.delete(gameId);
    }
  }
  updateWinnersBroadcast(CONNECTIONS, USERS);
  updateRoomsBroadcast(CONNECTIONS, WAITING_ROOMS);
}
