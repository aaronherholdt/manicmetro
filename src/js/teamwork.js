class TeamworkManager {
    constructor(game) {
        this.game = game;
        this.objectives = [];
        this.activeObjectiveIndex = 0;
        this.teamScore = 0;
        this.missionTimeRemaining = 300; // 5 minutes in seconds
        this.missionActive = false;
        this.playerRoles = {
            // Role assignments will go here
            // playerId: { role: 'roleName', description: 'roleDesc' }
        };
        
        // Available roles
        this.availableRoles = [
            { 
                name: 'Line Manager', 
                description: 'Create and extend subway lines',
                icon: 'line'
            },
            { 
                name: 'Station Planner', 
                description: 'Place new stations strategically',
                icon: 'station'
            },
            { 
                name: 'Traffic Coordinator', 
                description: 'Manage passenger flow',
                icon: 'traffic'
            },
            { 
                name: 'Network Optimizer', 
                description: 'Improve network efficiency',
                icon: 'network'
            }
        ];
        
        // Station shapes assigned to players
        this.playerStationShapes = {
            // playerId: stationShape (circle, square, triangle, diamond)
        };
        
        // Available station shapes
        this.stationShapes = ['circle', 'square', 'triangle', 'diamond'];
        
        // DOM elements
        this.objectivesListEl = document.getElementById('objectivesList');
        this.objectiveTimerEl = document.getElementById('objectiveTimer');
        this.teamProgressBarEl = document.getElementById('teamProgressBar');
        this.teamProgressTextEl = document.getElementById('teamProgressText');
        this.roleNameEl = document.getElementById('roleName');
        this.roleDescEl = document.getElementById('roleDesc');
        this.reflectionOverlay = document.getElementById('reflectionOverlay');
        this.reflectionTitle = document.getElementById('reflectionTitle');
        this.finalScoreEl = document.getElementById('finalScore');
        this.objectivesCompletedEl = document.getElementById('objectivesCompleted');
        this.totalPassengersEl = document.getElementById('totalPassengers');
        this.continueBtn = document.getElementById('continueBtn');
        this.stationShapeSelector = document.getElementById('stationShapeSelector');
        
        // Check if stationShapeSelector exists
        if (!this.stationShapeSelector) {
            console.error('Station shape selector not found in the DOM');
        } else {
            console.log('Station shape selector found:', this.stationShapeSelector);
        }
        
        // Initialize
        this.setupEventListeners();
        this.setupTooltips();
    }
    
    setupEventListeners() {
        // Continue button in reflection overlay
        this.continueBtn.addEventListener('click', () => {
            this.reflectionOverlay.classList.add('hidden');
            // In a real implementation, this would reset or start a new mission
        });
        
        // Station shape selection
        const shapeOptions = this.stationShapeSelector.querySelectorAll('.shape-option');
        console.log('Setting up shape options:', shapeOptions.length);
        
        shapeOptions.forEach(option => {
            const shape = option.getAttribute('data-shape');
            console.log('Setting up listener for shape:', shape);
            
            option.addEventListener('click', () => {
                console.log('Shape option clicked:', shape);
                // Only respond if not disabled
                if (!option.classList.contains('disabled')) {
                    console.log('Shape option not disabled, selecting it');
                    // Clear other selections
                    shapeOptions.forEach(opt => opt.classList.remove('selected'));
                    // Select this one
                    option.classList.add('selected');
                    
                    // Handle station shape selection
                    this.handleShapeSelection(shape);
                } else {
                    console.log('Shape option is disabled, ignoring click');
                }
            });
        });
    }
    
    handleShapeSelection(shape) {
        // Hide the shape selector
        this.stationShapeSelector.classList.remove('active');
        
        // Set the game to station placement mode with the selected shape
        if (this.game) {
            // For this implementation, we just store the selected shape to use when placing
            this.game.selectedStationType = shape;
            
            // Show notification that station placement mode is active
            this.showNotification(`Click on the map to place a ${shape} station`, 'info');
        }
    }
    
    // New method to toggle the shape selector
    toggleShapeSelector() {
        const selector = document.getElementById('stationShapeSelector');
        if (!selector) return false;
        
        // Make all shape options available
        const shapeOptions = selector.querySelectorAll('.shape-option');
        shapeOptions.forEach(option => {
            // Remove any disabled styling
            option.classList.remove('disabled');
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
            
            // Add click handler if it doesn't exist
            if (!option.onclick) {
                option.onclick = () => {
                    const shape = option.getAttribute('data-shape');
                    if (window.game) {
                        window.game.selectedStationType = shape;
                    }
                    
                    // Show notification
                    this.showNotification(`Click on the map to place a ${shape} station`, 'info');
                    
                    // Hide selector
                    selector.style.display = 'none';
                    selector.classList.remove('active');
                };
            }
        });
        
        // Toggle visibility
        if (selector.classList.contains('active')) {
            selector.style.display = 'none';
            selector.classList.remove('active');
            return true;
        } else {
            selector.style.display = 'block';
            selector.classList.add('active');
            return true;
        }
    }
    
    // Direct method to show the shape selector
    showShapeSelector() {
        const selector = document.getElementById('stationShapeSelector');
        if (!selector) return false;
        
        // Make all shape options available
        const shapeOptions = selector.querySelectorAll('.shape-option');
        shapeOptions.forEach(option => {
            // Remove any disabled styling
            option.classList.remove('disabled');
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
            
            // Add click handler if it doesn't exist
            if (!option.onclick) {
                option.onclick = () => {
                    const shape = option.getAttribute('data-shape');
                    if (window.game) {
                        window.game.selectedStationType = shape;
                    }
                    
                    // Show notification
                    this.showNotification(`Click on the map to place a ${shape} station`, 'info');
                    
                    // Hide selector
                    selector.style.display = 'none';
                    selector.classList.remove('active');
                };
            }
        });
        
        // Show the selector
        selector.style.display = 'block';
        selector.classList.add('active');
        return true;
    }
    
    setupTooltips() {
        // Add icons to the role indicator based on role
        const roleIcon = this.roleNameEl.parentElement.previousElementSibling;
        roleIcon.innerHTML = '<span>R</span>'; // Default icon
    }
    
    addButtonPressEffect(button) {
        button.classList.add('button-pressed');
        setTimeout(() => {
            button.classList.remove('button-pressed');
        }, 200);
    }
    
    initTeamGame(players, currentPlayerId) {
        this.assignRoles(players);
        this.assignStationShapes(players);
        this.updateRoleDisplay(currentPlayerId);
        this.updateShapeAssignmentInfo(currentPlayerId);
        this.generateObjectives();
        this.startMission();
        
        // Set initial UI state
        this.updateObjectivesList();
        this.updateTeamProgress();
        
        // Show welcome notification
        this.showNotification('Team mission started! Work together to complete objectives', 'info');
    }
    
    assignRoles(players) {
        // Randomly assign roles to players
        const shuffledRoles = [...this.availableRoles].sort(() => 0.5 - Math.random());
        
        players.forEach((player, index) => {
            this.playerRoles[player.id] = shuffledRoles[index % this.availableRoles.length];
        });
    }
    
    assignStationShapes(players) {
        // Assign each player a specific station shape
        const availableShapes = [...this.stationShapes];
        
        console.log('Assigning station shapes to players:', players);
        
        players.forEach((player, index) => {
            // If we have more players than shapes, wrap around
            const shapeIndex = index % availableShapes.length;
            const assignedShape = availableShapes[shapeIndex];
            this.playerStationShapes[player.id] = assignedShape;
            console.log(`Assigned ${assignedShape} to player ${player.id} (${player.name})`);
        });
        
        console.log('All shape assignments:', this.playerStationShapes);
        
        // Update game with the new station types if diamond is being used
        if (this.game && players.some(p => this.playerStationShapes[p.id] === 'diamond')) {
            // Add diamond to the station types if it's not already there
            if (!this.game.stationTypes.includes('diamond')) {
                this.game.stationTypes.push('diamond');
                console.log('Added diamond to game station types');
            }
        }
    }
    
    updateRoleDisplay(playerId) {
        const role = this.playerRoles[playerId];
        if (role) {
            this.roleNameEl.textContent = role.name;
            this.roleDescEl.textContent = role.description;
            
            // Update the role icon
            const roleIcon = document.querySelector('.role-icon');
            if (roleIcon) {
                roleIcon.innerHTML = role.name.charAt(0);
                
                // Set icon background color based on role
                switch(role.icon) {
                    case 'line':
                        roleIcon.style.backgroundColor = '#FF5722';
                        break;
                    case 'station':
                        roleIcon.style.backgroundColor = '#4CAF50';
                        break;
                    case 'traffic':
                        roleIcon.style.backgroundColor = '#2196F3';
                        break;
                    case 'network':
                        roleIcon.style.backgroundColor = '#9C27B0';
                        break;
                }
            }
        }
    }
    
    updateShapeAssignmentInfo(playerId) {
        const shape = this.playerStationShapes[playerId];
        if (shape) {
            // Update role description to include station shape
            const role = this.playerRoles[playerId];
            if (role) {
                this.roleDescEl.textContent = `${role.description} - You build ${shape} stations`;
            }
            
            // Show a notification about assigned station shape
            setTimeout(() => {
                this.showNotification(`You are responsible for building ${shape} stations`, 'info');
            }, 1500); // Slight delay to show after the role notification
        }
    }
    
    generateObjectives() {
        // Clear existing objectives
        this.objectives = [];
        
        // Generate a comprehensive set of team objectives for the mission
        // These are designed to encourage teamwork for 12/13-year-olds
        const objectiveTemplates = [
            // Original objectives
            {
                name: 'Network Expansion',
                description: 'Connect 3 new stations to your network',
                type: 'connection',
                target: 3,
                progress: 0,
                completed: false,
                points: 100
            },
            {
                name: 'Triangle Express',
                description: 'Transport 5 passengers to triangle stations',
                type: 'passenger_triangle',
                target: 5,
                progress: 0,
                completed: false,
                points: 150
            },
            
            // New collaborative objectives
            {
                name: 'Rainbow Network',
                description: 'Create a network with all 4 line colors',
                type: 'line_diversity',
                target: 4,
                progress: 0,
                completed: false,
                points: 200,
                tip: 'Each team member should add at least one line of a different color!'
            },
            {
                name: 'Transfer Hub',
                description: 'Create a station where 3 different lines intersect',
                type: 'transfer_hub',
                target: 1,
                progress: 0,
                completed: false,
                points: 250,
                tip: 'Plan your lines together to meet at one central station!'
            },
            {
                name: 'Rescue Mission',
                description: 'Transport 5 passengers that have been waiting for over 30 seconds',
                type: 'rescue_passengers',
                target: 5,
                progress: 0,
                completed: false,
                points: 200,
                tip: 'Look for passengers that are changing color (yellow or red)'
            },
            {
                name: 'Balanced System',
                description: 'Create at least 2 stations of each type (circle, square, triangle, diamond)',
                type: 'balanced_stations',
                target: 1, // Binary completion
                progress: 0,
                completed: false,
                points: 300,
                tip: 'Coordinate with your team to build different station types!'
            },
            {
                name: 'Overcrowding Prevention',
                description: 'Prevent any station from having more than 4 passengers for 60 seconds',
                type: 'prevent_overcrowding',
                target: 60, // Count seconds
                progress: 0,
                completed: false,
                points: 250,
                tip: 'Watch for stations getting crowded and work together to move passengers!'
            },
            {
                name: 'Efficient Transit',
                description: 'Transport 15 passengers in total',
                type: 'passenger_total',
                target: 15,
                progress: 0,
                completed: false,
                points: 150
            },
            {
                name: 'Express Line',
                description: 'Create a line that connects stations of all 4 types',
                type: 'express_line',
                target: 1, // Binary completion
                progress: 0,
                completed: false,
                points: 300,
                tip: 'This line should connect at least one of each station type!'
            },
            {
                name: 'Multi-Modal Transit',
                description: 'Create a network where each station type has at least 2 passengers delivered',
                type: 'multi_modal',
                target: 4, // All 4 station types
                progress: 0,
                stationDeliveries: {
                    'circle': 0,
                    'square': 0,
                    'triangle': 0,
                    'diamond': 0
                },
                completed: false,
                points: 250,
                tip: 'Make sure passengers can get to every type of station!'
            },
            {
                name: 'Rapid Rescue',
                description: 'Reduce passenger wait time by creating direct routes',
                type: 'rapid_rescue',
                target: 10, // 10 passengers with wait time < 15 seconds
                progress: 0,
                completed: false,
                points: 200,
                tip: 'Create direct connections between popular stations!'
            }
        ];
        
        // Select three random objectives, making sure at least one is collaborative
        const collaborativeObjectives = objectiveTemplates.filter(obj => obj.tip);
        const standardObjectives = objectiveTemplates.filter(obj => !obj.tip);
        
        // Randomly select at least one collaborative objective
        const selectedCollaborative = [...collaborativeObjectives].sort(() => 0.5 - Math.random()).slice(0, 2);
        const selectedStandard = [...standardObjectives].sort(() => 0.5 - Math.random()).slice(0, 1);
        
        // Combine and shuffle the selection
        this.objectives = [...selectedCollaborative, ...selectedStandard].sort(() => 0.5 - Math.random());
        
        // Add tips to objective descriptions if they exist
        this.objectives.forEach(objective => {
            if (objective.tip) {
                objective.description = `${objective.description} (Tip: ${objective.tip})`;
            }
        });
    }
    
    startMission() {
        this.missionActive = true;
        this.missionTimeRemaining = 600; // 10 minutes in seconds
        this.updateTimer();
        
        // Start mission timer
        this.missionTimer = setInterval(() => {
            this.missionTimeRemaining--;
            this.updateTimer();
            
            // Warn when time is getting low
            if (this.missionTimeRemaining === 120) {
                this.showNotification('Two minutes remaining!', 'warning');
            } else if (this.missionTimeRemaining === 60) {
                this.showNotification('One minute remaining!', 'warning');
            } else if (this.missionTimeRemaining === 30) {
                this.showNotification('30 seconds remaining!', 'warning');
            } else if (this.missionTimeRemaining === 10) {
                this.showNotification('10 seconds remaining!', 'error');
            }
            
            if (this.missionTimeRemaining <= 0) {
                this.endMission(false); // Mission failed due to time
            }
        }, 1000);
    }
    
    updateTimer() {
        const minutes = Math.floor(this.missionTimeRemaining / 60);
        const seconds = this.missionTimeRemaining % 60;
        this.objectiveTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running low
        if (this.missionTimeRemaining < 60) {
            this.objectiveTimerEl.style.color = '#F44336';
            // Add pulse animation when time is low
            if (!this.objectiveTimerEl.classList.contains('pulse-animation')) {
                this.objectiveTimerEl.classList.add('pulse-animation');
                
                // Add CSS for pulse animation if not already in the stylesheet
                if (!document.getElementById('pulse-animation-style')) {
                    const style = document.createElement('style');
                    style.id = 'pulse-animation-style';
                    style.textContent = `
                        @keyframes pulse {
                            0% { transform: scale(1); }
                            50% { transform: scale(1.1); }
                            100% { transform: scale(1); }
                        }
                        .pulse-animation {
                            animation: pulse 1s infinite;
                            display: inline-block;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            this.objectiveTimerEl.style.color = 'white';
            this.objectiveTimerEl.classList.remove('pulse-animation');
        }
    }
    
    updateObjectivesList() {
        // Clear current objectives display
        this.objectivesListEl.innerHTML = '';
        
        // Create objective elements
        this.objectives.forEach((objective, index) => {
            const objectiveEl = document.createElement('div');
            objectiveEl.className = 'objective-item';
            
            // Add appropriate class based on state
            if (index === this.activeObjectiveIndex) {
                objectiveEl.classList.add('active');
            }
            
            if (objective.completed) {
                objectiveEl.classList.add('completed');
            }
            
            // Create objective header with collaboration icon for collaborative objectives
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.justifyContent = 'space-between';
            
            const nameEl = document.createElement('span');
            nameEl.className = 'objective-name';
            nameEl.textContent = objective.name;
            
            headerDiv.appendChild(nameEl);
            
            // Add collaboration icon for collaborative objectives (those with tips)
            if (objective.tip && !objective.completed) {
                const collaborationIcon = document.createElement('span');
                collaborationIcon.className = 'collaboration-icon';
                headerDiv.appendChild(collaborationIcon);
            }
            
            objectiveEl.appendChild(headerDiv);
            
            // Create description and progress
            const descDiv = document.createElement('div');
            descDiv.className = 'objective-desc';
            
            // Extract the main description (without the tip)
            let mainDesc = objective.description;
            if (objective.tip) {
                mainDesc = objective.description.split('(Tip:')[0].trim();
            }
            
            const descTextEl = document.createElement('span');
            descTextEl.textContent = mainDesc;
            descTextEl.style.flex = '1';
            
            const progressEl = document.createElement('span');
            progressEl.className = 'objective-progress';
            progressEl.textContent = `${objective.progress}/${objective.target}`;
            
            descDiv.appendChild(descTextEl);
            descDiv.appendChild(progressEl);
            
            objectiveEl.appendChild(descDiv);
            
            // Add tip separately with special formatting for collaborative objectives
            if (objective.tip && !objective.completed) {
                const tipEl = document.createElement('div');
                tipEl.className = 'objective-tip';
                tipEl.textContent = objective.tip;
                objectiveEl.appendChild(tipEl);
            }
            
            // Add click event to focus on this objective
            objectiveEl.addEventListener('click', () => {
                this.setActiveObjective(index);
                this.addButtonPressEffect(objectiveEl);
            });
            
            // Add hover effect
            objectiveEl.addEventListener('mouseenter', () => {
                if (!objective.completed) {
                    objectiveEl.style.transform = 'translateY(-2px)';
                    objectiveEl.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }
            });
            
            objectiveEl.addEventListener('mouseleave', () => {
                if (!objective.completed) {
                    objectiveEl.style.transform = '';
                    objectiveEl.style.boxShadow = '';
                }
            });
            
            this.objectivesListEl.appendChild(objectiveEl);
        });
    }
    
    setActiveObjective(index) {
        // Only allow if we have objectives
        if (!this.objectives || index < 0 || index >= this.objectives.length) return;
        
        // Remove active class from all objectives
        const objectives = document.querySelectorAll('.objective-item');
        objectives.forEach(obj => obj.classList.remove('active'));
        
        // Get the objective
            const objective = this.objectives[index];
        if (!objective) return;
        
        // Add active class to selected objective
        const selectedObjective = document.getElementById(`objective-${objective.id}`);
        if (selectedObjective) {
            selectedObjective.classList.add('active');
            
            // Scroll to the selected objective
            const objectivesList = document.getElementById('objectivesList');
            if (objectivesList) {
                objectivesList.scrollTop = selectedObjective.offsetTop - objectivesList.offsetTop;
            }
        }
        
        // Save the active objective index
        this.activeObjectiveIndex = index;
        
        // Show a notification about the focused objective
        this.showNotification(`Team Focus: ${objective.description}`, 'info');
        
        // Send this action to other players if in multiplayer
        if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
            window.multiplayerManager.sendTeamworkAction({
                type: 'objective_focus',
                objectiveIndex: index
            });
        }
    }
    
    updateProgress(action, data) {
        // Find objective that matches this action
        const objective = this.objectives.find(obj => {
            if (obj.completed) return false;
            
            switch (obj.type) {
                case 'passenger_count':
                    return action === 'passenger_delivered';
                    
                case 'line_count':
                    return action === 'new_line';
                    
                case 'station_count':
                    return action === 'station_added';
                    
                case 'shape_connection':
                    return action === 'station_connected' && 
                           data.stationType === obj.shape;
                           
                case 'station_type':
                    return action === 'station_added' && 
                           data.stationType === obj.stationType;
                           
                case 'speed_challenge':
                    return action === 'passenger_delivered' && 
                           this.missionTimeRemaining > obj.timeThreshold;
                           
                case 'efficiency':
                    return action === 'passenger_delivered' && 
                           data.waitTime < obj.waitThreshold;
                           
                case 'network_size':
                    return (action === 'station_added' || action === 'new_line') && 
                           (this.game.stations.length + this.game.lines.length) > obj.target;
                           
                default:
                    return false;
            }
        });
        
        if (!objective) return;
        
        // Increment progress based on objective type
        switch (objective.type) {
            case 'passenger_count':
                objective.progress += data.count || 1;
                    break;
                    
            case 'line_count':
                objective.progress = this.game.lines.length;
                break;
                
            case 'station_count':
                objective.progress = this.game.stations.length;
                    break;
                    
            case 'shape_connection':
                // Count connected stations of this shape type
                if (action === 'station_connected' && data.stationType === objective.shape) {
                    const stations = this.game.stations.filter(s => s.type === objective.shape);
                    const connectedStations = stations.filter(s => {
                        return this.game.lines.some(line => line.stations.includes(s.id));
                    });
                    
                    objective.progress = connectedStations.length;
                    objective.target = stations.length; // Update target as new stations are added
                }
                break;
                
            case 'station_type':
                // Count stations of this type
                if (action === 'station_added' && data.stationType === objective.stationType) {
                    const typeStations = this.game.stations.filter(s => s.type === objective.stationType);
                    objective.progress = typeStations.length;
                    }
                    break;
                    
            case 'speed_challenge':
                if (this.missionTimeRemaining > objective.timeThreshold) {
                    objective.progress += data.count || 1;
                    }
                    break;
                    
            case 'efficiency':
                if (data.waitTime < objective.waitThreshold) {
                    objective.progress += 1;
                    }
                    break;
                
            case 'network_size':
                objective.progress = this.game.stations.length + this.game.lines.length;
                break;
            }
            
        // Update the objective display
                this.highlightObjectiveProgress(objective);
        
        // Update team progress
        this.updateTeamProgress();
        
        // Send update to server if in multiplayer mode
        if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
            window.multiplayerManager.sendObjectiveProgress(objective.id, objective.progress, false);
        }
        
        // Check if objective is complete
        if (objective.progress >= objective.target) {
            this.completeObjective(objective);
        }
    }
    
    highlightObjectiveProgress(objective) {
        // Find the DOM element for this objective
        const objectiveElements = Array.from(this.objectivesListEl.querySelectorAll('.objective-item'));
        const objectiveIndex = this.objectives.indexOf(objective);
        const objectiveEl = objectiveElements[objectiveIndex];
        
        if (!objectiveEl) return;
        
        // Add a flash effect
        objectiveEl.classList.add('progress-flash');
        setTimeout(() => {
            objectiveEl.classList.remove('progress-flash');
        }, 1000);
        
        // Add CSS for flash animation if not already in the stylesheet
        if (!document.getElementById('progress-flash-style')) {
            const style = document.createElement('style');
            style.id = 'progress-flash-style';
            style.textContent = `
                @keyframes progress-flash {
                    0% { background-color: rgba(76, 175, 80, 0.3); }
                    100% { background-color: rgba(240, 240, 240, 0.7); }
                }
                .progress-flash {
                    animation: progress-flash 1s ease-out;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    addCompletionEffect(objective) {
        // Find the DOM element for this objective
        const objectiveElements = Array.from(this.objectivesListEl.querySelectorAll('.objective-item'));
        const objectiveIndex = this.objectives.indexOf(objective);
        const objectiveEl = objectiveElements[objectiveIndex];
        
        if (!objectiveEl) return;
        
        // Add a sparkle effect
        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            
            // Random position within the objective element
            sparkle.style.left = `${10 + Math.random() * 80}%`;
            sparkle.style.top = `${10 + Math.random() * 80}%`;
            
            // Random delay
            sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
            
            objectiveEl.appendChild(sparkle);
            
            // Remove after animation
            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.parentNode.removeChild(sparkle);
                }
            }, 1500);
        }
        
        // Add CSS for sparkle animation if not already in the stylesheet
        if (!document.getElementById('sparkle-style')) {
            const style = document.createElement('style');
            style.id = 'sparkle-style';
            style.textContent = `
                .sparkle {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background-color: #FFD700;
                    border-radius: 50%;
                    z-index: 5;
                    pointer-events: none;
                    animation: sparkle 1s ease-out forwards;
                }
                
                @keyframes sparkle {
                    0% { transform: scale(0) rotate(0deg); opacity: 1; }
                    100% { transform: scale(1.5) rotate(180deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    updateTeamProgress() {
        // Calculate overall progress percentage
        const totalTargets = this.objectives.reduce((sum, obj) => sum + obj.target, 0);
        const currentProgress = this.objectives.reduce((sum, obj) => sum + Math.min(obj.progress, obj.target), 0);
        const progressPercentage = Math.min(100, Math.round((currentProgress / totalTargets) * 100));
        
        // Animate progress bar
        const currentWidth = parseInt(this.teamProgressBarEl.style.width) || 0;
        const targetWidth = `${progressPercentage}%`;
        
        // Only animate if there's a change
        if (currentWidth !== progressPercentage) {
            this.teamProgressBarEl.style.width = targetWidth;
        }
        
        // Update score with animation if it changed
        const currentScoreText = this.teamProgressTextEl.textContent;
        const currentScore = parseInt(currentScoreText.match(/\d+/)[0]) || 0;
        
        if (currentScore !== this.teamScore) {
            // Animate score change
            this.animateNumberChange(currentScore, this.teamScore, (value) => {
                this.teamProgressTextEl.textContent = `Team Score: ${value}`;
            });
        }
    }
    
    animateNumberChange(start, end, updateCallback, duration = 1000) {
        const startTime = performance.now();
        const difference = end - start;
        
        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easing = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            const value = Math.round(start + difference * easing(progress));
            updateCallback(value);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        
        requestAnimationFrame(step);
    }
    
    endMission(success) {
        // If mission is already ended, don't do anything
        if (!this.missionActive) return;
        
        // Mark mission as inactive
        this.missionActive = false;
        
        // Clear timer
        if (this.missionTimer) {
            clearInterval(this.missionTimer);
            this.missionTimer = null;
        }
        
        // Update timer display to show stopped state
        if (this.objectiveTimerEl) {
            if (!success) {
                this.objectiveTimerEl.classList.add('failed');
                this.objectiveTimerEl.textContent = 'GAME OVER';
            } else {
                this.objectiveTimerEl.classList.add('completed');
            }
        }
        
        // Show appropriate reflection
        this.reflectionTitle.textContent = success ? 'Mission Successful!' : 'Mission Failed';
        
        // Play sound
        this.playSound(success ? 'success' : 'failure');
        
        // Calculate stats
        const completedObjectives = this.objectives.filter(obj => obj.completed).length;
        const totalPassengers = this.objectives.find(obj => obj.type === 'passenger_total')?.progress || 0;
        
        // Update reflection UI
        this.finalScoreEl.textContent = this.teamScore;
        this.objectivesCompletedEl.textContent = `${completedObjectives}/${this.objectives.length}`;
        this.totalPassengersEl.textContent = totalPassengers;
        
        // Show the reflection overlay
        this.reflectionOverlay.classList.remove('hidden');
        
        // Animate the entrance of the reflection content
        const content = this.reflectionOverlay.querySelector('.overlay-content');
        
        // Collect stats for multiplayer
        const stats = {
            score: this.teamScore,
            objectivesCompleted: completedObjectives,
            totalObjectives: this.objectives.length,
            passengerCount: totalPassengers,
            timeElapsed: this.missionTimeRemaining
        };
        
        // Send mission end to server if in multiplayer mode
        if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
            window.multiplayerManager.sendMissionEnd(success, stats);
        }
        
        // Continue button functionality
        if (this.continueBtn) {
            this.continueBtn.addEventListener('click', () => {
                // Hide the reflection overlay
                this.reflectionOverlay.classList.add('hidden');
                
                // Either restart or go to main menu
                if (success) {
                    // For now, just reload to restart
                    window.location.reload();
                } else {
                    // Reload to restart
                    window.location.reload();
                }
            });
        }
    }
    
    // Sound effects
    playSound(type) {
        // In a real implementation, this would play actual sounds
        console.log(`Playing sound: ${type}`);
        
        // Create audio context on first use
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                return;
            }
        }
        
        // Simple oscillator-based sounds
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        switch (type) {
            case 'complete':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
                
            case 'success':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
                oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.4);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.4);
                break;
                
            case 'failure':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
                break;
        }
    }
    
    showNotification(message, type) {
        // Create notification element
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification ${type || ''}`;
        notificationEl.textContent = message;
        
        // Add to the game container
        document.querySelector('.game-container').appendChild(notificationEl);
        
        // Auto-remove after animation completes
        notificationEl.addEventListener('animationend', (e) => {
            if (e.animationName === 'notificationFadeOut') {
                if (notificationEl.parentNode) {
                    notificationEl.parentNode.removeChild(notificationEl);
                }
            }
        });
    }
    
    // Called by the game to update teamwork features
    update(deltaTime) {
        // Only update if the game is not paused and mission is active
        if (!this.missionActive || !this.game || this.game.paused) return; // Stop if mission ended or game paused

        this.missionTimeRemaining -= deltaTime;

        // Update timer display
        if (this.objectiveTimerEl) {
            const minutes = Math.floor(this.missionTimeRemaining / 60);
            const seconds = Math.floor(this.missionTimeRemaining % 60);
            this.objectiveTimerEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            // Add warning classes when time is running low
            if (this.missionTimeRemaining <= 60) {
                this.objectiveTimerEl.classList.add('critical');
                
                // Display time warning notification at 1 minute remaining
                if (Math.floor(this.missionTimeRemaining) === 60) {
                    this.showNotification('One minute remaining!', 'warning');
                }
            } else if (this.missionTimeRemaining <= 120) {
                this.objectiveTimerEl.classList.add('warning');
                
                // Display time warning notification at 2 minutes remaining
                if (Math.floor(this.missionTimeRemaining) === 120) {
                    this.showNotification('Two minutes remaining!', 'warning');
                }
            }
        }
        
        // Check if time is up
        if (this.missionTimeRemaining <= 0) {
            this.endMission(false);
        }
        
        // Check for ongoing objectives that need continuous monitoring
        const needsUpdate = this.objectives.some(obj => 
            !obj.completed && 
            ['prevent_overcrowding', 'line_diversity', 'balanced_stations'].includes(obj.type)
        );
        
        if (needsUpdate) {
            // Check for specific objective types that need regular updates
            this.checkContinuousObjectives();
        }
    }
    
    // New method to check objectives that need continuous monitoring
    checkContinuousObjectives() {
        if (!this.game) return;
        
        // For each active objective that needs continuous monitoring
        this.objectives.forEach(objective => {
            if (objective.completed) return;
            
            switch (objective.type) {
                case 'line_diversity':
                    // Check current line diversity
                    const uniqueColors = new Set(this.game.lines.map(line => line.color));
                    objective.progress = uniqueColors.size;
                    break;
                    
                case 'balanced_stations':
                    // Check current station type balance
                    const stationCounts = {
                        'circle': 0,
                        'square': 0,
                        'triangle': 0,
                        'diamond': 0
                    };
                    
                    this.game.stations.forEach(station => {
                        if (stationCounts[station.type] !== undefined) {
                            stationCounts[station.type]++;
                        }
                    });
                    
                    // Check if we have at least 2 of each type
                    const isBalanced = Object.values(stationCounts).every(count => count >= 2);
                    objective.progress = isBalanced ? 1 : 0;
                    break;
                    
                case 'prevent_overcrowding':
                    // This is primarily handled by tick events, but we can also check here
                    const anyOvercrowded = this.game.stations.some(station => station.passengers.length > 4);
                    if (anyOvercrowded) {
                        objective.progress = 0; // Reset counter if any station is overcrowded
                    }
                    break;
            }
            
            // Check if objective is now completed
            if (objective.progress >= objective.target && !objective.completed) {
                this.completeObjective(objective);
            }
        });
        
        // Update UI
        this.updateObjectivesList();
        this.updateTeamProgress();
    }
    
    // Helper method to complete an objective
    completeObjective(objective) {
        if (!objective || objective.completed) return;
        
        // Mark as completed
        objective.completed = true;
        objective.progress = objective.target;
        
        // Add completion animation
        this.addCompletionEffect(objective);
        
        // Play success sound
        this.playSound('objective_complete');
        
        // Show a notification
        this.showNotification(`Team Objective Completed: ${objective.description}`, 'success');
        
        // Update the objective display
        const objectiveElement = document.getElementById(`objective-${objective.id}`);
        if (objectiveElement) {
            objectiveElement.classList.add('completed');
            
            // Update progress bar
            const progressBar = objectiveElement.querySelector('.objective-progress-fill');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
            
            // Update progress text
            const progressText = objectiveElement.querySelector('.objective-progress-text');
            if (progressText) {
                progressText.textContent = `${objective.target}/${objective.target}`;
            }
        }
        
        // Update team progress
        this.updateTeamProgress();
        
        // Send update to server if in multiplayer mode
        if (window.multiplayerManager && window.multiplayerManager.gameStarted) {
            window.multiplayerManager.sendObjectiveProgress(objective.id, objective.progress, true);
        }
        
        // Check if all objectives are complete to end the mission
        const allCompleted = this.objectives.every(obj => obj.completed);
        if (allCompleted) {
            setTimeout(() => {
                this.endMission(true);
            }, 1500);
        }
    }
    
    // Handle game events
    handleGameEvent(event, data) {
        switch (event) {
            case 'station_connected':
                // A new station was connected to a line
                this.updateProgress('station_connected', data);
                break;
                
            case 'passenger_delivered':
                // A passenger was successfully delivered
                this.updateProgress('passenger_delivered', data);
                break;
                
            case 'line_updated':
                // A line was updated
                this.updateProgress('line_updated', data);
                break;
                
            case 'station_overcrowded':
                // A station became overcrowded
                this.showNotification('Warning: Station overcrowded!', 'warning');
                break;
                
            case 'station_added':
                // A new station was added to the map
                this.updateProgress('station_added', data);
                this.showNotification(`New ${data.type} station added!`, 'info');
                break;
                
            case 'tick':
                // A game tick occurred (for time-based objectives)
                this.updateProgress('tick', data);
                break;
                
            case 'game_updated':
                // A periodic game state update
                this.updateProgress('game_updated', data);
                break;
        }
    }
    
    // Add a method to update objective progress from the server
    updateObjectiveProgress(objectiveId, progress, completed) {
        const objective = this.objectives.find(obj => obj.id === objectiveId);
        if (!objective) return;
        
        objective.progress = progress;
        
        if (completed) {
            objective.completed = true;
            this.addCompletionEffect(objective);
        }
        
        // Update the UI
        this.highlightObjectiveProgress(objective);
        this.updateTeamProgress();
    }
    
    // Add a method to show pings from other players
    showPing(x, y, pingType, playerId) {
        // Create ping element
        const ping = document.createElement('div');
        ping.className = `ping ${pingType}`;
        ping.style.position = 'absolute';
        
        // Convert world coordinates to screen coordinates if needed
        let screenX = x;
        let screenY = y;
        
        if (window.game && window.game.renderer) {
            const screenCoords = window.game.renderer.worldToScreen(x, y);
            screenX = screenCoords.x;
            screenY = screenCoords.y;
        }
        
        ping.style.left = `${screenX}px`;
        ping.style.top = `${screenY}px`;
        
        // Add player info to ping
        const playerInfo = document.createElement('span');
        playerInfo.className = 'ping-player';
        
        // Find player name if available
        let playerName = 'Player';
        if (this.game && this.game.isMultiplayer) {
            const player = this.game.players.find(p => p.id === playerId);
            if (player) {
                playerName = player.name;
            }
        }
        
        playerInfo.textContent = playerName;
        ping.appendChild(playerInfo);
        
        // Add ping to the game container
        document.querySelector('.game-container').appendChild(ping);
        
        // Add animation
        ping.classList.add('ping-animation');
        
        // Remove after animation completes
        setTimeout(() => {
            if (ping.parentNode) {
                ping.parentNode.removeChild(ping);
            }
        }, 3000);
    }
}
