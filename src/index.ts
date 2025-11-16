import { startHttpServer } from './http_server/index.js';
import { startWebsocketServer } from './ws_server/index.js';
import { loadEnvFile } from 'node:process';

loadEnvFile();

const WEB_SOCKET_PORT = Number(process.env['WEB_SOCKET_PORT'] || '3000');
const HTTP_PORT = Number(process.env['HTTP_PORT'] || '8181');

startWebsocketServer(WEB_SOCKET_PORT);
startHttpServer(HTTP_PORT);
