// Constants
const COLS = 16;
const ROWS = 35;
const BLOCK_SIZE = 20;

// Calculate initial canvas size
const CANVAS_WIDTH = COLS * BLOCK_SIZE;  // 320px
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE; // 720px

const COLORS = [
    '#00FFFF', '#0000FF', '#FFA500', '#FFFF00', '#00FF00', '#800080', '#FF0000'
];

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]],                 // I
    [[1, 1, 1], [0, 1, 0]],         // T
    [[1, 1, 1], [1, 0, 0]],         // L
    [[1, 1, 1], [0, 0, 1]],         // J
    [[1, 1], [1, 1]],               // O
    [[0, 1, 1], [1, 1, 0]],         // S
    [[1, 1, 0], [0, 1, 1]]          // Z
];

// DOM elements
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const highScoreElement = document.getElementById('highScore');

// Game variables
let canvas;
let ctx;
let nextCanvas;
let nextCtx;
let board = [];
let currentPiece;
let nextPiece;
let score = 0;
let highScore = 0;
let lines = 0;
let level = 1;
let gameInterval;
let isPaused = false;
let gameOver = false;
let dropStart;
let gameSpeed = 1000;

// Add gradient effect to blocks
function addGradientToBlock(ctx, x, y, color) {
    const gradient = ctx.createLinearGradient(x * BLOCK_SIZE, y * BLOCK_SIZE, (x + 1) * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20));
    return gradient;
}

// Function to shade a color
function shadeColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16),
          amt = Math.round(2.55 * percent),
          R = (num >> 16) + amt,
          G = (num >> 8 & 0x00FF) + amt,
          B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// Draw a square
function drawBlock(x, y, color, ctx) {
    ctx.fillStyle = addGradientToBlock(ctx, x, y, color);
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Add highlight
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.lineTo((x + 1) * BLOCK_SIZE, y * BLOCK_SIZE);
    ctx.lineTo(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
}

// Create the board
function createBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
}

// Draw the board
function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c]) {
                drawBlock(c, r, COLORS[board[r][c] - 1], ctx);
            }
        }
    }
}

// Clear the canvas
function clearCanvas() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(canvas.width, i * BLOCK_SIZE);
        ctx.stroke();
    }
}

// Clear the next piece canvas
function clearNextCanvas() {
    nextCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
}

// Load high score from localStorage
function loadHighScore() {
    const savedHighScore = localStorage.getItem('tetrisHighScore');
    if (savedHighScore) {
        highScore = parseInt(savedHighScore);
        highScoreElement.textContent = highScore;
    }
}

// Save high score to localStorage
function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetrisHighScore', highScore.toString());
        highScoreElement.textContent = highScore;
    }
}

// Tetromino class
class Tetromino {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2);
        this.y = 0;
    }
    
    draw() {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (this.shape[r][c]) {
                    drawBlock(this.x + c, this.y + r, this.color, ctx);
                }
            }
        }
    }
    
    drawNext() {
        clearNextCanvas();
        const offsetX = (nextCanvas.width / BLOCK_SIZE - this.shape[0].length) / 2;
        const offsetY = (nextCanvas.height / BLOCK_SIZE - this.shape.length) / 2;
        
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (this.shape[r][c]) {
                    drawBlock(offsetX + c, offsetY + r, this.color, nextCtx);
                }
            }
        }
    }
    
    move(direction) {
        if (direction === 'down') {
            if (!this.collision(0, 1)) {
                this.y++;
                return true;
            } else {
                this.lock();
                return false;
            }
        } else if (direction === 'right') {
            if (!this.collision(1, 0)) {
                this.x++;
                return true;
            }
        } else if (direction === 'left') {
            if (!this.collision(-1, 0)) {
                this.x--;
                return true;
            }
        }
        return false;
    }
    
    rotate() {
        const newShape = [];
        for (let c = 0; c < this.shape[0].length; c++) {
            newShape[c] = [];
            for (let r = 0; r < this.shape.length; r++) {
                newShape[c][this.shape.length - 1 - r] = this.shape[r][c];
            }
        }
        
        const oldShape = this.shape;
        this.shape = newShape;
        
        if (this.collision(0, 0)) {
            if (!this.collision(-1, 0)) {
                this.x--;
            } else if (!this.collision(1, 0)) {
                this.x++;
            } else if (!this.collision(0, -1)) {
                this.y--;
            } else {
                this.shape = oldShape;
            }
        }
    }
    
    collision(x, y) {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (!this.shape[r][c]) continue;
                
                const newX = this.x + c + x;
                const newY = this.y + r + y;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY < 0) continue;
                
                if (board[newY][newX]) {
                    return true;
                }
            }
        }
        return false;
    }
    
    lock() {
        for (let r = 0; r < this.shape.length; r++) {
            for (let c = 0; c < this.shape[r].length; c++) {
                if (!this.shape[r][c]) continue;
                
                if (this.y + r < 0) {
                    gameOver = true;
                    break;
                }
                
                board[this.y + r][this.x + c] = COLORS.indexOf(this.color) + 1;
            }
        }
        
        this.checkRows();
        
        if (!gameOver) {
            currentPiece = nextPiece;
            generateNextPiece();
            
            if (currentPiece.collision(0, 0)) {
                gameOver = true;
            }
        }
    }
    
    checkRows() {
        let linesCleared = 0;
        
        for (let r = ROWS - 1; r >= 0; r--) {
            let isRowFull = true;
            
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] === 0) {
                    isRowFull = false;
                    break;
                }
            }
            
            if (isRowFull) {
                for (let y = r; y > 0; y--) {
                    for (let c = 0; c < COLS; c++) {
                        board[y][c] = board[y-1][c];
                    }
                }
                
                for (let c = 0; c < COLS; c++) {
                    board[0][c] = 0;
                }
                
                linesCleared++;
                r++;
            }
        }
        
        if (linesCleared > 0) {
            lines += linesCleared;
            
            let basePoints = 0;
            switch (linesCleared) {
                case 1: basePoints = 100; break;
                case 2: basePoints = 300; break;
                case 3: basePoints = 500; break;
                case 4: basePoints = 800; break;
            }
            
            score += basePoints * level;
            
            level = Math.floor(lines / 10) + 1;
            gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
            
            scoreElement.textContent = score;
            linesElement.textContent = lines;
            levelElement.textContent = level;
        }
    }
    
    drop() {
        while (this.move('down')) {
            // Keep moving down
        }
    }
}

// Generate pieces
function generatePiece() {
    const randomIndex = Math.floor(Math.random() * SHAPES.length);
    const randomShape = SHAPES[randomIndex];
    const randomColor = COLORS[randomIndex];
    return new Tetromino(randomShape, randomColor);
}

function generateNextPiece() {
    nextPiece = generatePiece();
    nextPiece.drawNext();
}

// Key control
function keyControl(event) {
    if (gameOver || isPaused) return;
    
    switch (event.keyCode) {
        case 37: // Left arrow
            currentPiece.move('left');
            dropStart = Date.now();
            break;
        case 38: // Up arrow
            currentPiece.rotate();
            dropStart = Date.now();
            break;
        case 39: // Right arrow
            currentPiece.move('right');
            dropStart = Date.now();
            break;
        case 40: // Down arrow
            currentPiece.move('down');
            dropStart = Date.now();
            break;
        case 32: // Space bar
            currentPiece.drop();
            dropStart = Date.now();
            break;
    }
}

// Game loop
function gameLoop() {
    if (!isPaused && !gameOver) {
        const now = Date.now();
        const delta = now - dropStart;
        
        if (delta > gameSpeed) {
            currentPiece.move('down');
            dropStart = now;
        }
        
        clearCanvas();
        drawBoard();
        currentPiece.draw();
    } else if (gameOver) {
        clearInterval(gameInterval);
        saveHighScore();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '20px Arial';
        ctx.fillText('您的得分: ' + score, canvas.width / 2, canvas.height / 2);
        
        if (score >= highScore) {
            ctx.fillStyle = '#ffd700';
            ctx.fillText('新的最高分！', canvas.width / 2, canvas.height / 2 + 30);
        } else {
            ctx.fillText('最高分: ' + highScore, canvas.width / 2, canvas.height / 2 + 30);
        }
        
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
}

// Start game
function startGame() {
    if (gameInterval) clearInterval(gameInterval);
    
    createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameSpeed = 1000;
    gameOver = false;
    isPaused = false;
    
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
    highScoreElement.textContent = highScore;
    
    currentPiece = generatePiece();
    generateNextPiece();
    
    clearCanvas();
    drawBoard();
    currentPiece.draw();
    
    dropStart = Date.now();
    gameInterval = setInterval(gameLoop, 16);
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '暂停';
}

// Toggle pause
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseBtn.textContent = '继续';
    } else {
        dropStart = Date.now();
        pauseBtn.textContent = '暂停';
    }
}

// Restart game
function restartGame() {
    if (gameInterval) clearInterval(gameInterval);
    startGame();
}

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    nextCanvas = document.getElementById('nextPiece');
    nextCtx = nextCanvas.getContext('2d');
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    document.addEventListener('keydown', keyControl);
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', restartGame);
    
    pauseBtn.disabled = true;
    loadHighScore();
    
    clearCanvas();
}

// Start the game when the page loads
window.onload = init;