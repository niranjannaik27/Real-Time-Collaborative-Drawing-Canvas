export class WebSocketClient {
  constructor(canvas, uiManager) {
    this.canvas = canvas;
    this.uiManager = uiManager;
    this.socket = io();
    this.currentUser = null;

    this.initializeListeners();
  }

  initializeListeners() {
    // Welcome event - sent to new user on connection
    this.socket.on('WELCOME', (data) => {
      console.log('Connected to server', data);
      this.currentUser = data.user;

      // Rebuild canvas with history
      this.canvas.rebuildCanvas(data.history);

      // Update user list
      this.uiManager.setUsers(data.users, this.currentUser.id);
    });

    // User joined event
    this.socket.on('USER_JOINED', (data) => {
      console.log('User joined', data.user);
      this.uiManager.addUser(data.user);
    });

    // User left event
    this.socket.on('USER_LEFT', (data) => {
      console.log('User left', data.userId);
      this.uiManager.removeUser(data.userId);
      this.canvas.removeRemoteCursor(data.userId);
    });

    // Remote stroke points (in-progress)
    this.socket.on('REMOTE_STROKE_POINTS', (data) => {
      this.canvas.handleRemoteStrokePoints(data);
    });

    // Commit stroke (final stroke from server)
    this.socket.on('COMMIT_STROKE', (data) => {
      this.canvas.handleCommitStroke(data.stroke);
    });

    // Rebuild canvas (after undo/redo)
    this.socket.on('REBUILD_CANVAS', (data) => {
      this.canvas.rebuildCanvas(data.history);
    });

    // Remote cursor movement
    this.socket.on('REMOTE_CURSOR', (data) => {
      this.canvas.updateRemoteCursor(data.userId, data.x, data.y);
    });
  }

  emit(event, data) {
    this.socket.emit(event, data);
  }

  getCurrentUser() {
    return this.currentUser;
  }
}
