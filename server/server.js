const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize drawing state
const drawingState = new DrawingState();

// Store connected users
const users = new Map();

// Generate random color for new users
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create new user
  const newUser = {
    id: socket.id,
    color: getRandomColor()
  };

  users.set(socket.id, newUser);

  // Send welcome event to new user
  socket.emit('WELCOME', {
    user: newUser,
    history: drawingState.getHistory(),
    users: Array.from(users.values())
  });

  // Broadcast to other users that a new user joined
  socket.broadcast.emit('USER_JOINED', { user: newUser });

  // Handle drawing stroke points (in-progress strokes)
  socket.on('DRAW_STROKE_POINTS', (data) => {
    socket.broadcast.emit('REMOTE_STROKE_POINTS', {
      userId: socket.id,
      points: data.points,
      strokeId: data.strokeId
    });
  });

  // Handle stroke completion
  socket.on('STROKE_COMPLETE', (stroke) => {
    drawingState.addStroke(stroke);
    // Broadcast to ALL clients including sender
    io.emit('COMMIT_STROKE', { stroke });
  });

  // Handle undo request
  socket.on('UNDO_REQUEST', () => {
    const success = drawingState.undo();
    if (success) {
      io.emit('REBUILD_CANVAS', {
        history: drawingState.getHistory()
      });
    }
  });

  // Handle redo request
  socket.on('REDO_REQUEST', () => {
    const success = drawingState.redo();
    if (success) {
      io.emit('REBUILD_CANVAS', {
        history: drawingState.getHistory()
      });
    }
  });

  // Handle cursor movement
  socket.on('CURSOR_MOVE', (data) => {
    socket.broadcast.emit('REMOTE_CURSOR', {
      userId: socket.id,
      x: data.x,
      y: data.y
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    users.delete(socket.id);
    socket.broadcast.emit('USER_LEFT', { userId: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
