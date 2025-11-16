const BOARD_SIZE = 10;

export function safeSetCell(board: string[][], x: number, y: number, value: string) {
  if (y >= 0 && y < board.length && x >= 0 && board[y] && x < board[y].length) {
    board[y][x] = value;
  }
}

export function createEmptyBoard(): ('empty' | 'ship' | 'hit' | 'miss' | 'killed')[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => 'empty'));
}

export function buildShipCells(position: Cell, direction: boolean, length: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < length; i++) {
    const x = direction ? position.x : position.x + i;
    const y = direction ? position.y + i : position.y;
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) cells.push({ x, y });
  }
  return cells;
}
