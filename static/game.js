let currentPuzzle = null;
let gridData = Array(5).fill().map(() => Array(5).fill(''));

// Initialize the game
async function init() {
    displayDate();
    await loadPuzzle();
    createGrid();
    setupEventListeners();
}

function displayDate() {
    const dateElement = document.getElementById('date');
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options);
}

async function loadPuzzle() {
    try {
        const response = await fetch('/api/puzzle/today');
        if (!response.ok) {
            throw new Error('Failed to load puzzle');
        }
        currentPuzzle = await response.json();
        displayClues();
    } catch (error) {
        console.error('Error loading puzzle:', error);
        showMessage('Failed to load puzzle. Please refresh the page.', 'error');
    }
}

function displayClues() {
    const acrossClues = document.getElementById('across-clues');
    const downClues = document.getElementById('down-clues');

    acrossClues.innerHTML = '';
    downClues.innerHTML = '';

    currentPuzzle.across_words.forEach((wordData, index) => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'bg-gray-100 p-3 rounded-lg text-sm';
        clueDiv.innerHTML = `<span class="font-bold text-indigo-600 mr-2">${index + 1}.</span><span class="text-gray-700">${wordData.clue}</span>`;
        acrossClues.appendChild(clueDiv);
    });

    currentPuzzle.down_words.forEach((wordData, index) => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'bg-gray-100 p-3 rounded-lg text-sm';
        clueDiv.innerHTML = `<span class="font-bold text-indigo-600 mr-2">${index + 1}.</span><span class="text-gray-700">${wordData.clue}</span>`;
        downClues.appendChild(clueDiv);
    });
}

function createGrid() {
    const grid = document.getElementById('crossword-grid');
    grid.innerHTML = '';

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 1;
            cell.className = 'w-14 h-14 md:w-16 md:h-16 text-center text-2xl font-bold uppercase bg-white border-2 border-gray-300 focus:border-indigo-500 focus:bg-indigo-50 focus:outline-none transition';
            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener('input', (e) => handleInput(e, row, col));
            cell.addEventListener('keydown', (e) => handleKeyDown(e, row, col));

            grid.appendChild(cell);
        }
    }
}

function handleInput(e, row, col) {
    const value = e.target.value.toUpperCase();
    e.target.value = value;
    gridData[row][col] = value;

    // Clear any error/correct highlighting
    e.target.classList.remove('bg-red-100', 'border-red-400', 'bg-green-100', 'border-green-400');

    // Auto-advance to next cell
    if (value && col < 4) {
        const nextCell = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`);
        if (nextCell) nextCell.focus();
    }
}

function handleKeyDown(e, row, col) {
    switch (e.key) {
        case 'ArrowRight':
            if (col < 4) {
                e.preventDefault();
                document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`).focus();
            }
            break;
        case 'ArrowLeft':
            if (col > 0) {
                e.preventDefault();
                document.querySelector(`[data-row="${row}"][data-col="${col - 1}"]`).focus();
            }
            break;
        case 'ArrowDown':
            if (row < 4) {
                e.preventDefault();
                document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`).focus();
            }
            break;
        case 'ArrowUp':
            if (row > 0) {
                e.preventDefault();
                document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`).focus();
            }
            break;
        case 'Backspace':
            if (!e.target.value && col > 0) {
                e.preventDefault();
                const prevCell = document.querySelector(`[data-row="${row}"][data-col="${col - 1}"]`);
                prevCell.focus();
                prevCell.value = '';
                gridData[row][col - 1] = '';
            }
            break;
    }
}

async function checkAnswers() {
    const allFilled = gridData.every(row => row.every(cell => cell !== ''));

    if (!allFilled) {
        showMessage('Please fill in all cells before checking', 'error');
        return;
    }

    try {
        const response = await fetch('/api/puzzle/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answers: gridData }),
        });

        const result = await response.json();

        // Clear all previous highlighting
        document.querySelectorAll('input').forEach(cell => {
            cell.classList.remove('bg-red-100', 'border-red-400', 'bg-green-100', 'border-green-400');
        });

        if (result.correct) {
            showMessage('Congratulations! You solved the puzzle!', 'success');
            document.querySelectorAll('input').forEach(cell => {
                cell.classList.add('bg-green-100', 'border-green-400');
                cell.disabled = true;
            });
        } else {
            showMessage(`${result.errors.length} incorrect cell(s). Try again!`, 'error');
            result.errors.forEach(error => {
                const cell = document.querySelector(`[data-row="${error.row}"][data-col="${error.col}"]`);
                if (cell) {
                    cell.classList.add('bg-red-100', 'border-red-400');
                }
            });
        }
    } catch (error) {
        console.error('Error checking answers:', error);
        showMessage('Failed to check answers. Please try again.', 'error');
    }
}

function clearGrid() {
    gridData = Array(5).fill().map(() => Array(5).fill(''));
    document.querySelectorAll('input').forEach(cell => {
        cell.value = '';
        cell.classList.remove('bg-red-100', 'border-red-400', 'bg-green-100', 'border-green-400');
        cell.disabled = false;
    });
    showMessage('', '');
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;

    if (type === 'success') {
        messageDiv.className = 'text-center font-semibold min-h-12 flex items-center justify-center rounded-lg bg-green-100 text-green-800 px-4 py-3';
    } else if (type === 'error') {
        messageDiv.className = 'text-center font-semibold min-h-12 flex items-center justify-center rounded-lg bg-red-100 text-red-800 px-4 py-3';
    } else {
        messageDiv.className = 'text-center font-semibold min-h-12 flex items-center justify-center rounded-lg';
    }
}

function setupEventListeners() {
    document.getElementById('check-btn').addEventListener('click', checkAnswers);
    document.getElementById('clear-btn').addEventListener('click', clearGrid);
}

// Start the game when page loads
init();
