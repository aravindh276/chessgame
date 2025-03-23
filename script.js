const board = document.getElementById('board');
let selectedPiece = null;

const initialPosition = [
    ['br','bn','bb','bq','bk','bb','bn','br'],
    ['bp','bp','bp','bp','bp','bp','bp','bp'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wp','wp','wp','wp','wp','wp','wp','wp'],
    ['wr','wn','wb','wq','wk','wb','wn','wr']
];

// Create Chess Board
function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square', (i + j) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = i;
            square.dataset.col = j;

            const pieceName = initialPosition[i][j];
            if(pieceName) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                piece.draggable = true;
                piece.dataset.piece = pieceName;
                piece.style.backgroundImage = `url('./assets/pieces/${pieceName}.png')`;

                piece.addEventListener('dragstart', dragStart);
                square.appendChild(piece);
            }

            square.addEventListener('dragover', dragOver);
            square.addEventListener('drop', dropPiece);
            
            board.appendChild(square);
        }
    }
}

// Drag and Drop Functions
function dragStart(e) {
    selectedPiece = e.target;
}

function dragOver(e) {
    e.preventDefault(); // Allow drop
}

function dropPiece(e) {
    e.preventDefault();

    const targetSquare = e.currentTarget;
    const pieceExists = targetSquare.querySelector('.piece');

    // Replace piece if one exists
    if (pieceExists) {
        pieceExists.remove();
    }

    targetSquare.appendChild(selectedPiece);
    selectedPiece = null;
}

// Initialize the Board
createBoard();



