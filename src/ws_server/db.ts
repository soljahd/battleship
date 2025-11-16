export const CONNECTIONS: Map<WsWebSocket, string | null> = new Map();
export const USERS: Map<string, PlayerRecord> = new Map();
export const WAITING_ROOMS: Map<string, Room> = new Map();
export const GAMES: Map<string, Game> = new Map();

USERS.set('BOT', { name: 'BOT', password: '', wins: 0 });

export function deleteRoomByUser(userId: string) {
  for (const [roomId, room] of WAITING_ROOMS.entries()) {
    if (room.users.includes(userId)) {
      WAITING_ROOMS.delete(roomId);
      return true;
    }
  }
  return false;
}
