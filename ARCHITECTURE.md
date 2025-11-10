# Collaborative Canvas Architecture

## Overview

This document describes the architecture of the Real-Time Collaborative Canvas application, focusing on the data flow, client-server interactions, and synchronization mechanisms.

## System Components

### Backend Components

#### 1. Express Server (`server/server.js`)
- Serves static files from the `client/` directory
- Initializes HTTP server for Socket.io
- Manages WebSocket connections

#### 2. Drawing State Manager (`server/drawing-state.js`)
- **Server-Authoritative**: Single source of truth for all drawing history
- Maintains two stacks:
  - `historyStack`: All committed strokes
  - `redoStack`: Strokes that have been undone
- Operations:
  - `addStroke(stroke)`: Adds to history, clears redo stack
  - `undo()`: Moves stroke from history to redo
  - `redo()`: Moves stroke from redo to history
  - `getHistory()`: Returns complete history

### Frontend Components

#### 1. Three-Layer Canvas System (`client/index.html`)

**Layer 1: Main Canvas (`canvas-main`, z-index: 1)**
- Displays all committed, permanent strokes
- Only updated when receiving `COMMIT_STROKE` or `REBUILD_CANVAS` events
- Never cleared except during full rebuilds

**Layer 2: Temp Canvas (`canvas-temp`, z-index: 2)**
- Shows in-progress strokes (both local and remote)
- Continuously redrawn during drawing operations
- Cleared when strokes are committed

**Layer 3: UI Canvas (`canvas-ui`, z-index: 3)**
- Renders remote user cursors
- Updated via `requestAnimationFrame` loop
- Pointer events disabled (non-interactive)

#### 2. Drawing Canvas (`client/canvas.js`)
Responsibilities:
- Handle mouse events (mousedown, mousemove, mouseup)
- Implement `drawStroke()` function with support for brush and eraser tools
- Manage local in-progress strokes
- Store remote in-progress strokes in `remoteStrokes` Map
- Redraw temp canvas on every mouse move
- Update and render remote cursors

#### 3. WebSocket Client (`client/websocket.js`)
Responsibilities:
- Initialize Socket.io connection
- Handle all incoming socket events
- Delegate work to canvas and UI manager
- Provide `emit()` method for outgoing events

#### 4. UI Manager (`client/main.js`)
Responsibilities:
- Manage user list DOM rendering
- Handle toolbar interactions
- Initialize and coordinate canvas and WebSocket client

## Data Flow

### Drawing Flow (Client-Side Prediction)

```
1. User mousedown
   ↓
2. Create currentStroke object locally
   ↓
3. User mousemove
   ↓
4. Add points to currentStroke
   ↓
5. Redraw temp canvas (local prediction)
   ↓
6. Emit DRAW_STROKE_POINTS to server
   ↓
7. Server broadcasts REMOTE_STROKE_POINTS to others
   ↓
8. Other clients add to remoteStrokes Map
   ↓
9. Other clients redraw their temp canvas
```

### Stroke Commitment Flow

```
1. User mouseup
   ↓
2. Emit STROKE_COMPLETE to server
   ↓
3. Server adds stroke to drawingState.historyStack
   ↓
4. Server broadcasts COMMIT_STROKE to ALL clients (including sender)
   ↓
5. All clients receive COMMIT_STROKE
   ↓
6. All clients draw stroke on main canvas
   ↓
7. All clients remove stroke from temp canvas
   ↓
8. All clients clear remoteStrokes for that strokeId
```

### Undo/Redo Flow

```
1. User clicks Undo button
   ↓
2. Emit UNDO_REQUEST to server
   ↓
3. Server calls drawingState.undo()
   ↓
4. Server broadcasts REBUILD_CANVAS with entire history
   ↓
5. All clients receive REBUILD_CANVAS
   ↓
6. All clients clear main canvas
   ↓
7. All clients loop through history and redraw all strokes
   ↓
8. All clients clear temp canvas and remote strokes
```

## Synchronization Mechanisms

### 1. Server-Authoritative State
- All drawing history is stored on the server
- Server is the single source of truth
- Clients never make local decisions about history

### 2. Client-Side Prediction
- Clients immediately show their own strokes for smooth UX
- These are "predictions" until server confirms
- Server confirmation via `COMMIT_STROKE` reconciles predictions

### 3. Global Operations
- Undo/Redo affect all users simultaneously
- Full canvas rebuild ensures consistency
- Simple but effective approach (trade-off: performance for correctness)

### 4. Eventual Consistency
- In-progress strokes may differ slightly between clients (network latency)
- All committed strokes are guaranteed consistent
- Canvas rebuilds reset any inconsistencies

## Tool Implementation

### Brush Tool
```javascript
context.globalCompositeOperation = 'source-over';
context.strokeStyle = strokeObject.color;
context.lineWidth = strokeObject.width;
// Draw path through points
```

### Eraser Tool
```javascript
context.globalCompositeOperation = 'destination-out';
context.lineWidth = strokeObject.width;
// Draw path through points (removes pixels)
```

## Performance Considerations

### Optimizations
1. **Temp Canvas Redraws**: Only redraws during active drawing
2. **UI Canvas Loop**: Uses `requestAnimationFrame` for smooth cursor rendering
3. **Pointer Events Disabled**: UI canvas doesn't interfere with mouse events

### Trade-offs
1. **Full Rebuilds**: Simple but not scalable to very large histories
2. **Broadcast to All**: Including sender ensures consistency but adds network overhead
3. **No Delta Updates**: Could optimize with incremental updates instead of full rebuilds

## Extension Points

### Easy to Add
- Clear canvas button (emit `CLEAR_REQUEST`, server clears history)
- Save/Load drawings (serialize history to JSON)
- More tools (line, rectangle, circle)
- Stroke preview before commit
- User names and avatars

### Moderate Complexity
- Selective undo/redo (per-user)
- Layers
- Stroke selection and editing
- Pan and zoom

### Complex
- Operational Transform for undo/redo
- Vector graphics instead of raster
- Infinite canvas
- Conflict resolution for concurrent edits

## Security Considerations

### Current Implementation
- No authentication or authorization
- No input validation
- No rate limiting
- Public server

### Production Requirements
- Add user authentication
- Validate stroke data server-side
- Rate limit events per user
- Sanitize user inputs
- Add CORS configuration
- Use HTTPS/WSS
- Implement room/session management
- Add stroke data size limits

## Scalability Considerations

### Current Limitations
- Single server process
- In-memory state (lost on restart)
- All users share single canvas
- No horizontal scaling

### Scaling Strategies
1. **Persistence**: Store drawing state in database
2. **Rooms**: Separate canvases for different groups
3. **Redis**: Use Redis Adapter for Socket.io multi-server setup
4. **Microservices**: Separate drawing state service
5. **CDN**: Serve static files from CDN
6. **Load Balancer**: Distribute WebSocket connections

## Testing Strategy

### Unit Tests
- DrawingState class methods
- Canvas drawing functions
- Coordinate transformations

### Integration Tests
- Socket.io event handlers
- Full drawing flow
- Undo/redo consistency

### E2E Tests
- Multiple browser instances
- Concurrent drawing
- Network latency simulation
- Reconnection handling

## Conclusion

This architecture prioritizes:
1. **Simplicity**: Easy to understand and modify
2. **Consistency**: Server-authoritative ensures all clients stay in sync
3. **Real-time UX**: Client-side prediction provides immediate feedback
4. **Extensibility**: Clear separation of concerns enables easy feature additions

The trade-off is scalability - for very large drawings or many concurrent users, optimizations would be needed.
