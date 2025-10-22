// Ramon López i Cros - u1988987 - GEINF
let gl, program, colorUniform, pointSizeUniform;
// Buffer para el borde del tablero
let boardBorderBuffer;

const GREEN = [0, 1, 0, 1];
const RED = [1, 0, 0, 1];
const GRAY = [0.15, 0.15, 0.15, 1];
const BLUE = [0, 0, 1, 1];
const WHITE = [1, 1, 1, 1];

// Estado del juego
let gameState = {
    level: 1,  // Nivel actual
    timeLeft: 60,
    boardSize: 5,
    tiles: [],  // Tablero de casillas
    gameActive: true,
    totalTiles: 25,
    greenTiles: 0,  // Contador de casillas verdes
    machineInterval: null,  // Intervalo del sistema para colorear en contra
    timerInterval: null,    // Intervalo de temporizador (cada 1 segundo)
    gameStarted: false,
    waitingForFirstClick: true, // Espera primer clic para empezar
    isPaused: false,
    bonusPoints: [],        // Array de puntos bonus
    bonusSpawnInterval: null, // Intervalo para generar puntos
    bonusPointsActive: true   // Si los puntos bonus están activos
};

// Configuraciones
const LEVEL_CONFIG = {
    // Podria ser una función de generacion de niveles, pero por ahora así esta bien (creo que es imposible llegar al 15 y ganarlo)
    1: { time: 60, machineDelay: 2000, boardSize: 5 },
    2: { time: 50, machineDelay: 1800, boardSize: 5 },
    3: { time: 45, machineDelay: 1500, boardSize: 5 },
    4: { time: 40, machineDelay: 1200, boardSize: 5 },
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
const BONUS_CONFIG = {
    spawnInterval: 5000,    // Aparece cada 5 segundos
    lifeTime: 1500,         // Dura 1.5 segundos en pantalla
    timeReward: 4,          // +4 segundos al recogerlo
    maxPoints: 3            // Máximo de puntos bonus simultáneos
};

// WEBGL

// --------------------------------
// Generador de puntos bonus      |
// --------------------------------
// Crear un punto bonus aleatorio
function createBonusPoint() {
    if (gameState.bonusPoints.length >= BONUS_CONFIG.maxPoints || gameState.isPaused || !gameState.gameActive || gameState.waitingForFirstClick) return;

    // Área segura alrededor del tablero (evitar superposición)
    const margin = 0.3;
    const x = (Math.random() * (1.8 - margin * 2)) - (0.9 - margin);
    const y = (Math.random() * (1.8 - margin * 2)) - (0.9 - margin);

    const point = {
        "vertices": [x, y, 0],
        "indices": [0],
        "name": `bonus_${Date.now()}`,
        "centerX": x,
        "centerY": y,
        "size": 15, // Tamaño del punto
        "spawnTime": Date.now(),
        "color": [0, 0, 1, 1] // Azul
    };

    initBuffers(point);
    return point;
}
// Iniciar generación de puntos bonus
function startBonusSpawner() {
    gameState.bonusSpawnInterval = setInterval(() => {
        if (!gameState.gameActive || gameState.isPaused) return;

        const bonusPoint = createBonusPoint();
        if (bonusPoint) {
            gameState.bonusPoints.push(bonusPoint);
            drawScene(); // Redibujar para mostrar el nuevo punto

            // Eliminar automáticamente después del tiempo de vida
            setTimeout(() => {
                removeBonusPoint(bonusPoint.name);
            }, BONUS_CONFIG.lifeTime);
        }
    }, BONUS_CONFIG.spawnInterval);
}
// Eliminar punto bonus
function removeBonusPoint(pointName) {
    gameState.bonusPoints = gameState.bonusPoints.filter(point =>
        point.name !== pointName
    );
    drawScene();
}
// --------------------------------
// Tablero de juego                |
// --------------------------------
// Crear geometría de una casilla cuadrada
function createTile(x, y, width, height, name) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    /* EL cuadrado está definido como:
        3 - 2
        | / |
        0 - 1
    */
    return {
        "vertices": [ // X, Y, Z, un cuadrado, Z es siempre igual (estamos plano xy)
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
function createBorder(tileSize, boardSize, tileSpacing) {
    const margin = tileSize * 0.5; // Un poco más grande que el tablero
    const borderSize = (boardSize * tileSpacing) + margin;
    const borderVertices = new Float32Array([
        // Coordenadas para las 4 líneas del borde (x,y,z para cada vértice)
        -borderSize / 2, -borderSize / 2, 0,  // Línea inferior
        borderSize / 2, -borderSize / 2, 0,

        borderSize / 2, -borderSize / 2, 0,   // Línea derecha
        borderSize / 2, borderSize / 2, 0,

        borderSize / 2, borderSize / 2, 0,    // Línea superior
        -borderSize / 2, borderSize / 2, 0,

        -borderSize / 2, borderSize / 2, 0,   // Línea izquierda
        -borderSize / 2, -borderSize / 2, 0
    ]);
    return borderVertices;
}
// Inicializar el tablero de casillas
function initializeBoard() {
    gameState.tiles = []; // Limpiar las casillas anteriores
    const boardSize = gameState.boardSize; // Tamaño del tablero
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
                color: RED, // Todas empiezan rojas
                isGreen: false
            });
        }
    }

    gameState.totalTiles = boardSize * boardSize;
    gameState.greenTiles = 0;
    gameState.waitingForFirstClick = true; // Esperando primer clic

    // Crear el borde del tablero
    const borderVertices = createBorder(tileSize, boardSize, tileSpacing);

    // Crear y llenar el buffer del borde
    boardBorderBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, boardBorderBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, borderVertices, gl.STATIC_DRAW);

    updateUI();
}
// Detectar si el clic está dentro de una casilla
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
// Detectar clic en punto bonus
function isInsideBonusPoint(mouseX, mouseY, bonusPoint) {
    const x = (mouseX / gl.canvas.width) * 2 - 1;
    const y = -(mouseY / gl.canvas.height) * 2 + 1;

    const pointRadius = 0.03; // Radio mayor para facilitar el clic

    const distance = Math.sqrt(
        Math.pow(x - bonusPoint.centerX, 2) +
        Math.pow(y - bonusPoint.centerY, 2)
    );

    return distance <= pointRadius;
}
// Recoger punto bonus
function collectBonusPoint(bonusPoint) {
    // Añadir tiempo al temporizador
    gameState.timeLeft += BONUS_CONFIG.timeReward;

    // Efecto visual (opcional - cambiar color momentáneamente)
    bonusPoint.color = BLUE; // Azul claro

    // Eliminar el punto
    removeBonusPoint(bonusPoint.name);

    // Actualizar UI
    updateUI();

    console.log(`¡Bonus! +${BONUS_CONFIG.timeReward} segundos`);
}
// Cambiar color de una casilla
function changeTileColor(tile, color, isGreen) {
    tile.color = color;
    tile.isGreen = isGreen;
}
// --------------------------------
// Manejo de eventos              |
// --------------------------------
// Manejar clics en las casillas
function click(event) {
    let clickedTileOrBonusPoint = false;
    if (!gameState.gameActive) return;

    let rect = gl.canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;

    // Primero verificar puntos bonus (tienen prioridad)
    // make a gameState.bonusPoints iterator:
    let bonusPointIterator = 0;
    while (!clickedTileOrBonusPoint && bonusPointIterator < gameState.bonusPoints.length) {
        let bonusPoint = gameState.bonusPoints[bonusPointIterator];
        if (isInsideBonusPoint(mouseX, mouseY, bonusPoint)) {
            collectBonusPoint(bonusPoint);
            drawScene(); // Salir después de recoger un bonus, no queremos que el clic se haga en el bonus point y en la casilla a la vez
            clickedTileOrBonusPoint = true;
        }
        bonusPointIterator++;
    }
    // Luego verificar casillas normales
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
// Manejar tecla de pausa
function togglePause(event) {
    if (
        (event.code !== 'KeyP' && event.code !== 'Space') // No es tecla de pausa
        || (!gameState.gameActive || gameState.waitingForFirstClick) // No hay juego activo
    ) return
    // else
    event.preventDefault(); // Prevenir el scroll con la barra espaciadora

    gameState.isPaused = !gameState.isPaused;
    const pauseModal = document.getElementById('pauseModal');

    if (gameState.isPaused) {
        // Pausar el juego
        clearInterval(gameState.machineInterval);
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.bonusSpawnInterval);
        pauseModal.style.display = 'block'; // Lo mostramos
    } else {
        // Reanudar el juego
        const config = LEVEL_CONFIG[gameState.level];

        // Reiniciar los intervalos
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

        pauseModal.style.display = 'none'; // Lo ocultamos
    }
}
function easterEgg(event) {
    if (
        (event.code !== 'KeyR') // No es tecla de easterEgg
    ) return
    // else

    gameState.isPaused = !gameState.isPaused;
    const eggModal = document.getElementById('egModal');

    if (gameState.isPaused) {
        // Pausar el juego
        clearInterval(gameState.machineInterval);
        clearInterval(gameState.timerInterval);
        eggModal.style.display = 'block'; // Lo mostramos
    } else {
        // Reanudar el juego
        const config = LEVEL_CONFIG[gameState.level];

        // Reiniciar los intervalos
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

        eggModal.style.display = 'none'; // Lo ocultamos
    }
}
// --------------------------------
// UI                             |
// --------------------------------
// Actualizar la interfaz de usuario
function updateUI() {
    document.getElementById('level').textContent = gameState.level;

    // Mostrar mensaje especial si está esperando el primer clic
    if (gameState.waitingForFirstClick) {
        document.getElementById('timer').textContent = '¡Haz clic!';
    } else {
        document.getElementById('timer').textContent = gameState.timeLeft + 's';
    }

    document.getElementById('greenCount').textContent = gameState.greenTiles;
    document.getElementById('totalTiles').textContent = gameState.totalTiles;
}
// --------------------------------
// Funciones de Juego             |
// --------------------------------
// Comprobar si se ha ganado (todas verdes)
function checkWinCondition() {
    if (gameState.greenTiles === gameState.totalTiles) {
        nextLevel();
    }
}
// La máquina convierte una casilla verde en roja
function machineTurn() {
    if (!gameState.gameActive || gameState.waitingForFirstClick) return;
    // else
    const greenTiles = gameState.tiles.filter(tile => tile.isGreen); // Numero de casillas verdes

    if (greenTiles.length > 0) { // Si hay alguna casilla verde, pintamos una aleatoria a rojo
        const randomIndex = Math.floor(Math.random() * greenTiles.length);
        const tile = greenTiles[randomIndex];

        changeTileColor(tile, RED, false);
        gameState.greenTiles--; // restamos una verde
        updateUI();
        drawScene();
    }
}
// Pasar al siguiente nivel
function nextLevel() {
    // Limpiar timers anteriores
    if (gameState.machineInterval) clearInterval(gameState.machineInterval);
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);

    gameState.level++;
    gameState.gameStarted = false; // Indicamos que el juego no ha iniciado aún

    if (LEVEL_CONFIG[gameState.level]) {
        startLevel(gameState.level);
    } else {
        // Si no hay configuración para el nivel, usar la del último nivel
        startLevel(gameState.level - 1);
    }
}
// Iniciar un nivel
function startLevel(level) {
    // Finalizar intervalos anteriores
    clearInterval(gameState.machineInterval);
    clearInterval(gameState.timerInterval);

    const config = LEVEL_CONFIG[level];

    // Cargar configuración general
    gameState.level = level;
    gameState.timeLeft = config.time;
    gameState.gameActive = true;
    gameState.gameStarted = false;
    gameState.waitingForFirstClick = true;
    gameState.boardSize = config.boardSize;
    gameState.isPaused = false;

    document.getElementById('gameOver').style.display = 'none'; // Quitamos el display de gameOver

    // Reiniciar tablero
    initializeBoard();
    drawScene();

    // Actualizar UI
    updateUI();
}
// Iniciar el juego (timer y máquina) después del primer clic
function startGame() {
    if (gameState.gameStarted) return;
    // else
    gameState.gameStarted = true;
    gameState.waitingForFirstClick = false;

    const config = LEVEL_CONFIG[gameState.level] || LEVEL_CONFIG[15];

    // Temporizador del juego
    gameState.timerInterval = setInterval(function () {
        if (!gameState.gameActive) return;
        // else
        gameState.timeLeft--;
        updateUI();

        if (gameState.timeLeft <= 0) {
            gameOver();
        }
    }, 1000); // Cada 1 segundo actualizamos

    // Si finaliza el timer del sistema, fin del juego
    gameState.machineInterval = setInterval(function () {
        if (!gameState.gameActive) return;
        machineTurn();
    }, config.machineDelay); // Actualizamos dependiendo el nivel
}
// Game over
function gameOver() {
    gameState.gameActive = false;
    gameState.gameStarted = false;
    gameState.isPaused = false;
    document.getElementById('gameOver').style.display = 'block'; // mostramos gameOver
    document.getElementById('pauseModal').style.display = 'none'; // ocultamos modal de pausa

    clearInterval(gameState.machineInterval);
    clearInterval(gameState.timerInterval);

    // Volver al nivel 1 después de 3 segundos
    setTimeout(function () {
        startLevel(1);
    }, 3000);
}
// --------------------------------
// Funciones de dibujo            |
// --------------------------------
// Dibujar una casilla
function drawTile(tile) {
    gl.uniform4f(colorUniform, ...tile.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, tile.model.idBufferVertices);
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tile.model.idBufferIndices);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}
// Función para dibujar puntos bonus
function drawBonusPoint(bonusPoint) {
    gl.uniform4f(colorUniform, ...bonusPoint.color);
    gl.uniform1f(pointSizeUniform, bonusPoint.size);
    gl.bindBuffer(gl.ARRAY_BUFFER, bonusPoint.idBufferVertices);
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, 1);
}
function drawBorder() {
    gl.uniform4f(colorUniform, 1, 1, 1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, boardBorderBuffer); // Usar el buffer de bordes
    gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 8); // 8 vértices = 4 líneas
}
// Dibujar toda la escena
function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Dibujar el borde del tablero
    drawBorder();

    for (let tile of gameState.tiles) {
        drawTile(tile); // Pintamos cada casilla
    }

    for (let bonusPoint of gameState.bonusPoints) {
        drawBonusPoint(bonusPoint); // Pintamos todos los puntos de bonus
    }
}
// --------------------------------
// WebGl general                  |
// --------------------------------
function initBuffers(model) {
    model.idBufferVertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, model.idBufferVertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);

    model.idBufferIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.idBufferIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
}
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
function initRendering() {
    gl.clearColor(0.15, 0.15, 0.15, 1);
    if (gl?.canvas) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }
}
function getWebGLContext() {
    let canvas = document.getElementById("myCanvas");
    try {
        return canvas.getContext("webgl2");
    } catch (e) {
        return null;
    }
}
function initWebGL() {
    gl = getWebGLContext();
    if (!gl) {
        alert("WebGL 2.0 no está disponible");
        console.error('WebGL2 context not available');
        return;
    }

    // Inicializar shaders y la configuración de render antes de crear buffers y dibujar
    initShaders();
    initRendering();

    gl.canvas.addEventListener('click', click);
    document.addEventListener('keydown', togglePause); // Agregamos el evento de teclado para pausar
    document.addEventListener('keydown', easterEgg);

    // Iniciar el juego en nivel 1
    startLevel(1); // Aquí se realiza el initBuffers() (diferente a cada nivel)
    startBonusSpawner(); // ← Iniciar generador de puntos bonus
}
initWebGL();