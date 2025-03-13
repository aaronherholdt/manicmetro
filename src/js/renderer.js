class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;
        
        // Camera and viewport settings
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.5,
            maxZoom: 2,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };
        
        // Virtual world size (larger than viewport)
        this.worldWidth = 2000;
        this.worldHeight = 2000;
        
        // Store bound event handlers for proper cleanup
        this._boundEventHandlers = {};
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Set up event listeners for panning and zooming
        this.setupPanAndZoom();
        
        // Cleanup event handlers when page unloads
        window.addEventListener('beforeunload', () => this.cleanup());
    }
    
    resizeCanvas() {
        // Set canvas to full window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Center the camera if it's the first time
        if (this.camera.x === 0 && this.camera.y === 0) {
            // Calculate center position based on the world and visible area
            this.camera.x = (this.worldWidth - this.canvas.width / this.camera.zoom) / 2;
            this.camera.y = (this.worldHeight - this.canvas.height / this.camera.zoom) / 2;
        }
        
        // Ensure camera is within bounds after resize
        this.constrainCamera();
    }
    
    setupPanAndZoom() {
        // Add panning class to canvas for cursor styling
        this.canvas.classList.add('panning');
        
        // Track if panning is currently active
        let isPanning = false;
        
        // Detect if device is touch-capable
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        // Prevent contextmenu during panning
        this.canvas.addEventListener('contextmenu', (e) => {
            if (isPanning) {
                e.preventDefault();
            }
        });
        
        // Mouse events for panning
        this.canvas.addEventListener('mousedown', (e) => {
            // Middle button (button 1) or Ctrl+Left click or right click for panning
            if (e.button === 1 || (e.button === 0 && e.ctrlKey) || e.button === 2) {
                isPanning = true;
                this.camera.isDragging = true;
                this.camera.lastX = e.clientX;
                this.camera.lastY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
                e.preventDefault(); // Prevent default browser behavior
                
                // Add global mouse events to handle pan even if cursor leaves canvas
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            }
        });
        
        // Handle mouse movement during panning - defined outside to use as removable listener
        const handleMouseMove = (e) => {
            if (this.camera.isDragging) {
                // Calculate the change in mouse position
                const dx = e.clientX - this.camera.lastX;
                const dy = e.clientY - this.camera.lastY;
                
                // Update camera position - ensure both axes update properly
                // Using requestAnimationFrame for smoother panning
                requestAnimationFrame(() => {
                    this.camera.x -= dx / this.camera.zoom;
                    this.camera.y -= dy / this.camera.zoom;
                    
                    // Keep camera within bounds
                    this.constrainCamera();
                });
                
                // Update last mouse position
                this.camera.lastX = e.clientX;
                this.camera.lastY = e.clientY;
                
                e.preventDefault(); // Prevent default browser behavior
            }
        };
        
        // Handle mouse up to stop panning - defined outside to use as removable listener
        const handleMouseUp = (e) => {
            if (this.camera.isDragging) {
                isPanning = false;
                this.camera.isDragging = false;
                this.canvas.style.cursor = 'grab';
                
                // Remove global event listeners
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                
                e.preventDefault(); // Prevent default browser behavior
            }
        };
        
        // Mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); // Prevent default scrolling
            
            // Get mouse position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Convert mouse position to world coordinates before zoom
            const worldX = mouseX / this.camera.zoom + this.camera.x;
            const worldY = mouseY / this.camera.zoom + this.camera.y;
            
            // Adjust zoom level - smoother on trackpads by normalizing deltaY
            const zoomFactor = Math.abs(e.deltaY) < 50 ? 1.05 : 1.1; // Smaller zoom for trackpads
            
            if (e.deltaY < 0) {
                this.camera.zoom = Math.min(this.camera.maxZoom, this.camera.zoom * zoomFactor);
            } else {
                this.camera.zoom = Math.max(this.camera.minZoom, this.camera.zoom / zoomFactor);
            }
            
            // Update camera position to zoom towards mouse position
            this.camera.x = worldX - mouseX / this.camera.zoom;
            this.camera.y = worldY - mouseY / this.camera.zoom;
            
            // Keep camera within bounds
            this.constrainCamera();
        });
        
        // Variables for touch handling
        let initialTouchDistance = 0;
        let lastTouchCount = 0;
        
        // Touch events for mobile panning and pinch zoom
        this.canvas.addEventListener('touchstart', (e) => {
            // Always prevent default to avoid browser gestures
            e.preventDefault();
            
            // Reset panning state when a new touch sequence begins
            if (e.touches.length === 1) {
                // Single touch - start panning
                isPanning = true;
                this.camera.isDragging = true;
                this.camera.lastX = e.touches[0].clientX;
                this.camera.lastY = e.touches[0].clientY;
                
                // Add a class to disable browser touch behaviors
                document.body.classList.add('panning-active');
                
                // Apply touch feedback
                if ('vibrate' in navigator) {
                    try {
                        navigator.vibrate(10); // Very subtle haptic feedback
                    } catch (err) {
                        // Ignore vibration errors
                    }
                }
            } 
            else if (e.touches.length === 2) {
                // Two touches - track for pinch-to-zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                initialTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                lastTouchCount = 2;
                
                // Store midpoint for better zoom handling
                this.zoomMidpointX = (touch1.clientX + touch2.clientX) / 2;
                this.zoomMidpointY = (touch1.clientY + touch2.clientY) / 2;
            }
        }, { passive: false });
        
        // Handle touch movement for panning and pinch zoom
        this.canvas.addEventListener('touchmove', (e) => {
            // Always prevent default browser behavior
            e.preventDefault();
            
            // Add fallback for Android browsers that don't properly respect prevent default
            e.stopPropagation();
            
            if (e.touches.length === 1 && this.camera.isDragging) {
                // Single touch - handle panning
                const dx = e.touches[0].clientX - this.camera.lastX;
                const dy = e.touches[0].clientY - this.camera.lastY;
                
                // Only pan if the movement is significant enough (prevents accidental pans)
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    // Update camera position - use requestAnimationFrame for smoother updates
                    requestAnimationFrame(() => {
                        this.camera.x -= dx / this.camera.zoom;
                        this.camera.y -= dy / this.camera.zoom;
                        
                        // Keep camera within bounds
                        this.constrainCamera();
                    });
                }
                
                this.camera.lastX = e.touches[0].clientX;
                this.camera.lastY = e.touches[0].clientY;
            } 
            else if (e.touches.length === 2) {
                // Two touches - handle pinch-to-zoom
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                
                // Calculate new distance between touches
                const newTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                // Update midpoint for better zoom handling
                const newMidpointX = (touch1.clientX + touch2.clientX) / 2;
                const newMidpointY = (touch1.clientY + touch2.clientY) / 2;
                
                // If we have a meaningful change in distance, zoom accordingly
                if (initialTouchDistance > 0 && Math.abs(newTouchDistance - initialTouchDistance) > 5) {
                    // Get rectangle of the canvas
                    const rect = this.canvas.getBoundingClientRect();
                    
                    // Convert midpoint to canvas coordinates
                    const canvasMidpointX = newMidpointX - rect.left;
                    const canvasMidpointY = newMidpointY - rect.top;
                    
                    // Convert to world coordinates
                    const worldMidpointX = canvasMidpointX / this.camera.zoom + this.camera.x;
                    const worldMidpointY = canvasMidpointY / this.camera.zoom + this.camera.y;
                    
                    // Calculate zoom factor based on the change in distance
                    const zoomFactor = newTouchDistance / initialTouchDistance;
                    
                    // Apply zoom, limiting to min/max zoom levels
                    const newZoom = this.camera.zoom * zoomFactor;
                    this.camera.zoom = Math.max(
                        this.camera.minZoom,
                        Math.min(this.camera.maxZoom, newZoom)
                    );
                    
                    // Update the camera position to zoom toward the midpoint
                    this.camera.x = worldMidpointX - canvasMidpointX / this.camera.zoom;
                    this.camera.y = worldMidpointY - canvasMidpointY / this.camera.zoom;
                    
                    // Keep camera within bounds
                    this.constrainCamera();
                    
                    // Update for panning during pinch
                    if (this.zoomMidpointX && this.zoomMidpointY) {
                        const midpointDx = newMidpointX - this.zoomMidpointX;
                        const midpointDy = newMidpointY - this.zoomMidpointY;
                        
                        // Pan camera based on midpoint movement
                        this.camera.x -= midpointDx / this.camera.zoom;
                        this.camera.y -= midpointDy / this.camera.zoom;
                        
                        // Keep camera within bounds
                        this.constrainCamera();
                    }
                    
                    // Update initial distance and midpoint for next move event
                    initialTouchDistance = newTouchDistance;
                    this.zoomMidpointX = newMidpointX;
                    this.zoomMidpointY = newMidpointY;
                }
                
                lastTouchCount = 2;
            }
        }, { passive: false });
        
        // Additional event to cancel touch behaviors
        this.canvas.addEventListener('touchcancel', (e) => {
            // Ensure all touch-related states are reset
            isPanning = false;
            this.camera.isDragging = false;
            initialTouchDistance = 0;
            lastTouchCount = 0;
            
            // Remove panning class from body
            document.body.classList.remove('panning-active');
            
            // Clear stored midpoints
            this.zoomMidpointX = null;
            this.zoomMidpointY = null;
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            // If all touches are removed, reset panning state
            if (e.touches.length === 0) {
                isPanning = false;
                this.camera.isDragging = false;
                initialTouchDistance = 0;
                lastTouchCount = 0;
                
                // Remove panning class from body
                document.body.classList.remove('panning-active');
                
                // Clear stored midpoints
                this.zoomMidpointX = null;
                this.zoomMidpointY = null;
            }
            // If transitioning from 2 fingers to 1, update for potential panning
            else if (lastTouchCount === 2 && e.touches.length === 1) {
                // Reset pinch zoom tracking
                initialTouchDistance = 0;
                
                // Update for continued panning with the remaining finger
                this.camera.lastX = e.touches[0].clientX;
                this.camera.lastY = e.touches[0].clientY;
                
                // Clear stored midpoints
                this.zoomMidpointX = null;
                this.zoomMidpointY = null;
            }
            
            // Update touch count
            lastTouchCount = e.touches.length;
            
            // Prevent default to avoid triggering clicks or other events
            e.preventDefault();
        }, { passive: false });
        
        // Add zoom buttons functionality
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                // Zoom in toward center
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                const worldX = centerX / this.camera.zoom + this.camera.x;
                const worldY = centerY / this.camera.zoom + this.camera.y;
                
                this.camera.zoom = Math.min(this.camera.maxZoom, this.camera.zoom * 1.2);
                
                this.camera.x = worldX - centerX / this.camera.zoom;
                this.camera.y = worldY - centerY / this.camera.zoom;
                
                this.constrainCamera();
            });
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                // Zoom out from center
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                const worldX = centerX / this.camera.zoom + this.camera.x;
                const worldY = centerY / this.camera.zoom + this.camera.y;
                
                this.camera.zoom = Math.max(this.camera.minZoom, this.camera.zoom / 1.2);
                
                this.camera.x = worldX - centerX / this.camera.zoom;
                this.camera.y = worldY - centerY / this.camera.zoom;
                
                this.constrainCamera();
            });
        }
        
        // Setup fullscreen toggle
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }
    
    // Keep camera within world boundaries
    constrainCamera() {
        // Calculate visible area in world coordinates based on current zoom
        const visibleWidth = this.canvas.width / this.camera.zoom;
        const visibleHeight = this.canvas.height / this.camera.zoom;
        
        // Calculate maximum bounds to prevent showing areas outside the world
        // Use Math.max to prevent negative values when the viewport is larger than the world
        const maxX = Math.max(0, this.worldWidth - visibleWidth);
        const maxY = Math.max(0, this.worldHeight - visibleHeight);
        
        // Ensure camera doesn't go out of bounds - enforce both x and y constraints
        this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX / this.camera.zoom + this.camera.x,
            y: screenY / this.camera.zoom + this.camera.y
        };
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom,
            y: (worldY - this.camera.y) * this.camera.zoom
        };
    }
    
    toggleFullscreen() {
        const gameContainer = document.querySelector('.game-container');
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen();
            } else if (gameContainer.mozRequestFullScreen) {
                gameContainer.mozRequestFullScreen();
            } else if (gameContainer.webkitRequestFullscreen) {
                gameContainer.webkitRequestFullscreen();
            } else if (gameContainer.msRequestFullscreen) {
                gameContainer.msRequestFullscreen();
            }
            document.getElementById('fullscreenBtn').innerHTML = '<i class="fas fa-compress"></i>';
            
            // For iOS: apply special fixes for fullscreen
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
                gameContainer.style.position = 'absolute';
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            document.getElementById('fullscreenBtn').innerHTML = '<i class="fas fa-expand"></i>';
            
            // Reset iOS fixes
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.height = '';
                gameContainer.style.position = 'fixed';
            }
        }
        
        // After toggling fullscreen, we need to resize the canvas
        // Using setTimeout because fullscreen change takes a moment
        setTimeout(() => {
            this.resizeCanvas();
        }, 100);
    }
    
    render() {
        this.clear();
        
        // Save context state
        this.ctx.save();
        
        // Use integer values for smoother rendering
        const x = Math.floor(this.camera.x);
        const y = Math.floor(this.camera.y);
        
        // Apply camera transform with GPU acceleration hint
        this.ctx.setTransform(
            this.camera.zoom, 0,
            0, this.camera.zoom,
            -x * this.camera.zoom, -y * this.camera.zoom
        );
        
        // Draw game elements in world coordinates
        this.drawGrid();
        this.drawLines();
        this.drawStations();
        this.drawTrains();
        
        // Restore context state
        this.ctx.restore();
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawGrid() {
        // Draw the grid for the entire world size
        const gridSize = 20;
        const gridColor = 'rgba(200, 200, 200, 0.1)';
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Calculate visible area in world coordinates
        const visibleStartX = Math.floor(this.camera.x / gridSize) * gridSize;
        const visibleStartY = Math.floor(this.camera.y / gridSize) * gridSize;
        const visibleEndX = Math.ceil((this.camera.x + this.canvas.width / this.camera.zoom) / gridSize) * gridSize;
        const visibleEndY = Math.ceil((this.camera.y + this.canvas.height / this.camera.zoom) / gridSize) * gridSize;
        
        // Vertical lines
        for (let x = visibleStartX; x <= visibleEndX; x += gridSize) {
            this.ctx.moveTo(x, visibleStartY);
            this.ctx.lineTo(x, visibleEndY);
        }
        
        // Horizontal lines
        for (let y = visibleStartY; y <= visibleEndY; y += gridSize) {
            this.ctx.moveTo(visibleStartX, y);
            this.ctx.lineTo(visibleEndX, y);
        }
        
        this.ctx.stroke();
    }
    
    drawLines() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        for (const line of this.game.lines) {
            if (line.stations.length < 2) continue;
            
            this.ctx.beginPath();
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = 5;
            
            // Start from the first station
            const firstStation = this.game.stations[line.stations[0]];
            this.ctx.moveTo(firstStation.x, firstStation.y);
            
            // Draw line segments to each station
            for (let i = 1; i < line.stations.length; i++) {
                const station = this.game.stations[line.stations[i]];
                this.ctx.lineTo(station.x, station.y);
            }
            
            this.ctx.stroke();
        }
    }
    
    drawStations() {
        for (const station of this.game.stations) {
            // Only draw stations that are in the visible area
            const screen = this.worldToScreen(station.x, station.y);
            if (screen.x < -50 || screen.x > this.canvas.width + 50 || 
                screen.y < -50 || screen.y > this.canvas.height + 50) {
                continue; // Skip stations outside view
            }
            
            // Map station type to one of the four colors
            let stationColor;
            switch(station.type) {
                case 'circle':
                    stationColor = '#FF0000'; // Red
                    break;
                case 'square':
                    stationColor = '#0000FF'; // Blue
                    break;
                case 'triangle':
                    stationColor = '#FFFF00'; // Yellow
                    break;
                case 'diamond':
                default:
                    stationColor = '#008000'; // Green
                    break;
            }
            
            // Draw station shape with the appropriate color
            this.ctx.fillStyle = stationColor;
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 2;
            
            if (station.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(station.x, station.y, station.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (station.type === 'square') {
                this.ctx.beginPath();
                const size = station.radius * 1.8;
                this.ctx.rect(station.x - size/2, station.y - size/2, size, size);
                this.ctx.fill();
                this.ctx.stroke();
            } else if (station.type === 'triangle') {
                const points = station.getShapePoints();
                this.ctx.beginPath();
                this.ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    this.ctx.lineTo(points[i].x, points[i].y);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            } else if (station.type === 'diamond') {
                // Draw diamond shape
                const size = station.radius * 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(station.x, station.y - size); // Top
                this.ctx.lineTo(station.x + size, station.y); // Right
                this.ctx.lineTo(station.x, station.y + size); // Bottom
                this.ctx.lineTo(station.x - size, station.y); // Left
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            }
            
            // Draw passengers at this station
            this.drawPassengersAtStation(station);
        }
    }
    
    drawPassengersAtStation(station) {
        const passengerSize = 6;
        const spacing = 8;
        const maxPerRow = 3;
        
        for (let i = 0; i < station.passengers.length; i++) {
            const passenger = station.passengers[i];
            
            // Calculate position in a grid around the station
            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            
            const xOffset = (col - (maxPerRow-1)/2) * spacing;
            const yOffset = station.radius + 5 + row * spacing;
            
            // Draw passenger shape based on their destination type using the appropriate color
            let passengerColor;
            switch(passenger.destinationType) {
                case 'circle':
                    passengerColor = '#FF0000'; // Red
                    break;
                case 'square':
                    passengerColor = '#0000FF'; // Blue
                    break;
                case 'triangle':
                    passengerColor = '#FFFF00'; // Yellow
                    break;
                case 'diamond':
                default:
                    passengerColor = '#008000'; // Green
                    break;
            }

            this.ctx.fillStyle = passengerColor;
            
            // Check if this passenger's destination doesn't exist yet (destinationId is -1)
            if (passenger.destinationId === -1) {
                // Draw a pulsing passenger with an exclamation mark to indicate they need a station that doesn't exist
                // Create a pulsing effect
                const pulseTime = Date.now() % 1000 / 1000;
                const pulseScale = 1 + 0.3 * Math.sin(pulseTime * Math.PI * 2);
                const size = passengerSize * pulseScale;
                
                // Draw a special symbol around the passenger
                this.ctx.beginPath();
                this.ctx.arc(station.x + xOffset, station.y + yOffset, size/2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add a small outline to make the passenger stand out
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                // Draw an exclamation mark or indicator of the needed station type
                this.ctx.fillStyle = 'white';
                
                // Draw a tiny shape representing what type of station is needed
                switch(passenger.destinationType) {
                    case 'triangle':
                        // Small triangle above the passenger
                        this.ctx.beginPath();
                        this.ctx.moveTo(station.x + xOffset, station.y + yOffset - size/2 - 4);
                        this.ctx.lineTo(station.x + xOffset - 3, station.y + yOffset - size/2 - 1);
                        this.ctx.lineTo(station.x + xOffset + 3, station.y + yOffset - size/2 - 1);
                        this.ctx.closePath();
                        this.ctx.fill();
                        break;
                    case 'square':
                        // Small square above the passenger
                        this.ctx.fillRect(station.x + xOffset - 2, station.y + yOffset - size/2 - 5, 4, 4);
                        break;
                    case 'diamond':
                        // Small diamond above the passenger
                        this.ctx.beginPath();
                        this.ctx.moveTo(station.x + xOffset, station.y + yOffset - size/2 - 5);
                        this.ctx.lineTo(station.x + xOffset + 2, station.y + yOffset - size/2 - 3);
                        this.ctx.lineTo(station.x + xOffset, station.y + yOffset - size/2 - 1);
                        this.ctx.lineTo(station.x + xOffset - 2, station.y + yOffset - size/2 - 3);
                        this.ctx.closePath();
                        this.ctx.fill();
                        break;
                    case 'circle':
                        // Small circle above the passenger
                        this.ctx.beginPath();
                        this.ctx.arc(station.x + xOffset, station.y + yOffset - size/2 - 3, 2, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                }
            } else {
                // Regular passenger with a valid destination
                this.ctx.beginPath();
                this.ctx.arc(station.x + xOffset, station.y + yOffset, passengerSize/2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawTrains() {
        for (const line of this.game.lines) {
            if (line.stations.length < 2) continue;
            
            const position = line.getCurrentTrainPosition(this.game);
            if (!position) continue;
            
            // Calculate the train direction for proper orientation
            let angle = 0;
            const currentIdx = line.currentStationIndex;
            const nextIdx = (currentIdx + 1) % line.stations.length;
            
            const currentStation = this.game.stations[line.stations[currentIdx]];
            const nextStation = this.game.stations[line.stations[nextIdx]];
            
            angle = Math.atan2(
                nextStation.y - currentStation.y,
                nextStation.x - currentStation.x
            );
            
            // Draw train as a rectangle
            const trainWidth = 30; // Slightly wider train to fit passengers better
            const trainHeight = 16; // Slightly taller train
            const radius = 4; // Corner radius
            
            this.ctx.save();
            this.ctx.translate(position.x, position.y);
            this.ctx.rotate(angle);
            
            // Train body - white fill with colored border
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = line.color;
            this.ctx.lineWidth = 3; // Thicker border for better visibility
            
            // Draw train body with rounded corners using a standard approach
            this.ctx.beginPath();
            this.ctx.moveTo(-trainWidth/2 + radius, -trainHeight/2);
            this.ctx.lineTo(trainWidth/2 - radius, -trainHeight/2);
            this.ctx.arcTo(trainWidth/2, -trainHeight/2, trainWidth/2, -trainHeight/2 + radius, radius);
            this.ctx.lineTo(trainWidth/2, trainHeight/2 - radius);
            this.ctx.arcTo(trainWidth/2, trainHeight/2, trainWidth/2 - radius, trainHeight/2, radius);
            this.ctx.lineTo(-trainWidth/2 + radius, trainHeight/2);
            this.ctx.arcTo(-trainWidth/2, trainHeight/2, -trainWidth/2, trainHeight/2 - radius, radius);
            this.ctx.lineTo(-trainWidth/2, -trainHeight/2 + radius);
            this.ctx.arcTo(-trainWidth/2, -trainHeight/2, -trainWidth/2 + radius, -trainHeight/2, radius);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Add a small colored indicator at the front of the train
            this.ctx.fillStyle = line.color;
            this.ctx.beginPath();
            this.ctx.moveTo(trainWidth/2 - 6, -trainHeight/2);
            this.ctx.lineTo(trainWidth/2, -trainHeight/2);
            this.ctx.arcTo(trainWidth/2, -trainHeight/2, trainWidth/2, -trainHeight/2 + radius, radius);
            this.ctx.lineTo(trainWidth/2, trainHeight/2 - radius);
            this.ctx.arcTo(trainWidth/2, trainHeight/2, trainWidth/2 - radius, trainHeight/2, radius);
            this.ctx.lineTo(trainWidth/2 - 6, trainHeight/2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw passengers on the train
            if (line.passengers.length > 0) {
                this.drawPassengersOnTrain(line.passengers, trainWidth, trainHeight);
            }
            
            this.ctx.restore();
        }
    }
    
    drawPassengersOnTrain(passengers, trainWidth, trainHeight) {
        const passengerSize = 6; // Larger passenger size for better visibility
        const maxPassengersVisible = Math.min(passengers.length, 5);
        const spacing = (trainWidth - 12) / maxPassengersVisible;
        
        // Add a slight shadow under passengers for better visibility
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 2;
        this.ctx.shadowOffsetY = 1;
        
        for (let i = 0; i < maxPassengersVisible; i++) {
            const passenger = passengers[i];
            
            // Position passengers evenly across the train, starting further from the edge
            const xPos = -trainWidth/2 + 10 + i * spacing;
            
            // Get passenger color based on destination type
            let passengerColor;
            switch(passenger.destinationType) {
                case 'circle':
                    passengerColor = '#FF0000'; // Red
                    break;
                case 'square':
                    passengerColor = '#0000FF'; // Blue
                    break;
                case 'triangle':
                    passengerColor = '#FFFF00'; // Yellow
                    break;
                case 'diamond':
                default:
                    passengerColor = '#008000'; // Green
                    break;
            }
            
            // Draw a dark outline around the passenger for better contrast
            this.ctx.beginPath();
            this.ctx.arc(xPos, 0, passengerSize/2 + 1, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fill();
            
            // Draw passenger
            this.ctx.beginPath();
            this.ctx.arc(xPos, 0, passengerSize/2, 0, Math.PI * 2);
            this.ctx.fillStyle = passengerColor;
            this.ctx.fill();
        }
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
        
        // If there are more passengers than we can show, add a count indicator
        if (passengers.length > maxPassengersVisible) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(trainWidth/2 - 10, 0, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`+${passengers.length - maxPassengersVisible}`, trainWidth/2 - 10, 0);
        }
    }
    
    // Cleanup method to remove event listeners
    cleanup() {
        // Remove all event listeners added with this._boundEventHandlers
        for (const [element, handlers] of Object.entries(this._boundEventHandlers)) {
            for (const [event, handler] of Object.entries(handlers)) {
                element.removeEventListener(event, handler);
            }
        }
        
        // Clear the handlers object
        this._boundEventHandlers = {};
    }
} 