class Line {
    constructor(id, color) {
        this.id = id;
        this.color = color;
        this.stations = [];
        this.passengers = [];
        this.currentStationIndex = 0;
        this.trainProgress = 0; // 0 to 1 representing position between stations
    }
    
    addStation(stationId) {
        // Don't add if it's already the last station
        if (this.stations.length > 0 && this.stations[this.stations.length - 1] === stationId) {
            return false;
        }
        
        this.stations.push(stationId);
        return true;
    }
    
    removeLastStation() {
        if (this.stations.length > 0) {
            this.stations.pop();
            return true;
        }
        return false;
    }
    
    getStationCount() {
        return this.stations.length;
    }
    
    getCurrentTrainPosition(game) {
        if (this.stations.length < 2) {
            // Return the position of the only station if there's just one
            if (this.stations.length === 1) {
                const station = game.stations[this.stations[0]];
                return { x: station.x, y: station.y };
            }
            return null;
        }
        
        // Calculate position between current station and next station
        const currentIdx = this.currentStationIndex;
        const nextIdx = (currentIdx + 1) % this.stations.length;
        
        const currentStation = game.stations[this.stations[currentIdx]];
        const nextStation = game.stations[this.stations[nextIdx]];
        
        // Interpolate position
        const x = currentStation.x + (nextStation.x - currentStation.x) * this.trainProgress;
        const y = currentStation.y + (nextStation.y - currentStation.y) * this.trainProgress;
        
        return { x, y };
    }
} 