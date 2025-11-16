import { randomUUID } from 'node:crypto';
import { BOARD_SIZE, createEmptyBoard, safeSetCell } from './gameController.js';
import { getRandomAvailableCell } from './utils.js';
import { handleAttack } from './controller.js';

const BOT_SHIP_SET: ShipSet = [
  { length: 4, type: 'huge' },
  { length: 3, type: 'large' },
  { length: 3, type: 'large' },
  { length: 2, type: 'medium' },
  { length: 2, type: 'medium' },
  { length: 2, type: 'medium' },
  { length: 1, type: 'small' },
  { length: 1, type: 'small' },
  { length: 1, type: 'small' },
  { length: 1, type: 'small' },
];

export function generateBotShips(): ShipInstance[] {
  const board = createEmptyBoard();
  const ships: ShipInstance[] = [];

  for (const spec of BOT_SHIP_SET) {
    let shipPlaced = false;
    let attempts = 0;

    while (!shipPlaced && attempts < 1000) {
      attempts++;
      const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';

      let x, y;
      if (direction === 'horizontal') {
        x = Math.floor(Math.random() * (BOARD_SIZE - spec.length + 1));
        y = Math.floor(Math.random() * BOARD_SIZE);
      } else {
        x = Math.floor(Math.random() * BOARD_SIZE);
        y = Math.floor(Math.random() * (BOARD_SIZE - spec.length + 1));
      }

      if (canPlaceShip(board, x, y, spec.length, direction)) {
        const cells: Cell[] = [];
        for (let i = 0; i < spec.length; i++) {
          const cellX = direction === 'horizontal' ? x + i : x;
          const cellY = direction === 'horizontal' ? y : y + i;
          cells.push({ x: cellX, y: cellY });
          safeSetCell(board, cellX, cellY, 'ship');
        }

        ships.push({
          id: randomUUID(),
          type: spec.type,
          cells,
          hits: [],
          sunk: false,
        });

        markSurroundingCells(board, cells);
        shipPlaced = true;
      }
    }

    if (!shipPlaced) {
      throw new Error(`Failed to place ship of length ${String(spec.length)} after 1000 attempts`);
    }
  }

  return ships;
}

function canPlaceShip(
  board: Board,
  startX: number,
  startY: number,
  length: number,
  direction: 'horizontal' | 'vertical',
): boolean {
  for (let i = 0; i < length; i++) {
    const x = direction === 'horizontal' ? startX + i : startX;
    const y = direction === 'horizontal' ? startY : startY + i;

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return false;
    }
    if (board[y] && board[y][x] !== 'empty') {
      return false;
    }

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborX = x + dx;
        const neighborY = y + dy;

        if (neighborX < 0 || neighborX >= BOARD_SIZE || neighborY < 0 || neighborY >= BOARD_SIZE) {
          continue;
        }

        if (board[neighborY] && board[neighborY][neighborX] === 'ship') {
          return false;
        }
      }
    }
  }

  return true;
}

function markSurroundingCells(board: Board, shipCells: Cell[]) {
  for (const cell of shipCells) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = cell.x + dx;
        const y = cell.y + dy;

        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
          continue;
        }

        if (dx === 0 && dy === 0) {
          continue;
        }

        if (board[y] && board[y][x] === 'empty') {
          safeSetCell(board, x, y, 'miss');
        }
      }
    }
  }
}

export function setupBotShips(botPlayer: GamePlayer) {
  botPlayer.ships = generateBotShips();
  botPlayer.board = createEmptyBoard();
  for (const ship of botPlayer.ships) {
    for (const cell of ship.cells) {
      safeSetCell(botPlayer.board, cell.x, cell.y, 'ship');
    }
  }
}

export function botMakeMove(game: Game) {
  const botPlayer = game.players.find((player) => player.isBot);
  const humanPlayer = game.players.find((player) => !player.isBot);

  if (!botPlayer || !humanPlayer || !humanPlayer.board) return;
  if (game.currentPlayer !== botPlayer.gamePlayerId) return;

  const target = getRandomAvailableCell(humanPlayer.board);
  if (!target) return;

  setTimeout(() => {
    handleAttack({ gameId: game.gameId, x: target.x, y: target.y, indexPlayer: botPlayer.gamePlayerId });
  }, 500);
}
