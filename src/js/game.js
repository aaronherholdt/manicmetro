class Game {
    constructor() {
        this.stations = [];
        this.lines = [];
        this.passengers = [];
        this.time = 0;
        this.day = 1;
        this.passengerCount = 0;
        this.maxLines = 5;
        this.lineColors = [
            '#FF0000', // Red
            '#0000FF', // Blue
            '#FFFF00', // Yellow
            '#008000'  // Green
        ];
        this.paused = false;
        this.selectedLine = null;
        
        // Define the four station shapes with their corresponding colors
        this.stationShapes = ['circle', 'square', 'triangle', 'diamond'];
        this.stationTypes = ['circle', 'square', 'triangle', 'diamond'];
        
        // Station color mapping
        this.stationColors = {
            'circle': '#FF0000',   // Red
            'square': '#0000FF',   // Blue
            'triangle': '#FFFF00', // Yellow
            'diamond': '#008000'   // Green
        };
        
        // Ensure that selectedStationType is properly initialized and not filtered
        this.selectedStationType = 'circle'; // Default value, but can be changed to any shape
        
        // Multiplayer properties
        this.isMultiplayer = false;
        this.players = [];
        this.currentPlayerId = '';
        this.playerColors = {
            // Player ID to color mapping
        };
        
        // Initial setup
        this.createInitialMap();
        
        // Update stats display
        this.updateStats();
    }
    
    // Setup multiplayer features
    initMultiplayer(players, currentPlayerId) {
        this.isMultiplayer = true;
        this.players = players;
        this.currentPlayerId = currentPlayerId;
        
        // Assign colors to players
        const playerColors = [
            '#E91E63', // Pink
            '#2196F3', // Blue
            '#4CAF50', // Green
            '#FF9800', // Orange
            '#9C27B0'  // Purple
        ];
        
        players.forEach((player, index) => {
            this.playerColors[player.id] = playerColors[index % playerColors.length];
        });
    }
    
    // Handle action from another player
    handleRemoteAction(action) {
        switch (action.type) {
            case 'new_line':
                // Another player created a new line
                if (action.color) {
                    const line = new Line(action.lineId, action.color);
                    line.ownerId = action.ownerId;
                    this.lines.push(line);
                } else {
                    console.error('No color provided for remote line creation');
                }
                break;
                
            case 'connect_station':
                // Another player connected a station to a line
                const targetLine = this.lines.find(l => l.id === action.lineId);
                if (targetLine) {
                    this.connectStations(targetLine, action.stationId);
                }
                break;
                
            case 'add_station':
                // Another player added a new station
                this.addStation(action.x, action.y, action.stationType);
                break;
        }
    }
    
    createInitialMap() {
        // Create initial stations
        // Center coordinates in the virtual world (should match renderer worldWidth/worldHeight)
        const center = { x: 1000, y: 1000 };
        
        // Create a circle station at the center
        this.addStation(center.x, center.y, 'circle');
        
        // Create a square station to the right
        this.addStation(center.x + 150, center.y, 'square');
        
        // Only two stations to start - circle and square
        // Removed triangle and diamond stations
        
        // Add some initial passengers - only to the two starting stations
        this.addPassenger(0);
        this.addPassenger(1);
    }
    
    addStation(x, y, type = this.selectedStationType) {
        console.log(`Adding station at (${x}, ${y}) with type ${type}`);
        const id = this.stations.length;
        const station = new Station(id, x, y, type);
        this.stations.push(station);
        
        // Update destinations for any passengers waiting for this type of station
        this.updatePassengerDestinations(station);
        
        // Hide the station shape selector after a station is added
        const selector = document.getElementById('stationShapeSelector');
        if (selector) {
            selector.style.display = 'none';
            selector.classList.remove('active');
            
            // Remove backdrop if it exists
            const backdrop = document.querySelector('.selector-backdrop');
            if (backdrop) {
                document.body.removeChild(backdrop);
            }
        }
        
        // Trigger event for station added (for teamwork objectives)
        if (this.isMultiplayer && this._eventHandlers && this._eventHandlers['station_added']) {
            this.trigger('station_added', { 
                stationId: station.id, 
                type: station.type,
                x: x,
                y: y
            });
        }
        
        return station;
    }
    
    addLine(selectedColor) {
        if (this.lines.length >= this.maxLines) {
            return false;
        }
        
        const id = this.lines.length;
        
        // If no color is provided, let's require one by returning false
        if (!selectedColor) {
            console.error('No color selected for new line');
            return false;
        }
        
        const line = new Line(id, selectedColor);
        this.lines.push(line);
        this.selectedLine = line;
        return line;
    }
    
    addPassenger(stationId) {
        if (stationId >= this.stations.length) return;
        
        // Get the current station's type
        const currentStationType = this.stations[stationId].type;
        
        // Identify station types that don't exist yet in the game
        const existingTypes = new Set(this.stations.map(s => s.type));
        const missingTypes = this.stationTypes.filter(type => !existingTypes.has(type));
        
        // Choose a destination type that guides players to build new station types
        let destinationType;
        
        if (missingTypes.length > 0) {
            // If there are missing station types, prioritize them as destinations
            // This guides players to build those types of stations
            destinationType = missingTypes[Math.floor(Math.random() * missingTypes.length)];
            
            // Create a pseudo-destination for this passenger (they'll need to build a station of this type)
            const destStation = {
                id: -1, // Invalid ID to indicate this is a placeholder
                type: destinationType
            };
            
            const passenger = new Passenger(
                this.passengers.length,
                stationId,
                -1, // Invalid ID that will be updated when a matching station is added
                destinationType
            );
            
            this.passengers.push(passenger);
            this.stations[stationId].addPassenger(passenger);
            this.passengerCount++;
            
            // Show a hint about this passenger's needs (with a small delay)
            setTimeout(() => this.showStationTypeHint(passenger), 1000);
            
            return passenger;
        } else {
            // If all station types exist, do normal passenger generation to existing stations
            // Find stations different from the current one
            let destinations = this.stations.filter(s => 
                s.id !== stationId && 
                s.type !== currentStationType
            );
            
            if (destinations.length === 0) return;
            
            // Pick a random destination
            const destStation = destinations[Math.floor(Math.random() * destinations.length)];
            
            const passenger = new Passenger(
                this.passengers.length,
                stationId,
                destStation.id,
                destStation.type
            );
            
            this.passengers.push(passenger);
            this.stations[stationId].addPassenger(passenger);
            this.passengerCount++;
            
            return passenger;
        }
    }
    
    connectStations(line, stationId) {
        if (!line || !this.stations[stationId]) return false;
        
        // If this is the first station in the line
        if (line.stations.length === 0) {
            line.addStation(stationId);
            return true;
        }
        
        // Check if the station is already the last station in the line
        if (line.stations[line.stations.length - 1] === stationId) {
            return false;
        }
        
        // Add the station to the line
        line.addStation(stationId);
        return true;
    }
    
    update(deltaTime) {
        if (this.paused) return;
        
        this.time += deltaTime;
        
        // Every 10 seconds is a new day
        if (this.time >= 10) {
            this.time = 0;
            this.day++;
            
            // Remove automatic station generation - only players can add stations now
            // if (this.day % 3 === 0) {
            //     this.addRandomStation();
            // }
            
            // Get a list of current station types that exist in the game
            const existingTypes = new Set(this.stations.map(s => s.type));
            
            // Get a list of missing station types
            const missingTypes = this.stationTypes.filter(type => !existingTypes.has(type));
            
            // Add new passengers periodically with a focus on guiding players
            // toward building the missing station types
            if (missingTypes.length > 0) {
                // Generate 1-2 passengers per day that want to go to missing station types
                const passengerCount = Math.min(2, this.stations.length);
                for (let i = 0; i < passengerCount; i++) {
                    const randomStationId = Math.floor(Math.random() * this.stations.length);
                    this.addPassenger(randomStationId);
                }
            } else {
                // When all station types exist, generate normal passenger traffic
                for (let i = 0; i < Math.min(3, this.stations.length); i++) {
                    const randomStationId = Math.floor(Math.random() * this.stations.length);
                    this.addPassenger(randomStationId);
                }
            }
            
            this.updateStats();
        }
        
        // Update passenger wait times
        this.updatePassengerWaitTimes(deltaTime);
        
        // Update passenger movement
        this.movePassengers(deltaTime);
        
        // Check for overcrowded stations
        this.checkStationCapacity();
        
        // Trigger a tick event for time-based objectives
        if (this.isMultiplayer && this._eventHandlers && this._eventHandlers['tick']) {
            this.trigger('tick', { deltaTime: deltaTime });
        }
        
        // Periodically check and trigger an update for game state objectives
        this.gameUpdateCounter = (this.gameUpdateCounter || 0) + deltaTime;
        if (this.gameUpdateCounter >= 1) { // Check every second
            this.gameUpdateCounter = 0;
            if (this.isMultiplayer && this._eventHandlers && this._eventHandlers['game_updated']) {
                this.trigger('game_updated', { 
                    stationCount: this.stations.length,
                    lineCount: this.lines.length
                });
            }
        }
    }
    
    updatePassengerWaitTimes(deltaTime) {
        // Update wait times for all waiting passengers
        for (const passenger of this.passengers) {
            // Only update for passengers still at stations (not on trains)
            if (!passenger.onTrain) {
                passenger.waitTime += deltaTime;
            }
        }
    }
    
    addRandomStation() {
        // Use the full world size for random station placement
        const margin = 200;
        const x = margin + Math.random() * (this.worldWidth || 2000 - 2 * margin);
        const y = margin + Math.random() * (this.worldHeight || 2000 - 2 * margin);
        
        // Don't place too close to existing stations
        const tooClose = this.stations.some(station => {
            const dx = station.x - x;
            const dy = station.y - y;
            return Math.sqrt(dx * dx + dy * dy) < 80;
        });
        
        if (tooClose) return;
        
        // Use all available station types
        const typeIndex = Math.floor(Math.random() * this.stationTypes.length);
        const type = this.stationTypes[typeIndex];
        
        this.addStation(x, y, type);
    }
    
    movePassengers(deltaTime) {
        for (const line of this.lines) {
            if (line.stations.length < 2) continue;
            
            // Simple train movement simulation
            line.trainProgress += deltaTime * 0.2;
            if (line.trainProgress > 1) {
                line.trainProgress = 0;
                line.currentStationIndex = (line.currentStationIndex + 1) % line.stations.length;
                
                const currentStationId = line.stations[line.currentStationIndex];
                const station = this.stations[currentStationId];
                
                // Transfer passengers at this station
                this.transferPassengers(line, station);
            }
        }
    }
    
    transferPassengers(line, station) {
        // Passengers boarding the train
        for (let i = station.passengers.length - 1; i >= 0; i--) {
            const passenger = station.passengers[i];
            
            // Skip passengers that don't have a valid destination yet
            if (passenger.destinationId === -1) continue;
            
            // Check if this line goes to the passenger's destination
            const destStationIndex = line.stations.indexOf(passenger.destinationId);
            if (destStationIndex !== -1) {
                // Remove from station
                station.passengers.splice(i, 1);
                
                // Add to the line
                line.passengers.push(passenger);
                passenger.onTrain = true;
                passenger.line = line.id;
            }
        }
        
        // Passengers getting off the train
        for (let i = line.passengers.length - 1; i >= 0; i--) {
            const passenger = line.passengers[i];
            
            if (passenger.destinationId === station.id) {
                // Remove from line
                line.passengers.splice(i, 1);
                
                // Store the wait time for the delivered passenger
                const waitTime = passenger.waitTime;
                
                // Remove from game
                const passengerIndex = this.passengers.findIndex(p => p.id === passenger.id);
                if (passengerIndex !== -1) {
                    this.passengers.splice(passengerIndex, 1);
                    this.passengerCount--;
                    
                    // In multiplayer, increase score and trigger event with wait time
                    if (this.isMultiplayer) {
                        this.updateMultiplayerScore(line.ownerId, 1);
                        if (this._eventHandlers && this._eventHandlers['passenger_delivered']) {
                            this.trigger('passenger_delivered', { 
                                stationId: station.id,
                                stationType: station.type,
                                lineId: line.id,
                                waitTime: waitTime
                            });
                        }
                    }
                }
            }
        }
    }
    
    checkStationCapacity() {
        const maxCapacity = 6;
        
        for (const station of this.stations) {
            if (station.passengers.length > maxCapacity) {
                // Game over condition
                this.gameOver();
                break;
            }
        }
    }
    
    gameOver() {
        this.paused = true;
        
        // Notify teamwork manager about game over
        if (this.isMultiplayer && window.multiplayerManager && window.multiplayerManager.teamworkManager) {
            // End mission with failure
            window.multiplayerManager.teamworkManager.endMission(false);
            
            // Show a game over notification
            window.multiplayerManager.teamworkManager.showNotification('Game Over! A station was overcrowded.', 'error');
        }
        
        // In multiplayer, show different game over message
        if (this.isMultiplayer) {
            // Calculate winner based on scores
            let highestScore = -1;
            let winner = null;
            
            this.players.forEach(player => {
                if (player.score > highestScore) {
                    highestScore = player.score;
                    winner = player;
                }
            });
            
            if (winner) {
                alert(`Game Over! ${winner.name} wins with ${winner.score} points!`);
            } else {
                alert(`Game Over! Your subway system lasted ${this.day} days.`);
            }
        } else {
            alert(`Game Over! Your subway system lasted ${this.day} days.`);
        }
    }
    
    togglePause() {
        this.paused = !this.paused;
        return this.paused;
    }
    
    selectLine(lineId) {
        this.selectedLine = this.lines[lineId] || null;
    }
    
    updateStats() {
        document.getElementById('day').textContent = this.day;
        document.getElementById('passengerCount').textContent = this.passengerCount;
        document.getElementById('lineCount').textContent = this.lines.length;
    }
    
    // For multiplayer only
    updateMultiplayerScore(playerId, points) {
        if (!this.isMultiplayer) return;
        
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.score = (player.score || 0) + points;
        }
    }
    
    // Get all available station types
    getAllStationTypes() {
        return this.stationTypes;
    }
    
    // Get all available line colors
    getAllLineColors() {
        return [
            '#FF0000', // Red
            '#0000FF', // Blue
            '#FFFF00', // Yellow
            '#008000'  // Green
        ];
    }
    
    // Add a method to update passenger destinations when a new station is added
    updatePassengerDestinations(newStation) {
        // Find passengers waiting for a station of this type
        const waitingPassengers = this.passengers.filter(p => 
            p.destinationId === -1 && p.destinationType === newStation.type
        );
        
        // Update their destination to the new station
        for (const passenger of waitingPassengers) {
            passenger.destinationId = newStation.id;
            console.log(`Updated passenger ${passenger.id} destination to station ${newStation.id}`);
        }
    }
    
    // Add a method to show a hint about passengers needing specific station types
    showStationTypeHint(passenger) {
        if (!passenger || passenger.destinationId !== -1) return;
        
        let stationType = passenger.destinationType;
        let stationColor;
        
        // Get the color for this station type
        switch(stationType) {
            case 'circle':
                stationColor = 'red';
                break;
            case 'square':
                stationColor = 'blue';
                break;
            case 'triangle':
                stationColor = 'yellow';
                break;
            case 'diamond':
                stationColor = 'green';
                break;
            default:
                stationColor = 'unknown';
        }
        
        // Show notification if we have teamwork manager
        if (window.multiplayerManager && window.multiplayerManager.teamworkManager) {
            window.multiplayerManager.teamworkManager.showNotification(
                `A passenger needs a ${stationColor} ${stationType} station. Build one to help them reach their destination!`,
                'info'
            );
        } else {
            // Otherwise, use a simple alert or console message
            console.log(`Hint: A passenger needs a ${stationColor} ${stationType} station.`);
            
            // Create a temporary on-screen hint
            const hint = document.createElement('div');
            hint.className = 'station-hint';
            hint.style.position = 'fixed';
            hint.style.bottom = '70px';
            hint.style.left = '50%';
            hint.style.transform = 'translateX(-50%)';
            hint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            hint.style.color = 'white';
            hint.style.padding = '10px 15px';
            hint.style.borderRadius = '4px';
            hint.style.fontSize = '14px';
            hint.style.fontWeight = 'bold';
            hint.style.zIndex = '1000';
            hint.style.textAlign = 'center';
            
            hint.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>Passenger needs a ${stationColor} ${stationType} station. Use the New Station button to build one!</span>
                    <div style="width: 15px; height: 15px; background-color: ${stationColor}; border-radius: ${stationType === 'circle' ? '50%' : '0'}"></div>
                </div>
            `;
            
            document.body.appendChild(hint);
            
            // Remove the hint after a few seconds
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 6000);
        }
    }
} 