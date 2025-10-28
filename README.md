<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=js,html,css,tailwind,github" />
  </a>
</p>

# Color Tiles Game

A fast-paced, WebGL-based game where players race against time to turn red tiles green while competing with the machine.

## Gameplay

In Color Tiles Game, players engage in a strategic battle against both time and the machine:

- Click red tiles to turn them green
- The machine randomly turns green tiles back to red
- Collect blue bonus points to gain extra time
- Complete each level by turning all tiles green
- Manage your time wisely as the machine gets faster in each level

### Controls

- **Mouse Click**: Turn tiles green / Collect bonus points
- **Space** or **P**: Pause game
- **???**: Easter egg! (discover it)

## Game Features

### Dynamic Time Border
- A visual border around the game area shows remaining time
- Green border gradually turns red as time passes
- Collect bonus points to gain additional time

### Bonus Point System
- Blue bonus points appear randomly outside the game board
- Each bonus point collected adds some seconds to your timer
- Maximum of 3 bonus points can exist simultaneously
- Quick reaction is key - bonus points disappear after few seconds

## Level System

The game features 15 challenging levels with progressive difficulty:

### Level Progression
- Board sizes vary between 4x4 and 6x6
- Time limits range from 40 to 10 seconds
- Machine response time decreases as you advance
- Strategic placement becomes crucial in higher levels

### Level Configuration Overview

| Level | Time (s) | Machine Delay (ms) | Board Size |
|-------|----------|--------------------|------------|
| 1-3   | 40       | 2000-1500          | 5x5        |
| 4-5   | 35       | 1200-1000          | 5x5        |
| 6-10  | 30-25    | 800-500            | 6x6        |
| 11-15 | 15-10    | 780-550            | 4x4        |

## Technical Details

### Technologies Used
- WebGL2 for rendering
- Pure JavaScript for game logic
- HTML5 Canvas
- CSS for styling

### Implementation Features
- Efficient WebGL buffer management
- Point-based collision detection
- Dynamic difficulty scaling
- Modular code structure

## Tips & Strategies

1. Start from corners and work systematically
2. Always keep an eye on bonus points
3. Plan your moves in advance as the machine gets faster
4. In later levels, focus on smaller areas at a time
5. Use pauses strategically to plan your next moves

## Win Conditions

- Turn all tiles green to complete a level
- Progress through all 15 levels for ultimate victory
- Each level completion is a win, no matter the time left

## Game Over Conditions

- Running out of time
- The game will automatically restart from Level 1 after a game over

---

> Created by Ramon López i Cros for Computer Graphics course at University of Girona.
