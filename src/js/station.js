class Station {
    constructor(id, x, y, type) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.type = type; // circle, square, triangle
        this.passengers = [];
        this.radius = 15;
        this.capacity = 8; // Maximum number of passengers before game over
    }
    
    addPassenger(passenger) {
        this.passengers.push(passenger);
    }
    
    removePassenger(passengerId) {
        const index = this.passengers.findIndex(p => p.id === passengerId);
        if (index !== -1) {
            this.passengers.splice(index, 1);
            return true;
        }
        return false;
    }
    
    isOvercrowded() {
        return this.passengers.length > this.capacity;
    }
    
    getShapePoints() {
        // For drawing custom shapes (like triangles)
        if (this.type === 'triangle') {
            const r = this.radius;
            return [
                { x: this.x, y: this.y - r },
                { x: this.x - r * 0.866, y: this.y + r * 0.5 },
                { x: this.x + r * 0.866, y: this.y + r * 0.5 }
            ];
        } else if (this.type === 'diamond') {
            const r = this.radius * 1.5;
            return [
                { x: this.x, y: this.y - r }, // Top
                { x: this.x + r, y: this.y }, // Right
                { x: this.x, y: this.y + r }, // Bottom
                { x: this.x - r, y: this.y }  // Left
            ];
        }
        return [];
    }
} 
