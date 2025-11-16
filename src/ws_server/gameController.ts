export const BOARD_SIZE = 10;

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

export function uniqueCells(cells: Cell[]): Cell[] {
  const map = new Map<string, Cell>();
  for (const cell of cells) map.set(`${String(cell.x)},${String(cell.y)}`, cell);
  return Array.from(map.values());
}

export function getSurroundingUniqueCells(cells: Cell[]): Cell[] {
  const allSurrounding: Cell[] = [];
  for (const { x, y } of cells) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
          allSurrounding.push({ x: nx, y: ny });
        }
      }
    }
  }
  return uniqueCells(allSurrounding);
}
