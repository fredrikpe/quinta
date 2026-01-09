let currentPuzzle = null;
let gridData = Array(5).fill().map(() => Array(5).fill(''));
let pluswordData = '';
let startTime = null;
let timerInterval = null;
let validationInProgress = false;
let currentMode = 'across'; // 'across' or 'down'
let activeCell = { row: null, col: null };

// Initialize the game
async function init() {
    await loadPuzzle();
    createGrid();
    createPluswordInput();
    setupEventListeners();
    startTimer();
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

async function loadPuzzle() {
    try {
        const response = await fetch('/api/puzzle/today');
        if (!response.ok) {
            throw new Error('Failed to load puzzle');
        }
        currentPuzzle = await response.json();
        displayClues();
        displayPluswordClue();
    } catch (error) {
        console.error('Error loading puzzle:', error);
        showModal('❌', 'Error', 'Failed to load puzzle. Please refresh the page.');
    }
}

function displayClues() {
    const acrossClues = document.getElementById('across-clues');
    const downClues = document.getElementById('down-clues');

    acrossClues.innerHTML = '';
    downClues.innerHTML = '';

    currentPuzzle.across_words.forEach((wordData, index) => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'p-2 hover:bg-gray-100 rounded cursor-pointer';
        clueDiv.innerHTML = `<span class="font-bold mr-2">${index + 1}.</span><span>${wordData.clue}</span>`;
        acrossClues.appendChild(clueDiv);
    });

    currentPuzzle.down_words.forEach((wordData, index) => {
        const clueDiv = document.createElement('div');
        clueDiv.className = 'p-2 hover:bg-gray-100 rounded cursor-pointer';
        clueDiv.innerHTML = `<span class="font-bold mr-2">${index + 1}.</span><span>${wordData.clue}</span>`;
        downClues.appendChild(clueDiv);
    });
}

function displayPluswordClue() {
    const pluswordClueElement = document.getElementById('plusword-clue');
    pluswordClueElement.textContent = currentPuzzle.plusword_clue;
}

function createGrid() {
    const grid = document.getElementById('crossword-grid');
    grid.innerHTML = '';

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const wrapper = document.createElement('div');
            wrapper.className = 'cell-wrapper relative';

            // Add cell number for first cell of each row/column
            if (col === 0) {
                const number = document.createElement('div');
                number.className = 'cell-number';
                number.textContent = row + 1;
                wrapper.appendChild(number);
            }
            if (row === 0 && col > 0) {
                const number = document.createElement('div');
                number.className = 'cell-number';
                number.textContent = col + 1;
                wrapper.appendChild(number);
            }

            const cell = document.createElement('input');
            cell.type = 'text';
            cell.maxLength = 1;
            cell.className = 'w-16 h-16 md:w-20 md:h-20 text-center text-2xl md:text-3xl font-bold uppercase bg-white border border-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10';
            cell.style.caretColor = 'transparent'; // Hide cursor
            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener('keydown', (e) => handleKeyDown(e, row, col));
            cell.addEventListener('focus', (e) => handleCellFocus(e, row, col));
            cell.addEventListener('click', (e) => handleCellClick(e, row, col));
            cell.addEventListener('mousedown', (e) => e.preventDefault()); // Prevent text selection
            cell.addEventListener('select', (e) => e.preventDefault()); // Prevent text selection

            wrapper.appendChild(cell);
            grid.appendChild(wrapper);
        }
    }
}

function createPluswordInput() {
    const pluswordGrid = document.getElementById('plusword-grid');
    pluswordGrid.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const cell = document.createElement('input');
        cell.type = 'text';
        cell.maxLength = 1;
        cell.className = 'w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold uppercase bg-white border-2 border-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500';
        cell.dataset.pluswordIndex = i;
        cell.addEventListener('input', (e) => handlePluswordInput(e, i));
        cell.addEventListener('keydown', (e) => handlePluswordKeyDown(e, i));
        cell.addEventListener('focus', (e) => e.target.select());
        pluswordGrid.appendChild(cell);
    }
}


function handlePluswordInput(e, index) {
    const value = e.target.value.toUpperCase();
    e.target.value = value;

    // Update plusword data
    const cells = document.querySelectorAll('[data-plusword-index]');
    pluswordData = Array.from(cells).map(c => c.value).join('');

    // Clear highlighting
    e.target.classList.remove('bg-red-200', 'bg-green-200');

    // Auto-advance
    if (value && index < 4) {
        const nextCell = document.querySelector(`[data-plusword-index="${index + 1}"]`);
        if (nextCell) nextCell.focus();
    }

    checkIfComplete();
}

function handleKeyDown(e, row, col) {
    // Handle letter input
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        e.preventDefault();
        const value = e.key.toUpperCase();
        e.target.value = value;
        gridData[row][col] = value;

        // Clear any error/correct highlighting
        e.target.classList.remove('bg-red-200', 'bg-green-200');

        // Auto-advance based on current mode
        if (currentMode === 'across') {
            // Move right in the same row
            if (col < 4) {
                const nextCell = document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`);
                if (nextCell) nextCell.focus();
            } else if (row < 4) {
                // At end of row, move to start of next row
                const nextCell = document.querySelector(`[data-row="${row + 1}"][data-col="0"]`);
                if (nextCell) nextCell.focus();
            }
        } else {
            // Move down in the same column
            if (row < 4) {
                const nextCell = document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`);
                if (nextCell) nextCell.focus();
            } else if (col < 4) {
                // At end of column, move to top of next column
                const nextCell = document.querySelector(`[data-row="0"][data-col="${col + 1}"]`);
                if (nextCell) nextCell.focus();
            }
        }

        checkIfComplete();
        return;
    }

    // Handle arrow keys
    switch (e.key) {
        case 'ArrowRight':
            if (col < 4) {
                e.preventDefault();
                currentMode = 'across';
                document.querySelector(`[data-row="${row}"][data-col="${col + 1}"]`).focus();
            }
            break;
        case 'ArrowLeft':
            if (col > 0) {
                e.preventDefault();
                currentMode = 'across';
                document.querySelector(`[data-row="${row}"][data-col="${col - 1}"]`).focus();
            }
            break;
        case 'ArrowDown':
            if (row < 4) {
                e.preventDefault();
                currentMode = 'down';
                document.querySelector(`[data-row="${row + 1}"][data-col="${col}"]`).focus();
            }
            break;
        case 'ArrowUp':
            if (row > 0) {
                e.preventDefault();
                currentMode = 'down';
                document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`).focus();
            }
            break;
        case 'Backspace':
            e.preventDefault();
            // Always delete current cell and move back
            e.target.value = '';
            gridData[row][col] = '';

            if (currentMode === 'across') {
                // Move left in across mode
                if (col > 0) {
                    const prevCell = document.querySelector(`[data-row="${row}"][data-col="${col - 1}"]`);
                    prevCell.focus();
                }
            } else {
                // Move up in down mode
                if (row > 0) {
                    const prevCell = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
                    prevCell.focus();
                }
            }
            break;
    }
}

function handlePluswordKeyDown(e, index) {
    switch (e.key) {
        case 'ArrowRight':
            if (index < 4) {
                e.preventDefault();
                document.querySelector(`[data-plusword-index="${index + 1}"]`).focus();
            }
            break;
        case 'ArrowLeft':
            if (index > 0) {
                e.preventDefault();
                document.querySelector(`[data-plusword-index="${index - 1}"]`).focus();
            }
            break;
        case 'Backspace':
            if (!e.target.value && index > 0) {
                e.preventDefault();
                const prevCell = document.querySelector(`[data-plusword-index="${index - 1}"]`);
                prevCell.focus();
                prevCell.value = '';
                // Update plusword data
                const cells = document.querySelectorAll('[data-plusword-index]');
                pluswordData = Array.from(cells).map(c => c.value).join('');
            }
            break;
    }
}

function checkIfComplete() {
    const allGridFilled = gridData.every(row => row.every(cell => cell !== ''));
    const pluswordFilled = pluswordData.length === 5;

    if (allGridFilled && pluswordFilled && !validationInProgress) {
        validationInProgress = true;
        setTimeout(() => validatePuzzle(), 500); // Small delay for better UX
    }
}

async function validatePuzzle() {
    try {
        const response = await fetch('/api/puzzle/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answers: gridData,
                plusword: pluswordData
            }),
        });

        const result = await response.json();

        if (result.correct) {
            clearInterval(timerInterval);

            // Mark all cells as correct
            document.querySelectorAll('input').forEach(cell => {
                cell.classList.add('bg-green-200');
                cell.disabled = true;
            });

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

            showModal('🎉', 'Congratulations!', `You solved the puzzle in ${timeStr}!`);
        } else {
            showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
            validationInProgress = false;
        }
    } catch (error) {
        console.error('Error checking answers:', error);
        showModal('❌', 'Error', 'Failed to check answers. Please try again.');
        validationInProgress = false;
    }
}

function handleCellFocus(e, row, col) {
    e.target.select();
    if (activeCell.row !== row || activeCell.col !== col) {
        activeCell = { row, col };
        highlightActiveWord();
    }
}

function handleCellClick(e, row, col) {
    if (activeCell.row === row && activeCell.col === col) {
        // Toggle mode if clicking the same cell
        currentMode = currentMode === 'across' ? 'down' : 'across';
    }
    // Update active cell and highlight (keeping current mode if it's a new cell)
    activeCell = { row, col };
    highlightActiveWord();
}

function highlightActiveWord() {
    // Remove all highlights
    document.querySelectorAll('[data-row]').forEach(cell => {
        cell.classList.remove('bg-blue-100');
        cell.style.boxShadow = '';
    });
    document.querySelectorAll('#across-clues > div, #down-clues > div').forEach(clue => {
        clue.classList.remove('bg-blue-200', 'font-bold');
    });

    if (activeCell.row === null || activeCell.col === null) return;

    if (currentMode === 'across') {
        // Highlight the entire row
        for (let col = 0; col < 5; col++) {
            const cell = document.querySelector(`[data-row="${activeCell.row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('bg-blue-100');
            }
        }
        // Add border to currently focused cell
        const currentCell = document.querySelector(`[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`);
        if (currentCell) {
            currentCell.style.boxShadow = 'inset 0 0 0 3px #3b82f6';
        }
        // Highlight the corresponding across clue
        const clueElement = document.querySelector(`#across-clues > div:nth-child(${activeCell.row + 1})`);
        if (clueElement) {
            clueElement.classList.add('bg-blue-200', 'font-bold');
            clueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    } else {
        // Highlight the entire column
        for (let row = 0; row < 5; row++) {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${activeCell.col}"]`);
            if (cell) {
                cell.classList.add('bg-blue-100');
            }
        }
        // Add border to currently focused cell
        const currentCell = document.querySelector(`[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`);
        if (currentCell) {
            currentCell.style.boxShadow = 'inset 0 0 0 3px #3b82f6';
        }
        // Highlight the corresponding down clue
        const clueElement = document.querySelector(`#down-clues > div:nth-child(${activeCell.col + 1})`);
        if (clueElement) {
            clueElement.classList.add('bg-blue-200', 'font-bold');
            clueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

function showModal(icon, title, message) {
    document.getElementById('modal-icon').textContent = icon;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('result-modal').classList.remove('hidden');
}

function hideModal() {
    document.getElementById('result-modal').classList.add('hidden');
}

function setupEventListeners() {
    document.getElementById('modal-close').addEventListener('click', hideModal);

    // Close modal on background click
    document.getElementById('result-modal').addEventListener('click', (e) => {
        if (e.target.id === 'result-modal') {
            hideModal();
        }
    });
}

// Start the game when page loads
init();
