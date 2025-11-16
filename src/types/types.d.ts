type WsWebSocket = import('ws').WebSocket;

type CmdType =
  | 'reg'
  | 'update_winners'
  | 'create_room'
  | 'add_user_to_room'
  | 'create_game'
  | 'update_room'
  | 'add_ships'
  | 'start_game'
  | 'attack'
  | 'randomAttack'
  | 'turn'
  | 'finish'
  | 'single_play';

type MsgEnvelope = {
  type: CmdType;
  data: string;
  id: 0;
};

type Cell = {
  x: number;
  y: number;
};

type ShipSpec = {
  position: Cell;
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

type ShipInstance = {
  id: string;
  type: ShipSpec['type'];
  cells: Cell[];
  hits: Cell[];
  sunk: boolean;
};

type PlayerRecord = {
  name: string;
  password: string;
  wins: number;
  ws?: WsWebSocket | null;
};

type Room = {
  roomId: string;
  users: string[];
};

type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'killed';

type Board = CellState[][];

type GamePlayer = {
  userName: string;
  gamePlayerId: string;
  ws?: WsWebSocket | null;
  ships?: ShipInstance[];
  board?: Board;
  isBot?: boolean;
};

type Game = { gameId: string; players: [GamePlayer, GamePlayer]; currentPlayer: string; finished?: boolean };

type RegRequestData = {
  name: string;
  password: string;
};

type AddUserToRoomRequestData = {
  indexRoom: number | string;
};

type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
};

type AddShipsRequestData = {
  gameId: number | string;
  ships: Ship[];
  indexPlayer: number | string;
};

type AttackRequestData = {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
};

type RandomAttackData = {
  gameId: number | string;
  indexPlayer: number | string;
};

type ShipSet = Omit<Ship, 'position' | 'direction'>[];
