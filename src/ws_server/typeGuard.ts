export function parseData<T>(data: unknown, typeGuard: (data: unknown) => data is T): T | null {
  return typeGuard(data) ? data : null;
}

export function isMsgEnvelope(data: unknown): data is MsgEnvelope {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof data.type === 'string' &&
    'data' in data &&
    typeof data.data === 'string' &&
    'id' in data &&
    data.id === 0
  );
}

export function isRegRequestData(data: unknown): data is RegRequestData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'password' in data &&
    typeof data.name === 'string' &&
    typeof data.password === 'string'
  );
}

export function isAddUserToRoomRequestData(data: unknown): data is AddUserToRoomRequestData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'indexRoom' in data &&
    (typeof data.indexRoom === 'string' || typeof data.indexRoom === 'number')
  );
}

export function isShip(data: unknown): data is Ship {
  return (
    data !== null &&
    typeof data === 'object' &&
    'position' in data &&
    typeof data.position === 'object' &&
    data.position !== null &&
    'x' in data.position &&
    'y' in data.position &&
    'direction' in data &&
    'length' in data &&
    'type' in data &&
    typeof data.position === 'object' &&
    typeof data.position.x === 'number' &&
    typeof data.position.y === 'number' &&
    typeof data.direction === 'boolean' &&
    typeof data.length === 'number' &&
    typeof data.type === 'string' &&
    ['small', 'medium', 'large', 'huge'].includes(data.type)
  );
}

export function isAddShipsRequestData(data: unknown): data is AddShipsRequestData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'gameId' in data &&
    'ships' in data &&
    'indexPlayer' in data &&
    data.gameId !== null &&
    (typeof data.gameId === 'number' || typeof data.gameId === 'string') &&
    (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string') &&
    Array.isArray(data.ships) &&
    data.ships.every(isShip)
  );
}

export function isAttackRequestData(data: unknown): data is AttackRequestData {
  return (
    data !== null &&
    typeof data === 'object' &&
    'gameId' in data &&
    'indexPlayer' in data &&
    'x' in data &&
    'y' in data &&
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    (typeof data.gameId === 'number' || typeof data.gameId === 'string') &&
    (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string')
  );
}
