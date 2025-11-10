class DrawingState {
  constructor() {
    this.historyStack = [];
    this.redoStack = [];
  }

  addStroke(stroke) {
    this.historyStack.push(stroke);
    this.redoStack = [];
    return true;
  }

  undo() {
    if (this.historyStack.length === 0) {
      return false;
    }
    const stroke = this.historyStack.pop();
    this.redoStack.push(stroke);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) {
      return false;
    }
    const stroke = this.redoStack.pop();
    this.historyStack.push(stroke);
    return true;
  }

  getHistory() {
    return this.historyStack;
  }
}

module.exports = DrawingState;
