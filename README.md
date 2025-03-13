# Metro Manic

A minimalist subway network simulation game inspired by Mini Metro. Build and manage your own subway system to efficiently transport passengers between stations.

## Game Features

- Build subway lines to connect different stations
- Transport passengers between stations based on their destination types
- Dynamic map growth with new stations appearing over time
- Resource management with limited subway lines
- Minimalist aesthetic with simple shapes and a limited color palette

## How to Play

1. **Start the Game**: Open `index.html` in a web browser to begin.

2. **Create Subway Lines**:
   - Click the "New Line" button to create a new subway line
   - Click on stations to connect them with the selected line
   - Each line has a unique color for easy identification

3. **Manage Passengers**:
   - Passengers appear at stations and want to travel to stations of a specific type
   - The passenger's color indicates their destination type
   - Build subway lines to transport passengers to their destinations
   - Avoid station overcrowding or it's game over!

4. **Add Stations**:
   - Double-click anywhere on the map to add a new station
   - New stations also appear automatically over time

5. **Controls**:
   - New Line: Create a new subway line
   - New Station: Add a new station to the map
   - Pause: Pause/resume the game

## Game Mechanics

- Different stations have different shapes (circle, square, triangle)
- Passengers need to travel to stations matching their destination type
- The game becomes progressively challenging as more passengers appear
- You have a limited number of subway lines to work with

## Installation

No installation required! Simply open `index.html` in any modern web browser to play.

## Development

This game is built using HTML5 Canvas and JavaScript. The code is organized as follows:

- `game.js` - Core game logic
- `renderer.js` - Handles visualization
- `station.js` - Station class
- `line.js` - Subway line class
- `passenger.js` - Passenger class
- `app.js` - Main application logic

## Credits

This game is inspired by the award-winning game Mini Metro, developed by Dinosaur Polo Club. 