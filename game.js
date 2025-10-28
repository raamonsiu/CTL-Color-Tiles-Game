// Ramon López i Cros
// Universitat de Girona - u1988987 - GEINF

// -----------------------------------------
// Constants and global variables          |
// -----------------------------------------

let gl, program, colorUniform, pointSizeUniform;
let boardBorderBuffer; // Secondary buffer for the board border
let timeBorderBufferGreen; // Secondary buffer for the time border (green indicator)
let timeBorderBufferRed; // Secondary buffer for the time border (red indicator)

// Used colors
const GREEN = [0, 1, 0, 1];
const RED = [1, 0, 0, 1];
const GRAY = [0.15, 0.15, 0.15, 1];
const BLUE = [0, 0, 1, 1];
const WHITE = [1, 1, 1, 1];

/**
 * Levels configuration
 * @type {Object.<number, {time: number, machineDelay: number, boardSize: number}>}
 * time: Time in seconds
 * machineDelay: Time in milliseconds between machine turns
 * boardSize: board size
 */
const LEVEL_CONFIG = {
    // Could be a level generation algorithm, but for now it's static (I think it's impossible to reach level 15 normally)
    1: { time: 40, machineDelay: 2000, boardSize: 5 },
    2: { time: 40, machineDelay: 1800, boardSize: 5 },
    3: { time: 40, machineDelay: 1500, boardSize: 5 },
    4: { time: 35, machineDelay: 1200, boardSize: 5 },
    5: { time: 35, machineDelay: 1000, boardSize: 5 },
    6: { time: 30, machineDelay: 800, boardSize: 6 },
    7: { time: 20, machineDelay: 700, boardSize: 6 },
    8: { time: 30, machineDelay: 600, boardSize: 6 },
    9: { time: 25, machineDelay: 500, boardSize: 6 },
    10: { time: 25, machineDelay: 800, boardSize: 6 },
    11: { time: 15, machineDelay: 780, boardSize: 4 },
    12: { time: 15, machineDelay: 660, boardSize: 4 },
    13: { time: 15, machineDelay: 600, boardSize: 4 },
    14: { time: 15, machineDelay: 560, boardSize: 4 },
    15: { time: 10, machineDelay: 550, boardSize: 4 },
};
/**
 * Bonus points configuration
 * @type {Object.<string, number>}
 * spawnInterval: Time between spawns (ms)
 * lifeTime: Lifetime on screen (ms)
 * timeReward: Seconds added when collected
 * maxPoints: Maximum simultaneous bonus points
 */
const BONUS_CONFIG = {
    spawnInterval: 800,
    lifeTime: 1800,
    timeReward: 2,
    maxPoints: 4
};
/**
 * Time border configuration
 * @type {Object.<string, number>}
 * halfSide: Size of the time border square (NDC half-side)
 */
const TIMEBORDERDATA = { halfSide: 0.95 };
/**
 * Game state
 * @type {Object.<string, number>}
 * level: current level
 * timeLeft: remaining time
 * boardSize: size of the board
 * tiles: array of tiles
 * gameActive: whether the game is active
 * totalTiles: total number of tiles
 * greenTiles: count of green tiles
 * machineInterval: interval id for machine turns
 * timerInterval: interval id for the game timer (1s)
 * gameStarted: whether the game has started
 * waitingForFirstClick: waiting for first click to start
 * isPaused: paused state
 * bonusPoints: array with bonus points
 * bonusSpawnInterval: interval id for bonus spawning
 * bonusPointsActive: whether bonus points are active
 */
let gameState = {
    level: 1,
    timeLeft: 60,
    boardSize: 5,
    tiles: [],
    gameActive: true,
    totalTiles: 25,
    greenTiles: 0,
    machineInterval: null,
    timerInterval: null,
    gameStarted: false,
    waitingForFirstClick: true,
    isPaused: false,
    bonusPoints: [],
    bonusSpawnInterval: null,
    bonusPointsActive: true
};
// --------------------------------
// Bonus points generator         |
// --------------------------------
/**
 * @function createBonusPoint
 * @precondition gameState.gameActive && !gameState.gameIsPaused
 * @description Function to create a bonus point
 *                  - Generates a random point on the screen, outside the board area
 *                  - Checks if the game is active; if not, returns null
 * @postcondition gameState.bonusPoints.length <= BONUS_CONFIG.maxPoints 
 * @returns {Object.<string, number>} point
 */
function createBonusPoint() {
    if (gameState.bonusPoints.length >= BONUS_CONFIG.maxPoints || gameState.waitingForFirstClick) return;

    // Use canvas pixel coordinates to make it easy to pick regions
    const canvas = gl.canvas;
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const marginPx = 30; // margin from canvas edges in pixels (avoid spawning on the very border)

    // Board parameters (match those used in initializeBoard)
    const tileSpacing = 0.15;
    const tileSize = 0.12;
    const boardSize = gameState.boardSize;

    // Half extent of the board in NDC
    const boardHalfNDC = ((boardSize - 1) * tileSpacing) / 2 + tileSize / 2;

    // Convert board bounds to pixels
    const boardLeftPx = ((-boardHalfNDC + 1) / 2) * canvasW;
    const boardRightPx = ((boardHalfNDC + 1) / 2) * canvasW;
    const boardTopPx = ((1 - boardHalfNDC) / 2) * canvasH;
    const boardBottomPx = ((1 - (-boardHalfNDC)) / 2) * canvasH;

    // Choose a random X inside the canvas with a margin
    const randBetween = (a, b) => a + Math.random() * (b - a);
    const xPx = randBetween(marginPx, canvasW - marginPx);

    let yPx;

    // If the X falls over the board width, force Y to be outside (above or below)
    if (xPx >= boardLeftPx && xPx <= boardRightPx) {
        // Choose whether to place it above or below
        const placeAbove = Math.random() < 0.5;
        if (placeAbove) {
            // top area: from marginPx to boardTopPx - marginPx
            const maxY = Math.max(marginPx, boardTopPx - marginPx);
            if (maxY <= marginPx) yPx = Math.max(marginPx, boardTopPx - marginPx);
            else yPx = randBetween(marginPx, maxY);
        } else {
            // bottom area: boardBottomPx + marginPx to canvasH - marginPx
            const minY = Math.min(canvasH - marginPx, boardBottomPx + marginPx);
            if (minY >= canvasH - marginPx) yPx = Math.min(canvasH - marginPx, boardBottomPx + marginPx);
            else yPx = randBetween(minY, canvasH - marginPx);
        }
    } else {
        // X is not over the board, choose Y freely inside the canvas
        yPx = randBetween(marginPx, canvasH - marginPx);
    }

    const xNDC = (xPx / canvasW) * 2 - 1;
    const yNDC = -(yPx / canvasH) * 2 + 1;

    const point = {
        vertices: [xNDC, yNDC, 0],
        indices: [0],
        name: `bonus_${Date.now()}`,
        centerX: xNDC,
        centerY: yNDC,
        size: 15,
        spawnTime: Date.now(),
        color: [0, 0, 1, 1]
    };

    initBuffers(point);
    return point;
}
/**
 * @function startBonusSpawner
 * @description Function to start the bonus point spawner
 *                  - Starts the interval that spawns points
 */
function startBonusSpawner() {
    gameState.bonusSpawnInterval = setInterval(() => {
        if (!gameState.gameActive || gameState.isPaused) return;

        const bonusPoint = createBonusPoint();
        if (bonusPoint) {
            gameState.bonusPoints.push(bonusPoint);
            drawScene(); // Redraw to show the new point

            // Automatically remove after its lifetime
            setTimeout(() => {
                removeBonusPoint(bonusPoint.name);
            }, BONUS_CONFIG.lifeTime);
        }
    }, BONUS_CONFIG.spawnInterval);
}
/**
 * @function removeBonusPoint
 * @description Function to remove a bonus point from the game
 *                  - Removes the point from the list
 * @param {*} pointName 
 */
function removeBonusPoint(pointName) {
    gameState.bonusPoints = gameState.bonusPoints.filter(point =>
        point.name !== pointName
    );
    drawScene();
}
// --------------------------------
// Game board                      |
// --------------------------------
/**
 * @function createTile
 * @description Function to create a board tile
 *                  - Returns an object with the square coordinates
 *                  - Defined using two triangles
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} width 
 * @param {*} height 
 * @param {*} name 
 * @returns {Object.<string, number>} point
 */
function createTile(x, y, width, height, name) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    /* The square is defined as:
        3 - 2
        | / |
        0 - 1
    */
    return {
        "vertices": [ // X, Y, Z, a square; Z is constant (we are on the XY plane)
            x - halfWidth, y - halfHeight, 0,
            x + halfWidth, y - halfHeight, 0,
            x + halfWidth, y + halfHeight, 0,
            x - halfWidth, y + halfHeight, 0
        ],
        "indices": [0, 1, 2, 0, 2, 3],
        "name": name,
        "centerX": x,
        "centerY": y,
        "width": width,
        "height": height
    };
}
/**
 * @function createBorder
 * @description Function to create the board border
 *                  - Returns an array with the border coordinates
 *                  - Defined by four lines
 * @param {*} tileSize 
 * @param {*} boardSize 
 * @param {*} tileSpacing 
 * @returns {Float32Array} borderVertices
 */
function createBorder(tileSize, boardSize, tileSpacing) {
    const margin = tileSize * 0.5; // Slightly larger than the board
    const borderSize = (boardSize * tileSpacing) + margin;
    const borderVertices = new Float32Array([
        -borderSize / 2, -borderSize / 2, 0,  // Bottom line
        borderSize / 2, -borderSize / 2, 0,

        borderSize / 2, -borderSize / 2, 0,   // Right line
        borderSize / 2, borderSize / 2, 0,

        borderSize / 2, borderSize / 2, 0,    // Top line
        -borderSize / 2, borderSize / 2, 0,

        -borderSize / 2, borderSize / 2, 0,   // Left line
        -borderSize / 2, -borderSize / 2, 0
    ]);
    return borderVertices;
}
/**
 * @function initializeBoard
 * @description Function to initialize the game board
 *              - Creates the board tiles and border
 *              - Initializes state variables
 *              - Draws the board
 * @postcondition gameState.totalTiles === gameState.boardSize * gameState.boardSize && gameState.greenTiles === 0 && gameState.bonusPoints.length === 0
 * @returns {void}
 */
function initializeBoard() {
    gameState.tiles = [];
    const boardSize = gameState.boardSize;
    const tileSpacing = 0.15;
    const tileSize = 0.12;

    const startX = -((boardSize - 1) * tileSpacing) / 2;
    const startY = -((boardSize - 1) * tileSpacing) / 2;

    for (let row = 0; row < boardSize; row++) {
        for (let column = 0; column < boardSize; column++) {
            const x = startX + column * tileSpacing;
            const y = startY + row * tileSpacing;
            const tileName = `tile_${row}_${column}`;

            const tile = createTile(x, y, tileSize, tileSize, tileName);
            initBuffers(tile);

            gameState.tiles.push({
                model: tile,
                color: RED, // All tiles start red
                isGreen: false
            });
        }
    }

    gameState.totalTiles = boardSize * boardSize;
    gameState.greenTiles = 0;
    gameState.waitingForFirstClick = true; // Waiting for first click

    // Create the board border
    const borderVertices = createBorder(tileSize, boardSize, tileSpacing);

    // Create and fill the border buffer
    boardBorderBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boardBorderBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, borderVertices, gl.STATIC_DRAW);

    updateUI();
}
/**
 * @function isInsideTile
 * @description Function to detect whether a click is inside a tile
 *                     - Returns true if the click is inside the tile
 *                     - Uses the tile bounds to determine containment
 * @precondition tile is an object with the square coordinates
 * @param {*} mouseX 
 * @param {*} mouseY 
 * @param {*} tile 
 * @returns {boolean}
 */
function isInsideTile(mouseX, mouseY, tile) {
    const x = (mouseX / gl.canvas.width) * 2 - 1;
    const y = -(mouseY / gl.canvas.height) * 2 + 1;

    const halfWidth = tile.model.width / 2;
    const halfHeight = tile.model.height / 2;

    return (x >= tile.model.centerX - halfWidth &&
        x <= tile.model.centerX + halfWidth &&
        y >= tile.model.centerY - halfHeight &&
        y <= tile.model.centerY + halfHeight);
}
/**
 * @function isInsideBonusPoint
 * @description Function to detect whether a click is inside a bonus point
 *                     - Returns true if the click is inside the bonus point
 *                     - Uses Euclidean distance to check containment
 * @precondition bonusPoint is an object with the point coordinates
 * @param {*} mouseX 
 * @param {*} mouseY 
 * @param {*} bonusPoint 
 * @returns {boolean}
 */
function isInsideBonusPoint(mouseX, mouseY, bonusPoint) {
    const x = (mouseX / gl.canvas.width) * 2 - 1;
    const y = -(mouseY / gl.canvas.height) * 2 + 1;

    const pointRadius = 0.05; // Larger radius to make clicking easier

    const distance = Math.sqrt(
        Math.pow(x - bonusPoint.centerX, 2) +
        Math.pow(y - bonusPoint.centerY, 2)
    );

    return distance <= pointRadius;
}
/**
 * @function collectBonusPoint
 * @description Function to collect a bonus point
 *                     - Adds time to the remaining timer
 *                     - Removes the bonus from the screen
 *                     - Updates the UI
 * @postcondition gameState.timeLeft = gameState.timeLeft + BONUS_CONFIG.timeReward
 * @param {*} bonusPoint 
 */
function collectBonusPoint(bonusPoint) {
    gameState.timeLeft += BONUS_CONFIG.timeReward;
    removeBonusPoint(bonusPoint.name);
    updateUI();
}
/**
 * @function changeTileColor
 * @description Function to change the color of a tile
 * @postcondition tile.color = color && tile.isGreen = isGreen
 * @param {*} tile 
 * @param {*} color 
 * @param {*} isGreen 
 */
function changeTileColor(tile, color, isGreen) {
    tile.color = color;
    tile.isGreen = isGreen;
}
// --------------------------------
// Event handling                 |
// --------------------------------
/**
 * @function click
 * @description Function to handle mouse clicks
 *                    - Checks if a tile or a bonus point was clicked
 *                    - Collects the bonus point if clicked
 *                    - Changes the tile color if clicked
 *                    - Updates the UI
 *                    - Renders the scene
 * @param {*} event 
 * @returns 
 */
function click(event) {
    let clickedTileOrBonusPoint = false;
    if (!gameState.gameActive) return;

    let rect = gl.canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;

    // First check bonus points (they have priority)
    let bonusPointIterator = 0;
    while (!clickedTileOrBonusPoint && bonusPointIterator < gameState.bonusPoints.length) {
        let bonusPoint = gameState.bonusPoints[bonusPointIterator];
        if (isInsideBonusPoint(mouseX, mouseY, bonusPoint)) {
            collectBonusPoint(bonusPoint);
            drawScene(); // Exit after collecting a bonus; avoid clicking bonus and tile at once
            clickedTileOrBonusPoint = true;
        }
        bonusPointIterator++;
    }
    // Then check normal tiles
    let tileIterator = 0;
    while (!clickedTileOrBonusPoint && tileIterator < gameState.tiles.length) {
        const tile = gameState.tiles[tileIterator];
        if (isInsideTile(mouseX, mouseY, tile)) {
            if (gameState.waitingForFirstClick) {
                startGame();
            }
            if (!tile.isGreen) {
                clickedTileOrBonusPoint = true;
                changeTileColor(tile, GREEN, true);
                gameState.greenTiles++;
                updateUI();
                checkWinCondition();
                drawScene();
            }
        }
        tileIterator++;
    }

}
/**
 * @function togglePause
 * @description Function to handle game pausing
 *                    - Triggered by P key or spacebar
 *                    - Pauses the game
 *                    - Shows the modal
 *                    - Stops intervals
 *                    - Updates the UI
 *                    - Hides the modal on resume
 *                    - Restarts intervals
 * @param {*} event 
 * @returns 
 */
function togglePause(event) {
    if (
        (event.code !== 'KeyP' && event.code !== 'Space') // Not a pause key
        || (!gameState.gameActive || gameState.waitingForFirstClick) // No active game
    ) return
    event.preventDefault(); // Prevent scrolling with the spacebar
    gameState.isPaused = !gameState.isPaused;
    const pauseModal = document.getElementById('pauseModal');
    if (gameState.isPaused) {
        clearInterval(gameState.machineInterval);
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.bonusSpawnInterval);
        pauseModal.style.display = 'block'; // Show it
    } else {
        const config = LEVEL_CONFIG[gameState.level];
        gameState.timerInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            gameState.timeLeft--;
            updateUI();
            if (gameState.timeLeft <= 0) gameOver();
        }, 1000);

        gameState.machineInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            machineTurn();
        }, config.machineDelay);

        gameState.bonusSpawnInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            spawnBonusPoint();
        }, BONUS_CONFIG.spawnDelay);

        pauseModal.style.display = 'none'; // Hide it
    }
}
/**
 * @function easterEgg
 * @description Function to handle the easter egg
 *                   - Triggered by R key
 *                   - Pauses the game
 *                   - Shows a modal
 *                   - Stops intervals
 *                   - Hides the modal on resume
 *                   - Restarts intervals
 * 
 * @param {*} event 
 * @returns 
 */
function easterEgg(event) {
    if (event.code !== 'KeyR') return
    gameState.isPaused = !gameState.isPaused;
    const eggModal = document.getElementById('egModal');
    if (gameState.isPaused) {
        clearInterval(gameState.machineInterval);
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.bonusSpawnInterval);
        eggModal.style.display = 'block'; // Show it
    } else {
        const config = LEVEL_CONFIG[gameState.level];
        gameState.timerInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            gameState.timeLeft--;
            updateUI();
            if (gameState.timeLeft <= 0) {
                gameOver();
            }
        }, 1000);

        gameState.machineInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            machineTurn();
        }, config.machineDelay);

        gameState.bonusSpawnInterval = setInterval(function () {
            if (!gameState.gameActive || gameState.isPaused) return;
            spawnBonusPoint();
        }, BONUS_CONFIG.spawnDelay);
        eggModal.style.display = 'none'; // Hide it
    }
}
// --------------------------------
// UI                             |
// --------------------------------
/**
 * @function updateUI
 * @description Function to update the UI
 *                  - Update the level display
 *                  - Update the timer display
 *                  - Update the green tiles count
 *                  - Update the total tiles count
 * @postcondition UI updated with current game data
 * @returns {void}
 */
function updateUI() {
    document.getElementById('level').textContent = gameState.level;

    // Show a special message if waiting for the first click
    if (gameState.waitingForFirstClick) document.getElementById('timer').textContent = 'Click to start!';
    else document.getElementById('timer').textContent = gameState.timeLeft + 's';
    document.getElementById('greenCount').textContent = gameState.greenTiles;
    document.getElementById('totalTiles').textContent = gameState.totalTiles;
}
// --------------------------------
// Game functions                 |
// --------------------------------
/**
 * @function checkWinCondition
 * @description Function to check the win condition
 *                  - If the number of green tiles equals the total, advance to next level
 * @returns {void}
 */
function checkWinCondition() { if (gameState.greenTiles === gameState.totalTiles) nextLevel(); }
/**
 * @function machineTurn
 * @description Function for the machine's turn
 *                  - If there is any green tile, pick one at random and turn it red
 *                  - Decrement the green tile counter
 *                  - Update the UI
 *                  - Redraw the scene
 * @returns {void}
 */
function machineTurn() {
    if (!gameState.gameActive || gameState.waitingForFirstClick) return;
    const greenTiles = gameState.tiles.filter(tile => tile.isGreen);

    if (greenTiles.length > 0) {
        const randomIndex = Math.floor(Math.random() * greenTiles.length);
        const tile = greenTiles[randomIndex];

        changeTileColor(tile, RED, false);
        gameState.greenTiles--; // decrement green count
        updateUI();
        drawScene();
    }
}
/**
 * @function nextLevel
 * @description Function to advance to the next level
 *                  - Increment the level
 *                  - Mark the game as not started
 *                  - Start the next level
 * @postcondition gameState.level incremented and gameState.gameStarted is false
 * @returns {void}
 */
function nextLevel() {
    gameState.level++;
    gameState.gameStarted = false;

    if (LEVEL_CONFIG[gameState.level]) startLevel(gameState.level);
    else startLevel(gameState.level - 1);
}
/**
 * @function startLevel
 * @description Function to start a level
 *                  - Clear previous intervals
 *                  - Load level configuration
 *                  - Update UI
 *                  - Reset the board
 *                  - Render the scene
 * @postcondition gameState updated with level information
 * @param {*} level 
 * @returns {void}
 */
function startLevel(level) {
    clearInterval(gameState.machineInterval);
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.bonusSpawnInterval);

    const config = LEVEL_CONFIG[level];

    gameState.level = level;
    gameState.timeLeft = config.time;
    gameState.gameActive = true;
    gameState.gameStarted = false;
    gameState.waitingForFirstClick = true;
    gameState.boardSize = config.boardSize;
    gameState.isPaused = false;

    initializeBoard();
    drawScene();
    updateUI();
}
/**
 * @function startGame
 * @description Function to start the game
 *                  - Starts the game
 *                  - Loads level configuration
 *                  - Updates the UI
 *                  - Starts intervals
 * @returns {void}
 */
function startGame() {
    if (gameState.gameStarted) return;
    // else
    gameState.gameStarted = true;
    gameState.waitingForFirstClick = false;

    const config = LEVEL_CONFIG[gameState.level] || LEVEL_CONFIG[15];

    // Game timer
    gameState.timerInterval = setInterval(function () {
        if (!gameState.gameActive) return;
        gameState.timeLeft--;
        updateUI();
        if (gameState.timeLeft <= 0) gameOver();
    }, 1000); // Update every 1 second

    gameState.machineInterval = setInterval(function () {
        if (!gameState.gameActive) return;
        machineTurn(); // Call the machine every config.machineDelay milliseconds
    }, config.machineDelay);

    gameState.bonusSpawnInterval = setInterval(function () {
        if (!gameState.gameActive) return;
        spawnRandomBonus();
    }, config.bonusSpawnDelay);
}
/**
 * @Function gameOver
 * @description Function to end the game
 *                  - Pauses the game
 *                  - Shows the Game Over modal (HTML)
 *                  - Clears intervals
 *                  - Returns to level 1 after 3 seconds
 * @Postcondition The game restarts after 3 seconds; #startLevel will handle restart logic
 * @returns {void}
 */
function gameOver() {
    gameState.gameActive = false;
    gameState.gameStarted = false;
    gameState.isPaused = false;
    document.getElementById('gameOver').style.display = 'block'; // show Game Over
    document.getElementById('pauseModal').style.display = 'none'; // hide pause modal

    clearInterval(gameState.machineInterval);
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.bonusSpawnInterval);

    // Return to level 1 after 3 seconds
    setTimeout(function () {
        document.getElementById('gameOver').style.display = 'none'; // hide Game Over modal
        startLevel(1);
    }, 3000);
}
// --------------------------------
// Drawing functions              |
// --------------------------------
/**
 * @Function drawTile
 * @param {*} tile 
 * @description Function to draw a board tile
 *                  - Draws a tile (6 indices, 2 triangles)
 *                  - Color taken from the tile parameter
 *                  - Uses gl.TRIANGLES primitive
 * @returns {void}
 */
function drawTile(tile) {
    gl.uniform4f(colorUniform, ...tile.color);
    gl.bindBuffer(gl.ARRAY_BUFFER, tile.model.idBufferVertices);
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tile.model.idBufferIndices);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}
/**
 * @Function drawBonusPoint
 * @description Function to draw a bonus point
 *                  - Draws one point (buffer of 1 point)
 *                  - Color taken from uniform
 * @param {*} bonusPoint 
 * @returns {void}
 */
function drawBonusPoint(bonusPoint) {
    gl.uniform4f(colorUniform, ...bonusPoint.color);
    gl.uniform1f(pointSizeUniform, bonusPoint.size);
    gl.bindBuffer(gl.ARRAY_BUFFER, bonusPoint.idBufferVertices);
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, 1);
}
/**
 * @Function drawBorder
 * @description Function to draw the board border
 *                  - Draws the board border (8 vertices), color white
 * @returns {void}
 * 
 */
function drawBorder() {
    gl.uniform4f(colorUniform, WHITE[0], WHITE[1], WHITE[2], 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, boardBorderBuffer); // Use the board border buffer
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 8); // 8 vertices = 4 lines (2 vertices per side)
}
/**
 * @Function drawTimeBorder
 * @description Function to draw the time border
 *                  - Draws the full green border (static buffer)
 *                  - Then draws the red segments based on elapsed time fraction
 *                  - The red buffer is composed of small segments for smooth progression
 * @returns {void}
 */
function drawTimeBorder() {
    // Draw the full green border (4 simple sides)
    gl.uniform4f(colorUniform, GREEN[0], GREEN[1], GREEN[2], 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, timeBorderBufferGreen);
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 8);


    // To paint the red segments do the following:
    // Calculate the fraction of time used and paint that fraction of the 40 segments
    // (for example, 32% used = 12 of the 40 segments)

    // Game data
    const totalTime = LEVEL_CONFIG[gameState.level].time;
    const timeLeft = gameState.timeLeft - 1;
    const timeUsed = totalTime - timeLeft;
    const timePercentage = timeUsed / totalTime;

    const totalSegments = 40;
    const redSegments = Math.floor(totalSegments * timePercentage); // Rounded down to integer

    if (redSegments > 0) {
        gl.uniform4f(colorUniform, RED[0], RED[1], RED[2], 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, timeBorderBufferRed);
        gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

        // Draw only the required red segments
        gl.drawArrays(gl.LINES, 0, redSegments == 1 ? 0 : redSegments * 2); // 2 vertices per segment
    }
}
/**
 * @Function drawScene
 * @description Function to render the game scene
 *                  - Draws the time border
 *                  - Draws the board border
 *                  - Draws board tiles
 *                  - Draws bonus points
 * @returns {void}
 */
function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawTimeBorder();
    drawBorder();
    for (let tile of gameState.tiles) drawTile(tile);
    for (let bonusPoint of gameState.bonusPoints) drawBonusPoint(bonusPoint);
}
// --------------------------------
// WebGL general                  |
// --------------------------------
/**
 * @function initBuffers
 * @description Function to initialize buffers for tile models
 * @param {*} model 
 * @returns {void}
 */
function initBuffers(model) {
    model.idBufferVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

    model.idBufferIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.idBufferIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
}
/**
 * @Function   : initTimeBorderBuffers
 * @Description : Function to initialize buffers for the time border
 *                  - Has a buffer for the full green border (4 sides)
 *                  - Has a buffer for the red border composed of multiple small segments
 *                  - The red buffer is drawn over the green one according to elapsed time fraction
 *                  - The green buffer is static; the red buffer provides the progressive overlay
 */
function initTimeBorderBuffers() {
    const h = TIMEBORDERDATA.halfSide;

    // Green buffer (4 simple sides)
    const fullVertices = new Float32Array([
        -h, -h, 0, h, -h, 0,
        h, -h, 0, h, h, 0,
        h, h, 0, -h, h, 0,
        -h, h, 0, -h, -h, 0
    ]);

    // Bind the buffer
    timeBorderBufferGreen = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, timeBorderBufferGreen);
    gl.bufferData(gl.ARRAY_BUFFER, fullVertices, gl.STATIC_DRAW);

    // Red buffer (40 segments for smooth progression)
    const segmentsPerSide = 10;
    const redVertices = [];

    // Generate 10 segments per side
    // Bottom side: (-h, -h) to (h, -h)
    for (let i = 0; i < segmentsPerSide; i++) {
        const t1 = i / segmentsPerSide;
        const t2 = (i + 1) / segmentsPerSide;
        const x1 = -h + (2 * h * t1);
        const x2 = -h + (2 * h * t2);
        redVertices.push(x1, -h, 0, x2, -h, 0);
    }

    // Right side: (h, -h) to (h, h)
    for (let i = 0; i < segmentsPerSide; i++) {
        const t1 = i / segmentsPerSide;
        const t2 = (i + 1) / segmentsPerSide;
        const y1 = -h + (2 * h * t1);
        const y2 = -h + (2 * h * t2);
        redVertices.push(h, y1, 0, h, y2, 0);
    }

    // Top side: (h, h) to (-h, h)
    for (let i = 0; i < segmentsPerSide; i++) {
        const t1 = i / segmentsPerSide;
        const t2 = (i + 1) / segmentsPerSide;
        const x1 = h - (2 * h * t1);
        const x2 = h - (2 * h * t2);
        redVertices.push(x1, h, 0, x2, h, 0);
    }

    // Left side: (-h, h) to (-h, -h)
    for (let i = 0; i < segmentsPerSide; i++) {
        const t1 = i / segmentsPerSide;
        const t2 = (i + 1) / segmentsPerSide;
        const y1 = h - (2 * h * t1);
        const y2 = h - (2 * h * t2);
        redVertices.push(-h, y1, 0, -h, y2, 0);
    }

    // Bind the buffer
    timeBorderBufferRed = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, timeBorderBufferRed);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(redVertices), gl.STATIC_DRAW);
}
/**
 * @function initShaders
 * @description Function to initialize the game's shaders
 * @returns {void}
 */
function initShaders() {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const vertexSrcEl = document.getElementById("myVertexShader");
    const vertexSource = vertexSrcEl ? (vertexSrcEl.textContent || vertexSrcEl.text) : null;
    if (!vertexSource) {
        console.error('Vertex shader source not found');
        return;
    }
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex shader compile error:', gl.getShaderInfoLog(vertexShader));
        return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    const fragSrcEl = document.getElementById("myFragmentShader");
    const fragmentSource = fragSrcEl ? (fragSrcEl.textContent || fragSrcEl.text) : null;
    if (!fragmentSource) {
        console.error('Fragment shader source not found');
        return;
    }
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment shader compile error:', gl.getShaderInfoLog(fragmentShader));
        return;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    program.vertexPositionAttribute = gl.getAttribLocation(program, "VertexPosition");
    gl.enableVertexAttribArray(program.vertexPositionAttribute);

    // Color uniform
    colorUniform = gl.getUniformLocation(program, "myColor");
    console.log("ColorUniform value:", colorUniform);

    // pointSizeUniform is optional - check existence
    pointSizeUniform = gl.getUniformLocation(program, "pointSize");
    console.log("pointSizeUniform value:", pointSizeUniform);
}
/**
 * @function initRendering
 * @description Function to initialize rendering settings
 * @returns {void}
 */
function initRendering() {
    gl.clearColor(0.15, 0.15, 0.15, 1);
    if (gl?.canvas) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}
/**
 * @function getWebGLContext
 * @description Function to obtain the WebGL context
 * @returns {WebGLContextAttributes} canvas.context
 */
function getWebGLContext() {
    let canvas = document.getElementById("myCanvas");
    return canvas?.getContext("webgl2") || null;
}
/**
 * @function initWebGL
 * @description Function to initialize the game and WebGL
 * @returns {void}
 */
function initWebGL() {
    gl = getWebGLContext();
    if (!gl) {
        alert("WebGL 2.0 is not available");
        console.error('WebGL2 context not available');
        return;
    }

    initShaders();
    initRendering();
    // Initialize buffers for the time border (other buffers are generated per level)
    initTimeBorderBuffers();

    gl.canvas.addEventListener('click', click);
    document.addEventListener('keydown', togglePause);
    document.addEventListener('keydown', easterEgg);

    // Start game at level 1
    startLevel(1); // initBuffers() is called per level
    startBonusSpawner(); // Start the bonus spawner
}
initWebGL();