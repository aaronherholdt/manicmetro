class MultiplayerManager {
    constructor() {
        this.playerName = '';
        this.playerId = '';
        this.isHost = false;
        this.players = [];
        this.gameStarted = false;
        this.socket = null;
        this.roomCode = '';
        this.teamworkManager = null;
        
        // DOM elements
        this.loginOverlay = document.getElementById('loginOverlay');
        this.waitingRoomOverlay = document.getElementById('waitingRoomOverlay');
        this.playerNameInput = document.getElementById('playerNameInput');
        this.joinGameBtn = document.getElementById('joinGameBtn');
        this.playersList = document.getElementById('playersList');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.waitingMessage = document.getElementById('waitingMessage');
        
        // Initialization
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Join game button
        this.joinGameBtn.addEventListener('click', () => {
            const name = this.playerNameInput.value.trim();
            if (name) {
                this.joinGame(name);
            } else {
                alert('Please enter your name');
            }
        });
        
        // Player name input enter key
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinGameBtn.click();
            }
        });
        
        // Start game button (only visible to host)
        this.startGameBtn.addEventListener('click', () => {
            this.startGame();
        });
    }
    
    connectToServer() {
        console.log('Connecting to game server...');
        
        // Connect to Socket.IO server
        // Update with your actual deployment URL (like Render)
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? `http://${window.location.hostname}:3000` 
            : 'https://manicmetro.onrender.com';  // Replace with your actual Render URL
            
        console.log('Attempting to connect to server:', serverUrl);
            
        // Initialize Socket.IO connection with reconnection options
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        
        // Setup socket event handlers
        this.setupSocketHandlers();
    }
    
    setupSocketHandlers() {
        // Connection established
        this.socket.on('connect', () => {
            console.log('Connected to game server with socket ID:', this.socket.id);
            
            // Join game with player name only, no room code
            this.socket.emit('join_game', {
                playerName: this.playerName
            });
        });
        
        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showNotification(`Connection error: ${error.message}. Trying to reconnect...`, 'error');
        });
        
        // Reconnect attempt
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Reconnection attempt #${attemptNumber}`);
            this.showNotification(`Reconnection attempt #${attemptNumber}...`, 'warning');
        });
        
        // Reconnected
        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            this.showNotification('Reconnected to server!', 'success');
            
            // If we were in a game, attempt to rejoin
            if (this.playerId && this.playerName) {
                this.socket.emit('rejoin_game', {
                    playerId: this.playerId,
                    playerName: this.playerName
                });
            }
        });
        
        // Joined game successfully
        this.socket.on('game_joined', (data) => {
            console.log('Joined game:', data);
            
            this.playerId = data.playerId;
            this.isHost = data.isHost;
            this.roomCode = data.roomCode;
            this.players = data.players;
            
            // Update UI
            this.loginOverlay.classList.add('hidden');
            this.waitingRoomOverlay.classList.remove('hidden');
            
            // Update players list
            this.updatePlayersList();
            
            // Update host UI
            if (this.isHost) {
                this.startGameBtn.classList.remove('hidden');
                this.waitingMessage.textContent = `You are the host. Click Start Game when ready.`;
            } else {
                this.waitingMessage.textContent = `Waiting for the host to start the game...`;
            }
        });
        
        // New player joined
        this.socket.on('player_joined', (data) => {
            console.log('Player joined:', data);
            this.players = data.players;
            this.updatePlayersList();
        });
        
        // Player left
        this.socket.on('player_left', (data) => {
            console.log('Player left:', data);
            this.players = data.players;
            this.updatePlayersList();
            
            // Update host UI if host changed
            if (this.players.length > 0 && this.players[0].id === this.playerId && !this.isHost) {
                this.isHost = true;
                this.startGameBtn.classList.remove('hidden');
                this.waitingMessage.textContent = `You are now the host. Click Start Game when ready.`;
            }
        });
        
        // Player rejoined after disconnection
        this.socket.on('player_rejoined', (data) => {
            console.log('Player rejoined:', data);
            
            // Find the player in the list and mark as active
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                player.status = 'active';
                this.updatePlayersList();
                
                // Show notification
                this.showNotification(`${data.playerName} has reconnected to the game`, 'success');
            }
        });
        
        // Game state update (for synchronization)
        this.socket.on('game_state_update', (data) => {
            console.log('Received game state update:', data);
            
            // Apply the state update to the game if it's active
            if (window.game && this.gameStarted) {
                // Update stations
                if (data.stations) {
                    window.game.stations = data.stations;
                }
                
                // Update lines
                if (data.lines) {
                    window.game.lines = data.lines;
                }
                
                // Update passengers
                if (data.passengers) {
                    window.game.passengers = data.passengers;
                }
                
                // Update day and time
                if (data.day) window.game.day = data.day;
                if (data.time) window.game.time = data.time;
                
                // Update UI
                window.game.updateStats();
            }
        });
        
        // Game started
        this.socket.on('game_started', (data) => {
            console.log('Game started:', data);
            
            this.gameStarted = true;
            this.players = data.players;
            
            // Store roles and station shapes for the teamwork manager
            this.roles = data.roles;
            this.stationShapes = data.stationShapes;
            this.objectives = data.objectives;
            
            // Hide waiting room
            this.waitingRoomOverlay.classList.add('hidden');
            
            // Signal to app.js that the game should initialize
            document.dispatchEvent(new Event('game:start'));
        });
        
        // Game action received
        this.socket.on('game_action', (data) => {
            console.log('Received game action:', data);
            this.receiveGameAction(data);
        });
        
        // Teamwork action received
        this.socket.on('teamwork_action', (data) => {
            console.log('Received teamwork action:', data);
            
            if (this.teamworkManager) {
                switch (data.type) {
                    case 'objective_focus':
                        this.teamworkManager.setActiveObjective(data.objectiveIndex);
                        break;
                        
                    case 'ping':
                        this.teamworkManager.showPing(data.x, data.y, data.pingType, data.playerId);
                        break;
                }
            }
        });
        
        // Objective updated
        this.socket.on('objective_updated', (data) => {
            console.log('Objective updated:', data);
            
            if (this.teamworkManager) {
                this.teamworkManager.updateObjectiveProgress(data.objectiveId, data.progress, data.completed);
            }
        });
        
        // Mission ended
        this.socket.on('mission_ended', (data) => {
            console.log('Mission ended:', data);
            
            if (this.teamworkManager) {
                this.teamworkManager.endMission(data.success, data.stats);
            }
        });
        
        // Error
        this.socket.on('error', (data) => {
            console.error('Server error:', data);
            alert(data.message);
        });
        
        // Disconnect
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            
            // If the game hasn't started yet, return to login
            if (!this.gameStarted) {
                this.loginOverlay.classList.remove('hidden');
                this.waitingRoomOverlay.classList.add('hidden');
                alert('Disconnected from server. Please try again.');
            } else {
                // If game in progress, show a reconnection message
                const notification = document.createElement('div');
                notification.className = 'notification error';
                notification.textContent = 'Connection lost. Trying to reconnect...';
                document.body.appendChild(notification);
                
                // Remove after a few seconds
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 5000);
            }
        });
    }
    
    updatePlayersList() {
        // Clear the current list
        this.playersList.innerHTML = '';
        
        // Add each player to the list
        this.players.forEach(player => {
            const listItem = document.createElement('li');
            listItem.textContent = player.name + (player.isHost ? ' (Host)' : '');
            this.playersList.appendChild(listItem);
        });
    }
    
    joinGame(playerName) {
        this.playerName = playerName;
        
        // Connect to the game server
        this.connectToServer();
    }
    
    startGame() {
        if (!this.isHost) return;
        
        // Tell the server to start the game
        this.socket.emit('start_game');
    }
    
    addPlayerIndicatorToUI() {
        // Create a player indicator element to show in the game
        const playerIndicator = document.createElement('div');
        playerIndicator.className = 'player-indicator';
        
        const playerColor = document.createElement('span');
        playerColor.className = 'player-color';
        playerColor.style.backgroundColor = '#2c6ba0';
        
        const playerName = document.createElement('span');
        playerName.textContent = this.playerName;
        
        playerIndicator.appendChild(playerColor);
        playerIndicator.appendChild(playerName);
        
        // Add indicator to the game container
        document.querySelector('.game-container').appendChild(playerIndicator);
    }
    
    initializeTeamworkFeatures(game) {
        console.log('Initializing teamwork features...');
        
        // Create teamwork manager
        this.teamworkManager = new TeamworkManager(game);
        
        // Initialize team game with players and current player ID
        this.teamworkManager.initTeamGame(this.players, this.playerId);
        
        // If we have roles and station shapes from the server, apply them
        if (this.roles && this.stationShapes) {
            this.teamworkManager.playerRoles = this.roles;
            this.teamworkManager.playerStationShapes = this.stationShapes;
            
            // Update the UI to show the player's role
            this.teamworkManager.updateRoleDisplay(this.playerId);
            this.teamworkManager.updateShapeAssignmentInfo(this.playerId);
        }
        
        // If we have objectives from the server, use them
        if (this.objectives) {
            this.teamworkManager.objectives = this.objectives;
            this.teamworkManager.updateObjectivesList();
            this.teamworkManager.startMission();
        } else {
            // Otherwise generate them locally
            this.teamworkManager.generateObjectives();
            this.teamworkManager.startMission();
        }
        
        // Setup event listeners for game events
        game.on = function(event, callback) {
            if (!this._eventHandlers) this._eventHandlers = {};
            if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
            this._eventHandlers[event].push(callback);
        };
        
        game.trigger = function(event, data) {
            if (!this._eventHandlers || !this._eventHandlers[event]) return;
            for (const handler of this._eventHandlers[event]) {
                handler(data);
            }
        };
        
        // Listen for game events for teamwork objectives
        game.on('passenger_delivered', (data) => {
            if (this.teamworkManager) {
                this.teamworkManager.handleGameEvent('passenger_delivered', data);
                
                // Send to server as well
                this.sendGameAction({
                    type: 'passenger_delivered',
                    stationId: data.stationId,
                    stationType: data.stationType,
                    lineId: data.lineId,
                    waitTime: data.waitTime
                });
            }
        });
        
        game.on('station_connected', (data) => {
            if (this.teamworkManager) {
                this.teamworkManager.handleGameEvent('station_connected', data);
            }
        });
        
        game.on('line_updated', (data) => {
            if (this.teamworkManager) {
                this.teamworkManager.handleGameEvent('line_updated', data);
            }
        });
        
        // Patch game methods to trigger events
        const originalConnectStations = game.connectStations;
        game.connectStations = function(line, stationId) {
            const result = originalConnectStations.call(this, line, stationId);
            if (result) {
                this.trigger('station_connected', { lineId: line.id, stationId: stationId });
                this.trigger('line_updated', { lineId: line.id });
            }
            return result;
        };
        
        const originalTransferPassengers = game.transferPassengers;
        game.transferPassengers = function(line, station) {
            // Count passengers before the transfer
            const passengersBefore = line.passengers.length;
            
            // Call original method
            originalTransferPassengers.call(this, line, station);
            
            // Determine how many passengers got off at this station
            const passengersDelivered = passengersBefore - line.passengers.length;
            
            // Trigger event for each delivered passenger
            if (passengersDelivered > 0) {
                this.trigger('passenger_delivered', { 
                    count: passengersDelivered,
                    stationId: station.id,
                    stationType: station.type,
                    lineId: line.id
                });
            }
        };
        
        // Initialize teamwork UI
        this.showTeamRoleNotification();
    }
    
    showTeamRoleNotification() {
        if (!this.teamworkManager) return;
        
        const role = this.teamworkManager.playerRoles[this.playerId];
        if (role) {
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification role';
            notificationEl.textContent = `Your role: ${role.name} - ${role.description}`;
            
            // Style the notification
            notificationEl.style.position = 'absolute';
            notificationEl.style.top = '50%';
            notificationEl.style.left = '50%';
            notificationEl.style.transform = 'translate(-50%, -50%)';
            notificationEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notificationEl.style.color = 'white';
            notificationEl.style.padding = '20px';
            notificationEl.style.borderRadius = '8px';
            notificationEl.style.zIndex = '1000';
            notificationEl.style.textAlign = 'center';
            notificationEl.style.maxWidth = '400px';
            notificationEl.style.fontSize = '18px';
            
            // Add role description
            const descEl = document.createElement('p');
            descEl.textContent = 'Work together with your team to complete objectives!';
            descEl.style.marginTop = '10px';
            descEl.style.fontSize = '14px';
            descEl.style.opacity = '0.8';
            notificationEl.appendChild(descEl);
            
            // Add to the game container
            document.querySelector('.game-container').appendChild(notificationEl);
            
            // Remove after a few seconds
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.parentNode.removeChild(notificationEl);
                }
            }, 4000);
        }
    }
    
    // Methods for in-game synchronization
    sendGameAction(action) {
        // Send action to the server
        if (this.socket && this.socket.connected) {
            console.log('Sending game action:', action);
            this.socket.emit('game_action', action);
        }
        
        // If we have teamwork features, trigger appropriate events locally too
        if (this.teamworkManager && window.game) {
            // Handle specific actions and trigger appropriate game events
            switch (action.type) {
                case 'connect_station':
                    window.game.trigger('station_connected', {
                        lineId: action.lineId,
                        stationId: action.stationId
                    });
                    window.game.trigger('line_updated', { lineId: action.lineId });
                    break;
            }
        }
    }
    
    receiveGameAction(action) {
        console.log('Processing received game action:', action);
        
        // Apply the action to the game state
        if (window.game) {
            window.game.handleRemoteAction(action);
        }
    }
    
    // For teamwork-specific actions
    sendTeamworkAction(action) {
        console.log('Sending teamwork action:', action);
        
        // Send to the server
        if (this.socket && this.socket.connected) {
            this.socket.emit('teamwork_action', action);
        }
        
        // Also apply locally
        switch (action.type) {
            case 'objective_focus':
                if (this.teamworkManager) {
                    this.teamworkManager.setActiveObjective(action.objectiveIndex);
                }
                break;
                
            case 'ping':
                if (this.teamworkManager) {
                    this.teamworkManager.showPing(action.x, action.y, action.pingType, this.playerId);
                }
                break;
        }
    }
    
    // Send objective progress to the server
    sendObjectiveProgress(objectiveId, progress, completed) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('objective_progress', {
                objectiveId,
                progress,
                completed
            });
        }
    }
    
    // Send mission end to the server
    sendMissionEnd(success, stats) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('end_mission', {
                success,
                stats
            });
        }
    }
    
    // Show a notification to the user
    showNotification(message, type = 'info') {
        // First try to use the teamwork manager's notification system if available
        if (this.teamworkManager) {
            this.teamworkManager.showNotification(message, type);
            return;
        }
        
        // Fallback to a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = type === 'error' ? '#f44336' : 
                                            type === 'warning' ? '#ff9800' : 
                                            type === 'success' ? '#4CAF50' : '#2196F3';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        
        document.body.appendChild(notification);
        
        // Remove after a few seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
} 
