import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';

function parseData<T>(data: unknown, typeGuard: (data: unknown) => data is T): T | null {
  return typeGuard(data) ? data : null;
}

function isMsgEnvelope(data: unknown): data is MsgEnvelope {
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

const CONNECTIONS: Map<WsWebSocket, string | null> = new Map();

function handleCommand(ws: WsWebSocket, { type, data }: MsgEnvelope) {
  const dataParsed: unknown = data === '' ? '' : JSON.parse(data);
  console.log(ws, dataParsed);
  switch (type) {
    case 'reg': {
      break;
    }

    case 'create_room': {
      break;
    }

    case 'add_user_to_room': {
      break;
    }

    case 'add_ships': {
      break;
    }

    case 'attack': {
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

export function startWebsocketServer(port: number) {
  const wss = new WebSocketServer({ port });
  console.log(`Start WebSocket server on the ${String(port)} port!`);

  wss.on('connection', (ws: WsWebSocket) => {
    CONNECTIONS.set(ws, null);

    ws.on('message', (raw) => {
      const text = Buffer.isBuffer(raw) ? raw.toString('utf-8') : typeof raw === 'string' ? raw : JSON.stringify(raw);
      try {
        const envelope = parseData<MsgEnvelope>(JSON.parse(text), isMsgEnvelope);
        if (envelope) handleCommand(ws, envelope);
      } catch (error) {
        console.error(error);
        return;
      }
    });

    ws.on('close', () => {
      CONNECTIONS.delete(ws);
    });
  });

  return wss;
}
