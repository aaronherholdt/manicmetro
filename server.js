const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');
const cors = require('cors');

// Load environment variables from .env file if it exists
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // In production, replace with specific origins
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(compression()); // Compress responses
app.use(cors());
app.use(express.static(path.join(__dirname, './'))); // Serve static files from current directory

// Game rooms storage
const gameRooms = new Map();

// Player data storage
const players = new Map();

// Generate a random room code (4 uppercase letters)
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Create a new game room
function createGameRoom() {
  let roomCode;
  
  // Ensure uniqueness
  do {
    roomCode = generateRoomCode();
  } while (gameRooms.has(roomCode));
  
  const room = {
    id: roomCode,
    players: [],
    gameStarted: false,
    createdAt: Date.now(),
    stations: [],
    lines: [],
    objectives: []
  };
  
  gameRooms.set(roomCode, room);
  return room;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Player joins game
  socket.on('join_game', (data) => {
    const { playerName, roomCode } = data;
    let room;
    
    // If room code provided, join that room if it exists
    if (roomCode && gameRooms.has(roomCode)) {
      room = gameRooms.get(roomCode);
      
      // Check if game already started or room is full
      if (room.gameStarted) {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }
      
      if (room.players.length >= 4) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
    } else {
      // Create a new room
      room = createGameRoom();
    }
    
    // Create player
    const player = {
      id: socket.id,
      name: playerName,
      isHost: room.players.length === 0, // First player is host
      score: 0,
      joinedAt: Date.now()
    };
    
    // Add player to room
    room.players.push(player);
    players.set(socket.id, { playerId: player.id, roomId: room.id });
    
    // Join the socket.io room
    socket.join(room.id);
    
    // Inform client about the room and player details
    socket.emit('game_joined', {
      roomCode: room.id,
      playerId: player.id,
      isHost: player.isHost,
      players: room.players
    });
    
    // Inform all players in the room about the new player
    io.to(room.id).emit('player_joined', {
      players: room.players
    });
    
    console.log(`Player ${playerName} joined room ${room.id}`);
  });
  
  // Start game
  socket.on('start_game', () => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (!room) return;
    
    // Check if player is host
    const player = room.players.find(p => p.id === playerData.playerId);
    if (!player || !player.isHost) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }
    
    // Start the game
    room.gameStarted = true;
    
    // Assign roles and station shapes
    const roles = assignRoles(room.players);
    const stationShapes = assignStationShapes(room.players);
    
    // Generate initial objectives
    const objectives = generateObjectives();
    room.objectives = objectives;
    
    // Inform all players that game is starting
    io.to(room.id).emit('game_started', {
      players: room.players,
      roles: roles,
      stationShapes: stationShapes,
      objectives: objectives
    });
    
    console.log(`Game started in room ${room.id}`);
  });
  
  // Handle game actions
  socket.on('game_action', (data) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (!room || !room.gameStarted) return;
    
    // Add player ID to action
    data.playerId = playerData.playerId;
    data.timestamp = Date.now();
    
    // Process the action
    processGameAction(room, data);
    
    // Broadcast the action to all other players
    socket.to(room.id).emit('game_action', data);
  });
  
  // Handle teamwork actions
  socket.on('teamwork_action', (data) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (!room || !room.gameStarted) return;
    
    // Add player ID to action
    data.playerId = playerData.playerId;
    data.timestamp = Date.now();
    
    // Broadcast the teamwork action to all players
    io.to(room.id).emit('teamwork_action', data);
  });
  
  // Handle objective completion
  socket.on('objective_progress', (data) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (!room || !room.gameStarted) return;
    
    // Update objective progress in room state
    const { objectiveId, progress, completed } = data;
    const objective = room.objectives.find(o => o.id === objectiveId);
    
    if (objective) {
      objective.progress = progress;
      objective.completed = completed || false;
      
      // Broadcast the updated objective to all players
      io.to(room.id).emit('objective_updated', {
        objectiveId,
        progress,
        completed: objective.completed,
        playerId: playerData.playerId
      });
    }
  });
  
  // End mission
  socket.on('end_mission', (data) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (!room || !room.gameStarted) return;
    
    // Mark mission as ended
    room.missionEnded = true;
    room.missionSuccess = data.success;
    
    // Broadcast mission end to all players
    io.to(room.id).emit('mission_ended', {
      success: data.success,
      stats: data.stats
    });
  });
  
  // Player disconnected
  socket.on('disconnect', () => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const room = gameRooms.get(playerData.roomId);
    if (room) {
      // Remove player from room
      const playerIndex = room.players.findIndex(p => p.id === playerData.playerId);
      if (playerIndex !== -1) {
        const disconnectedPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        console.log(`Player ${disconnectedPlayer.name} left room ${room.id}`);
        
        // If the room is empty, remove it
        if (room.players.length === 0) {
          gameRooms.delete(room.id);
          console.log(`Room ${room.id} removed (empty)`);
        } else {
          // If the host left, assign a new host
          if (disconnectedPlayer.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
          }
          
          // Inform remaining players
          io.to(room.id).emit('player_left', {
            playerId: disconnectedPlayer.id,
            players: room.players
          });
        }
      }
    }
    
    // Remove player data
    players.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Process game actions and update room state
function processGameAction(room, action) {
  switch (action.type) {
    case 'add_station':
      // Add station to room state
      const stationId = room.stations.length;
      const station = {
        id: stationId,
        x: action.x,
        y: action.y,
        type: action.stationType,
        passengers: []
      };
      room.stations.push(station);
      break;
      
    case 'new_line':
      // Add line to room state
      const lineId = room.lines.length;
      const line = {
        id: lineId,
        color: action.color,
        ownerId: action.ownerId,
        stations: []
      };
      room.lines.push(line);
      break;
      
    case 'connect_station':
      // Add station to line
      const targetLine = room.lines.find(l => l.id === action.lineId);
      if (targetLine) {
        // Prevent adding if already the last station
        if (targetLine.stations.length > 0 && 
            targetLine.stations[targetLine.stations.length - 1] === action.stationId) {
          return;
        }
        targetLine.stations.push(action.stationId);
      }
      break;
      
    case 'passenger_delivered':
      // Update player score
      const player = room.players.find(p => p.id === action.playerId);
      if (player) {
        player.score += 1;
      }
      break;
  }
}

// Assign roles to players
function assignRoles(players) {
  const roles = [
    { name: 'Line Manager', icon: 'line', description: 'Create efficient subway lines connecting stations' },
    { name: 'Station Planner', icon: 'station', description: 'Place stations at strategic locations' },
    { name: 'Traffic Coordinator', icon: 'traffic', description: 'Ensure smooth passenger flow and prevent overcrowding' },
    { name: 'Network Designer', icon: 'network', description: 'Design the overall network layout and plan for expansions' }
  ];
  
  const playerRoles = {};
  
  // Assign roles based on player index
  players.forEach((player, index) => {
    playerRoles[player.id] = roles[index % roles.length];
  });
  
  return playerRoles;
}

// Assign station shapes to players
function assignStationShapes(players) {
  const shapes = ['circle', 'square', 'triangle', 'diamond'];
  const playerShapes = {};
  
  // Assign shapes based on player index
  players.forEach((player, index) => {
    playerShapes[player.id] = shapes[index % shapes.length];
  });
  
  return playerShapes;
}

// Generate objectives
function generateObjectives() {
  const objectiveTypes = [
    { type: 'passenger_count', description: 'Deliver {count} passengers', target: 10 },
    { type: 'line_count', description: 'Build {count} subway lines', target: 3 },
    { type: 'station_count', description: 'Build {count} stations', target: 5 },
    { type: 'shape_connection', description: 'Connect all {shape} stations', target: 'all', shape: 'circle' },
    { type: 'time_challenge', description: 'Deliver {count} passengers within {time} seconds', target: 5, time: 60 }
  ];
  
  // Generate 5 random objectives
  const objectives = [];
  
  for (let i = 0; i < 5; i++) {
    const randomType = objectiveTypes[Math.floor(Math.random() * objectiveTypes.length)];
    
    // Create a deep copy to avoid sharing references
    const objective = JSON.parse(JSON.stringify(randomType));
    
    // Add unique ID and progress tracking
    objective.id = uuidv4();
    objective.progress = 0;
    objective.completed = false;
    
    // Format description
    if (objective.type === 'passenger_count') {
      objective.description = objective.description.replace('{count}', objective.target);
    } else if (objective.type === 'line_count') {
      objective.description = objective.description.replace('{count}', objective.target);
    } else if (objective.type === 'station_count') {
      objective.description = objective.description.replace('{count}', objective.target);
    } else if (objective.type === 'shape_connection') {
      // Randomly select one of the shapes
      const shapes = ['circle', 'square', 'triangle', 'diamond'];
      objective.shape = shapes[Math.floor(Math.random() * shapes.length)];
      objective.description = objective.description.replace('{shape}', objective.shape);
    } else if (objective.type === 'time_challenge') {
      objective.description = objective.description
        .replace('{count}', objective.target)
        .replace('{time}', objective.time);
    }
    
    objectives.push(objective);
  }
  
  return objectives;
}

// Cleanup old rooms periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  gameRooms.forEach((room, roomId) => {
    // Remove rooms older than 3 hours with no activity
    if (now - room.lastActivity > 3 * 60 * 60 * 1000) {
      gameRooms.delete(roomId);
      console.log(`Removed inactive room: ${roomId}`);
    }
  });
}, 10 * 60 * 1000);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Get list of active game rooms (for admin/debug purposes)
app.get('/api/rooms', (req, res) => {
  const roomsData = [];
  
  gameRooms.forEach((room) => {
    roomsData.push({
      id: room.id,
      playerCount: room.players.length,
      gameStarted: room.gameStarted,
      createdAt: room.createdAt
    });
  });
  
  res.json(roomsData);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Metro Manic server running on port ${PORT}`);
}); 