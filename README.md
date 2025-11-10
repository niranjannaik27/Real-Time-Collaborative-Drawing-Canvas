# Real-Time Collaborative Canvas

A real-time collaborative drawing application built with Node.js, Express, Socket.io, and vanilla JavaScript.

## Features

- **Real-time Collaboration**: Multiple users can draw simultaneously on the same canvas
- **Client-Side Prediction**: Smooth drawing experience with local prediction and server reconciliation
- **Drawing Tools**: Brush and eraser tools with customizable colors and stroke widths
- **Global Undo/Redo**: Server-authoritative undo/redo that synchronizes across all clients
- **User Presence**: See other connected users with color-coded indicators
- **Remote Cursors**: View real-time cursor positions of other users

## Architecture

The application uses a three-layer canvas system:
1. **Main Canvas**: Displays committed, permanent strokes
2. **Temp Canvas**: Shows in-progress strokes (local and remote)
3. **UI Canvas**: Renders remote user cursors

All drawing state is managed server-side, ensuring consistency across all clients.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## Usage

- Select a **color** and **stroke width** from the toolbar
- Choose between **Brush** and **Eraser** tools
- Draw on the canvas by clicking and dragging
- Use **Undo** and **Redo** buttons to modify the drawing history (affects all users)
- View connected users in the sidebar

## Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas, CSS3
- **Real-time Communication**: WebSocket via Socket.io

## Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML structure
│   ├── style.css           # Styling
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client
│   └── main.js             # Application entry point
├── server/
│   ├── server.js           # Express server and Socket.io setup
│   └── drawing-state.js    # Server-side drawing state management
├── package.json            # Dependencies and scripts
├── README.md               # This file
└── ARCHITECTURE.md         # Detailed architecture documentation
```

## WebSocket Events

### Client → Server
- `DRAW_STROKE_POINTS`: Sends in-progress stroke points
- `STROKE_COMPLETE`: Sends completed stroke
- `UNDO_REQUEST`: Request global undo
- `REDO_REQUEST`: Request global redo
- `CURSOR_MOVE`: Sends cursor position

### Server → Client
- `WELCOME`: Sent to new user with drawing history and user list
- `USER_JOINED`: Broadcast when a new user connects
- `USER_LEFT`: Broadcast when a user disconnects
- `REMOTE_STROKE_POINTS`: Broadcast in-progress strokes
- `COMMIT_STROKE`: Broadcast completed strokes to all clients
- `REBUILD_CANVAS`: Broadcast after undo/redo with full history
- `REMOTE_CURSOR`: Broadcast cursor positions

## License

ISC
# Real-Time-Collaborative-Drawing-Canvas
