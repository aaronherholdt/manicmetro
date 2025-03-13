document.addEventListener('DOMContentLoaded', () => {
    // Initialize multiplayer manager
    const multiplayerManager = new MultiplayerManager();
    
    // Make multiplayerManager available globally
    window.multiplayerManager = multiplayerManager;
    
    // Initialize the game (but don't start it until multiplayer is ready)
    let game = null;
    let renderer = null;
    let gameLoop = null;
    let teamworkManager = null;
    
    // Function to start the game after multiplayer setup
    function initializeGame() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
    
        // Initialize the game
        game = new Game();
        renderer = new Renderer(canvas, game);
        
        // Make game available globally for teamwork features
        window.game = game;
        
        // Initialize teamwork features
        multiplayerManager.initializeTeamworkFeatures(game);
        
        // Setup multiplayer game state
        if (multiplayerManager.gameStarted) {
            game.initMultiplayer(multiplayerManager.players, multiplayerManager.playerId);
        }
        
        // Add initial subway line
        const initialLine = game.addLine();
        game.connectStations(initialLine, 0); // Connect to the center station (circle)
        game.connectStations(initialLine, 1); // Connect to the right station (square)
        
        // No need to connect to triangle station since we removed it
        
        // Game state
        let lastTime = 0;
        let isDrawing = false;
        let mousePosition = { x: 0, y: 0 };
        
        // Game loop
        gameLoop = function(timestamp) {
            // Calculate delta time in seconds
            const deltaTime = (timestamp - lastTime) / 1000;
            lastTime = timestamp;
            
            // Update game state
            game.update(deltaTime);
            
            // Update teamwork features
            if (multiplayerManager.teamworkManager) {
                multiplayerManager.teamworkManager.update(deltaTime);
            }
            
            // Render game
            renderer.render();
            
            // Continue the loop
            requestAnimationFrame(gameLoop);
        };
        
        // Start the game loop
        requestAnimationFrame(gameLoop);
        
        // Event listeners for user interactions
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        
        document.getElementById('newLineBtn').addEventListener('click', () => {
            // Create a line color selector popup
            showLineColorSelector((selectedColor) => {
                // Only proceed if a color was selected
                if (selectedColor) {
                    const line = game.addLine(selectedColor);
                    if (line) {
                        game.selectedLine = line;
                        
                        // Assign owner ID for multiplayer
                        if (game.isMultiplayer) {
                            line.ownerId = multiplayerManager.playerId;
                        }
                        
                        // Send this action to other players in multiplayer mode
                        if (multiplayerManager.gameStarted) {
                            multiplayerManager.sendGameAction({
                                type: 'new_line',
                                lineId: line.id,
                                color: line.color,
                                ownerId: multiplayerManager.playerId
                            });
                        }
                    } else {
                        alert('Maximum number of lines reached!');
                    }
                } else {
                    // If no color was selected, display a message
                    if (multiplayerManager.teamworkManager) {
                        multiplayerManager.teamworkManager.showNotification('Please select a line color', 'warning');
                    } else {
                        alert('Please select a line color.');
                    }
                }
            });
        });
        
        document.getElementById('newStationBtn').addEventListener('click', () => {
            // Toggle station placement mode
            isDrawing = false;
            mousePosition = { x: 0, y: 0 };
            game.selectedLine = null;
            
            console.log('New Station button clicked');
            
            // Reset any existing selector's display state first
            const existingSelector = document.getElementById('stationShapeSelector');
            if (existingSelector) {
                existingSelector.style.display = 'none';
                existingSelector.classList.remove('active');
            }
            
            // First, try using TeamworkManager's methods
            if (multiplayerManager.teamworkManager) {
                console.log('Showing station shape selector');
                // Try the new direct method first
                const selectorShown = multiplayerManager.teamworkManager.showShapeSelector();
                console.log('Shape selector shown:', selectorShown);
                
                // Use the toggle method as fallback
                if (!selectorShown) {
                    console.log('Using toggle method as fallback');
                    const toggleResult = multiplayerManager.teamworkManager.toggleShapeSelector();
                    
                    // Use direct DOM manipulation as second fallback
                    if (!toggleResult) {
                        console.log('Using direct DOM manipulation as second fallback');
                        const selector = document.getElementById('stationShapeSelector');
                        if (selector) {
                            selector.style.display = 'block';
                            selector.classList.add('active');
                            console.log('Selector shown via direct DOM manipulation');
                        } else {
                            console.log('Could not find stationShapeSelector element in DOM');
                            
                            // Final fallback: create a dynamic selector
                            createAndShowShapeSelector();
                        }
                    }
                }
            } else {
                console.error('TeamworkManager not available');
                // Create a dynamic selector as fallback
                createAndShowShapeSelector();
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            const paused = game.togglePause();
            document.getElementById('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
            
            // In a real multiplayer implementation, pausing might affect all players
            // or just show a pause indicator for the player who paused
        });
        
        function handleMouseDown(event) {
            // If there's an active ping mode in teamwork, let that handle the click
            if (multiplayerManager.teamworkManager && 
                multiplayerManager.teamworkManager.activePingType) {
                return;
            }
            
            // Skip if we're panning (middle button or ctrl+left click)
            if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                return;
            }
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const worldCoords = renderer.screenToWorld(x, y);
            
            // Check if clicked on a station
            for (const station of game.stations) {
                const dx = station.x - worldCoords.x;
                const dy = station.y - worldCoords.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= station.radius) {
                    if (game.selectedLine) {
                        // Connect the station to the selected line
                        const connected = game.connectStations(game.selectedLine, station.id);
                        
                        // Send this action to other players in multiplayer mode
                        if (connected && multiplayerManager.gameStarted) {
                            multiplayerManager.sendGameAction({
                                type: 'connect_station',
                                lineId: game.selectedLine.id,
                                stationId: station.id
                            });
                        }
                    }
                    break;
                }
            }
            
            isDrawing = true;
            mousePosition = worldCoords;
        }
        
        function handleMouseUp() {
            isDrawing = false;
        }
        
        function handleMouseMove(event) {
            if (!isDrawing) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const worldCoords = renderer.screenToWorld(x, y);
            
            // Implement dragging behavior for line creation here
            mousePosition = worldCoords;
        }
        
        // Double-click to add new station
        canvas.addEventListener('dblclick', (event) => {
            // If there's an active ping mode in teamwork, let that handle the click
            if (multiplayerManager.teamworkManager && 
                multiplayerManager.teamworkManager.activePingType) {
                return;
            }
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Convert screen coordinates to world coordinates
            const worldCoords = renderer.screenToWorld(x, y);
            
            // Check if too close to other stations
            const tooClose = game.stations.some(station => {
                const dx = station.x - worldCoords.x;
                const dy = station.y - worldCoords.y;
                return Math.sqrt(dx * dx + dy * dy) < 50;
            });
            
            if (!tooClose) {
                // Use the selected station type if available, otherwise use a default
                let stationType;
                
                if (game.selectedStationType) {
                    // Use the shape selected from the shape selector
                    stationType = game.selectedStationType;
                    // Clear the selected type after use
                    game.selectedStationType = null;
                } else {
                    // Default to circle if no type is selected
                    stationType = 'circle';
                }
                
                const newStation = game.addStation(worldCoords.x, worldCoords.y, stationType);
                
                // Send this action to other players in multiplayer mode
                if (multiplayerManager.gameStarted) {
                    multiplayerManager.sendGameAction({
                        type: 'add_station',
                        stationId: newStation.id,
                        x: worldCoords.x,
                        y: worldCoords.y,
                        stationType: stationType
                    });
                }
                
                // Hide the station shape selector after placing a station
                const selector = document.getElementById('stationShapeSelector');
                if (selector) {
                    selector.style.display = 'none';
                    selector.classList.remove('active');
                }
            }
        });
    }
    
    // Listen for game start from multiplayer manager
    document.addEventListener('game:start', () => {
        console.log('Game starting, initializing game components');
        initializeGame();
        console.log('Game initialized, multiplayerManager ready:', multiplayerManager);
    });
    
    // Override the original startGame method to dispatch an event when the game starts
    const originalStartGame = multiplayerManager.startGame;
    multiplayerManager.startGame = function() {
        originalStartGame.call(multiplayerManager);
        document.dispatchEvent(new Event('game:start'));
    };
});

// Function to create and show station shape selector if not found in DOM
function createAndShowShapeSelector() {
    console.log('Creating and showing shape selector');
    
    // First try to find existing selector
    let selector = document.getElementById('stationShapeSelector');
    
    // If it doesn't exist, create it
    if (!selector) {
        selector = document.createElement('div');
        selector.id = 'stationShapeSelector';
        selector.className = 'station-shape-selector';
        
        // Create header
        const header = document.createElement('h4');
        header.textContent = 'Select Station Shape';
        selector.appendChild(header);
        
        // Create shape options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'shape-options';
        
        // Define all available shapes with their colors
        const shapes = [
            { type: 'circle', name: 'Circle (Red)' },
            { type: 'square', name: 'Square (Blue)' },
            { type: 'triangle', name: 'Triangle (Yellow)' },
            { type: 'diamond', name: 'Diamond (Green)' }
        ];
        
        // Add each shape option
        shapes.forEach(shape => {
            const option = document.createElement('div');
            option.className = 'shape-option';
            option.setAttribute('data-shape', shape.type);
            
            // Add shape preview
            const preview = document.createElement('div');
            preview.className = `shape-preview ${shape.type}`;
            option.appendChild(preview);
            
            // Add shape name with color
            const name = document.createElement('div');
            name.className = 'shape-name';
            name.textContent = shape.name;
            option.appendChild(name);
            
            // Add click handler
            option.addEventListener('click', function() {
                // Update game's selected station type
                if (window.game) {
                    window.game.selectedStationType = shape.type;
                    console.log('Selected station type:', shape.type);
                    
                    // Show notification
                    if (window.teamworkManager) {
                        window.teamworkManager.showNotification(`Click on the map to place a ${shape.name} station`, 'info');
                    }
                }
                
                // Hide selector
                selector.style.display = 'none';
                
                // Remove backdrop if it exists
                const backdrop = document.querySelector('.selector-backdrop');
                if (backdrop) {
                    document.body.removeChild(backdrop);
                }
            });
            
            // Add to container
            optionsContainer.appendChild(option);
        });
        
        // Add options to selector
        selector.appendChild(optionsContainer);
        
        // Add to document
        document.body.appendChild(selector);
    }
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'selector-backdrop';
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100%';
    backdrop.style.height = '100%';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.zIndex = '999';
    
    // Add click event to backdrop to close selector
    backdrop.addEventListener('click', function(e) {
        if (e.target === backdrop) {
            document.body.removeChild(backdrop);
            selector.style.display = 'none';
        }
    });
    
    // Add backdrop to document
    document.body.appendChild(backdrop);
    
    // Position and style the selector
    selector.style.display = 'block';
    selector.style.zIndex = '1000';
    
    // Return true to indicate success
    return true;
}

// Function to show the line color selector
function showLineColorSelector(callback) {
    // Remove any existing selector
    const existingSelector = document.getElementById('lineColorSelector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    // Define only the four required colors
    const colors = [
        '#FF0000', // Red
        '#0000FF', // Blue
        '#FFFF00', // Yellow
        '#008000'  // Green
    ];
    
    // Create selector panel
    const selector = document.createElement('div');
    selector.id = 'lineColorSelector';
    selector.style.position = 'fixed';
    selector.style.left = '50%';
    selector.style.top = '50%';
    selector.style.transform = 'translate(-50%, -50%)';
    selector.style.backgroundColor = 'white';
    selector.style.borderRadius = '8px';
    selector.style.padding = '20px';
    selector.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    selector.style.zIndex = '1000';
    selector.style.display = 'flex';
    selector.style.flexDirection = 'column';
    selector.style.gap = '15px';
    selector.style.width = '300px';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Select Line Color';
    title.style.margin = '0';
    title.style.padding = '0 0 10px 0';
    title.style.borderBottom = '1px solid #eee';
    title.style.textAlign = 'center';
    title.style.color = '#2c6ba0';
    selector.appendChild(title);
    
    // Create colors container
    const colorsContainer = document.createElement('div');
    colorsContainer.style.display = 'grid';
    colorsContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    colorsContainer.style.gap = '15px';
    colorsContainer.style.justifyContent = 'center';
    colorsContainer.style.padding = '10px';
    selector.appendChild(colorsContainer);
    
    // Create the color options with labels
    const colorLabels = ['Red', 'Blue', 'Yellow', 'Green'];
    
    colors.forEach((color, index) => {
        const colorOptionContainer = document.createElement('div');
        colorOptionContainer.style.display = 'flex';
        colorOptionContainer.style.flexDirection = 'column';
        colorOptionContainer.style.alignItems = 'center';
        colorOptionContainer.style.gap = '5px';
        
        const colorOption = document.createElement('div');
        colorOption.style.width = '60px';
        colorOption.style.height = '60px';
        colorOption.style.backgroundColor = color;
        colorOption.style.borderRadius = '4px';
        colorOption.style.cursor = 'pointer';
        colorOption.style.border = '2px solid transparent';
        colorOption.style.transition = 'all 0.2s';
        
        // Add label
        const label = document.createElement('div');
        label.textContent = colorLabels[index];
        label.style.fontSize = '14px';
        label.style.fontWeight = '500';
        
        // Add hover effect
        colorOption.onmouseover = () => {
            colorOption.style.transform = 'scale(1.1)';
            colorOption.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        };
        
        colorOption.onmouseout = () => {
            colorOption.style.transform = 'scale(1)';
            colorOption.style.boxShadow = 'none';
        };
        
        // Add click handler
        colorOption.addEventListener('click', () => {
            selector.remove();
            backdrop.remove();
            callback(color);
        });
        
        colorOptionContainer.appendChild(colorOption);
        colorOptionContainer.appendChild(label);
        colorsContainer.appendChild(colorOptionContainer);
    });
    
    // Add to the document
    document.body.appendChild(selector);
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(0,0,0,0.5)';
    backdrop.style.zIndex = '999';
    
    backdrop.addEventListener('click', () => {
        backdrop.remove();
        selector.remove();
        // No default color anymore, just close without callback
    });
    
    // Prevent clicks on the selector from closing it
    selector.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    document.body.appendChild(backdrop);
} 