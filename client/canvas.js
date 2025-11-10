export class DrawingCanvas {
  constructor(socketEmitter) {
    this.socketEmitter = socketEmitter;

    // Get all three canvases
    this.canvasMain = document.getElementById('canvas-main');
    this.canvasTemp = document.getElementById('canvas-temp');
    this.canvasUi = document.getElementById('canvas-ui');

    // Get contexts
    this.mainCtx = this.canvasMain.getContext('2d');
    this.tempCtx = this.canvasTemp.getContext('2d');
    this.uiCtx = this.canvasUi.getContext('2d');

    // Drawing state
    this.isDrawing = false;
    this.currentStroke = null;
    this.tool = 'brush';
    this.color = '#000000';
    this.strokeWidth = 3;

    // Remote strokes (in-progress)
    this.remoteStrokes = new Map();

    // Remote cursors
    this.remoteCursors = new Map();

    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    // Add event listeners to temp canvas
    this.canvasTemp.addEventListener('mousedown', this.handleMouseDown);
    this.canvasTemp.addEventListener('mousemove', this.handleMouseMove);
    this.canvasTemp.addEventListener('mouseup', this.handleMouseUp);
    this.canvasTemp.addEventListener('mouseleave', this.handleMouseLeave);

    // Start UI loop for cursors
    this.startUiLoop();
  }

  getMousePos(e) {
    const rect = this.canvasTemp.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  handleMouseDown(e) {
    this.isDrawing = true;
    const pos = this.getMousePos(e);

    this.currentStroke = {
      id: `${Date.now()}-${Math.random()}`,
      tool: this.tool,
      color: this.color,
      width: this.strokeWidth,
      points: [pos]
    };
  }

  handleMouseMove(e) {
    const pos = this.getMousePos(e);

    // Emit cursor position
    this.socketEmitter('CURSOR_MOVE', { x: pos.x, y: pos.y });

    if (!this.isDrawing || !this.currentStroke) return;

    // Add point to current stroke
    this.currentStroke.points.push(pos);

    // Redraw temp canvas
    this.redrawTempCanvas();

    // Emit stroke points to server
    this.socketEmitter('DRAW_STROKE_POINTS', {
      strokeId: this.currentStroke.id,
      points: this.currentStroke.points
    });
  }

  handleMouseUp(e) {
    if (!this.isDrawing || !this.currentStroke) return;

    const pos = this.getMousePos(e);
    this.currentStroke.points.push(pos);

    // Emit complete stroke to server
    this.socketEmitter('STROKE_COMPLETE', this.currentStroke);

    this.isDrawing = false;
  }

  handleMouseLeave(e) {
    if (this.isDrawing) {
      this.handleMouseUp(e);
    }
  }

  drawStroke(context, strokeObject) {
    if (!strokeObject || !strokeObject.points || strokeObject.points.length === 0) {
      return;
    }

    context.save();
    context.strokeStyle = strokeObject.color;
    context.lineWidth = strokeObject.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Handle eraser tool
    if (strokeObject.tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out';
    } else {
      context.globalCompositeOperation = 'source-over';
    }

    context.beginPath();

    if (strokeObject.points.length === 1) {
      // Single point - draw a dot
      const point = strokeObject.points[0];
      context.arc(point.x, point.y, strokeObject.width / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      // Multiple points - draw line
      context.moveTo(strokeObject.points[0].x, strokeObject.points[0].y);

      for (let i = 1; i < strokeObject.points.length; i++) {
        context.lineTo(strokeObject.points[i].x, strokeObject.points[i].y);
      }

      context.stroke();
    }

    context.restore();
  }

  redrawTempCanvas() {
    // Clear temp canvas
    this.tempCtx.clearRect(0, 0, this.canvasTemp.width, this.canvasTemp.height);

    // Draw current local stroke
    if (this.currentStroke) {
      this.drawStroke(this.tempCtx, this.currentStroke);
    }

    // Draw all remote in-progress strokes
    this.remoteStrokes.forEach((stroke) => {
      this.drawStroke(this.tempCtx, stroke);
    });
  }

  handleCommitStroke(stroke) {
    // Remove from remote strokes if it exists
    this.remoteStrokes.delete(stroke.id);

    // Draw on main canvas
    this.drawStroke(this.mainCtx, stroke);

    // Clear current stroke if it matches
    if (this.currentStroke && this.currentStroke.id === stroke.id) {
      this.currentStroke = null;
    }

    // Redraw temp canvas to remove committed stroke
    this.redrawTempCanvas();
  }

  handleRemoteStrokePoints(data) {
    // Update or create remote stroke
    this.remoteStrokes.set(data.strokeId, {
      id: data.strokeId,
      points: data.points,
      tool: data.tool || 'brush',
      color: data.color || '#000000',
      width: data.width || 3
    });

    this.redrawTempCanvas();
  }

  rebuildCanvas(history) {
    // Clear main canvas
    this.mainCtx.clearRect(0, 0, this.canvasMain.width, this.canvasMain.height);

    // Redraw all strokes from history
    history.forEach((stroke) => {
      this.drawStroke(this.mainCtx, stroke);
    });

    // Clear temp canvas
    this.tempCtx.clearRect(0, 0, this.canvasTemp.width, this.canvasTemp.height);

    // Clear remote strokes
    this.remoteStrokes.clear();
  }

  updateRemoteCursor(userId, x, y) {
    this.remoteCursors.set(userId, { x, y });
  }

  removeRemoteCursor(userId) {
    this.remoteCursors.delete(userId);
  }

  startUiLoop() {
    const animate = () => {
      // Clear UI canvas
      this.uiCtx.clearRect(0, 0, this.canvasUi.width, this.canvasUi.height);

      // Draw all remote cursors
      this.remoteCursors.forEach((cursor, userId) => {
        this.drawCursor(cursor.x, cursor.y);
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  drawCursor(x, y) {
    this.uiCtx.save();
    this.uiCtx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    this.uiCtx.strokeStyle = 'white';
    this.uiCtx.lineWidth = 2;

    // Draw cursor as a circle
    this.uiCtx.beginPath();
    this.uiCtx.arc(x, y, 5, 0, Math.PI * 2);
    this.uiCtx.fill();
    this.uiCtx.stroke();

    this.uiCtx.restore();
  }
}
