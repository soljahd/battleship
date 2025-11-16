# Battleship WebSocket Server

This project implements the backend for a real-time Battleship game using **WebSocket**.
It follows the technical requirements of the RS School Node.js course module.

## Features

- WebSocket server built with Node.js
- Player authentication (in-memory storage)
- Game room creation and matchmaking
- Full Battleship game logic
- Support for playing against another player or a single-player **bot mode**
- Real-time updates:
  - rooms list
  - game start
  - player turns
  - attacks
  - ship kills
  - game finish
  - winners table

- JSON-based request/response protocol

## Available Commands

The server supports all protocol commands required by the RS School assignment:

- `reg` — login or register a player
- `create_room` — create a new game room
- `add_user_to_room` — join a room
- `add_ships` — send ship placement
- `attack` — perform a shot
- `randomAttack` — bot or auto-shot
- `single_play` — start a game against bot
- Responses: `update_room`, `update_winners`, `create_game`, `start_game`, `turn`, `attack`, `finish`

## Bot Mode

The server includes a simple AI opponent:

- random movement
- delayed attacks for natural gameplay
- full compatibility with standard game flow

## Running the Server

```bash
npm install
```

```bash
npm run start:dev
```

or

```bash
npm run start:prod
```

## Logging

The server logs every incoming command and every outgoing response for debugging and transparency.
