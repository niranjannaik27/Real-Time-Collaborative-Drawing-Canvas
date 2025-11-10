import { DrawingCanvas } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class UIManager {
  constructor() {
    this.userListElement = document.getElementById('user-list');
    this.users = new Map();
    this.currentUserId = null;
  }

  setUsers(users, currentUserId) {
    this.currentUserId = currentUserId;
    this.users.clear();
    users.forEach(user => {
      this.users.set(user.id, user);
    });
    this.renderUserList();
  }

  addUser(user) {
    this.users.set(user.id, user);
    this.renderUserList();
  }

  removeUser(userId) {
    this.users.delete(userId);
    this.renderUserList();
  }

  renderUserList() {
    this.userListElement.innerHTML = '';

    this.users.forEach((user) => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';

      const colorCircle = document.createElement('div');
      colorCircle.className = 'user-color';
      colorCircle.style.backgroundColor = user.color;

      const userName = document.createElement('span');
      userName.className = 'user-name';
      userName.textContent = user.id.substring(0, 8);

      userItem.appendChild(colorCircle);
      userItem.appendChild(userName);

      if (user.id === this.currentUserId) {
        const youBadge = document.createElement('span');
        youBadge.className = 'user-you';
        youBadge.textContent = 'You';
        userItem.appendChild(youBadge);
      }

      this.userListElement.appendChild(userItem);
    });
  }
}

// Initialize application on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Create UI Manager
  const uiManager = new UIManager();

  // Create socket emitter function
  let socketEmitter = null;

  // Create Drawing Canvas
  const canvas = new DrawingCanvas((event, data) => {
    if (socketEmitter) {
      socketEmitter(event, data);
    }
  });

  // Create WebSocket Client
  const wsClient = new WebSocketClient(canvas, uiManager);

  // Set socket emitter
  socketEmitter = (event, data) => {
    wsClient.emit(event, data);
  };

  // Toolbar event listeners
  const colorPicker = document.getElementById('color-picker');
  const strokeWidth = document.getElementById('stroke-width');
  const widthDisplay = document.getElementById('width-display');
  const btnBrush = document.getElementById('btn-brush');
  const btnEraser = document.getElementById('btn-eraser');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');

  // Color picker
  colorPicker.addEventListener('input', (e) => {
    canvas.color = e.target.value;
  });

  // Stroke width
  strokeWidth.addEventListener('input', (e) => {
    canvas.strokeWidth = parseInt(e.target.value);
    widthDisplay.textContent = e.target.value;
  });

  // Brush tool
  btnBrush.addEventListener('click', () => {
    canvas.tool = 'brush';
    btnBrush.classList.add('active');
    btnEraser.classList.remove('active');
  });

  // Eraser tool
  btnEraser.addEventListener('click', () => {
    canvas.tool = 'eraser';
    btnEraser.classList.add('active');
    btnBrush.classList.remove('active');
  });

  // Undo button
  btnUndo.addEventListener('click', () => {
    wsClient.emit('UNDO_REQUEST');
  });

  // Redo button
  btnRedo.addEventListener('click', () => {
    wsClient.emit('REDO_REQUEST');
  });
});
