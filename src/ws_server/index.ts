import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';
import { CONNECTIONS } from './db.js';
import { isMsgEnvelope, parseData } from './typeGuard.js';
import { handleCloseConnection, handleCommand } from './controller.js';

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
      const user = CONNECTIONS.get(ws) || null;
      handleCloseConnection(user);
    });
  });

  return wss;
}
