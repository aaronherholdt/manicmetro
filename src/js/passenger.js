class Passenger {
    constructor(id, stationId, destinationId, destinationType) {
        this.id = id;
        this.stationId = stationId;
        this.destinationId = destinationId;
        this.destinationType = destinationType; // circle, square, triangle
        this.onTrain = false;
        this.line = null; // ID of the line the passenger is on, if any
        this.waitTime = 0; // How long they've been waiting
    }
    
    update(deltaTime) {
        if (!this.onTrain) {
            this.waitTime += deltaTime;
        }
    }
    
    getWaitTimeColor() {
        // Visual indicator for how long a passenger has been waiting
        if (this.waitTime < 20) {
            return '#FFFFFF'; // White
        } else if (this.waitTime < 40) {
            return '#FFCC00'; // Yellow
        } else {
            return '#FF3300'; // Red
        }
    }
} 