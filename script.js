const board = document.getElementById('board');

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

function createBoard() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square', (i + j) % 2 === 0 ? 'light' : 'dark');
            square.setAttribute('data-row', i);
            square.setAttribute('data-col', j);

            if(initialPosition[i][j]) {
                const piece = document.createElement('div');
                piece.classList.add('piece');
                piece.style.backgroundImage = `url('assets/pieces/${initialPosition[i][j]}.png')`;
                square.appendChild(piece);
            }

            board.appendChild(square);
        }
    }
}

createBoard();


