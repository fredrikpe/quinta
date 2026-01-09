let currentPuzzle = null;
let gridData = Array(5).fill().map(() => Array(5).fill(''));
let pluswordData = '';
let startTime = null;
let timerInterval = null;
let validationInProgress = false;
let currentMode = 'across'; // 'across' or 'down'
let activeCell = { row: null, col: null };
let prevActiveOnMouseDown = null;
let modalKeyHandlerRef = null;

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
    clueDiv.dataset.position = wordData.position;
    clueDiv.dataset.orientation = 'across';
    clueDiv.innerHTML = `<span class="font-bold mr-2">${index + 1}.</span><span>${wordData.clue}</span>`;
    clueDiv.addEventListener('click', () => {
      // Focus the first cell of the across word (column 0)
      const row = parseInt(wordData.position, 10);
      const cell = document.querySelector(`[data-row="${row}"][data-col="0"]`);
      if (cell) {
        currentMode = 'across';
        cell.focus();
      }
    });
    acrossClues.appendChild(clueDiv);
  });

  currentPuzzle.down_words.forEach((wordData, index) => {
    const clueDiv = document.createElement('div');
    clueDiv.className = 'p-2 hover:bg-gray-100 rounded cursor-pointer';
    clueDiv.dataset.position = wordData.position;
    clueDiv.dataset.orientation = 'down';
    clueDiv.innerHTML = `<span class="font-bold mr-2">${index + 1}.</span><span>${wordData.clue}</span>`;
    clueDiv.addEventListener('click', () => {
      // Focus the first cell of the down word (row 0)
      const col = parseInt(wordData.position, 10);
      const cell = document.querySelector(`[data-row="0"][data-col="${col}"]`);
      if (cell) {
        currentMode = 'down';
        cell.focus();
      }
    });
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
      cell.addEventListener('mousedown', (e) => {
        // Capture previous active cell before focus changes
        prevActiveOnMouseDown = { row: activeCell.row, col: activeCell.col };
        // Allow focus so keyboard works
        cell.focus();
        // Prevent text selection and drag-selection across cells
        e.preventDefault();
      });
      cell.addEventListener('touchstart', (e) => {
        // Required for iOS Safari — touch doesn't automatically focus inputs
        cell.focus();
        e.preventDefault();
      });
      cell.addEventListener('touchend', (e) => e.preventDefault());

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
    cell.className = 'w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold uppercase bg-white border border-black focus:outline-none focus:ring-2 focus:ring-blue-500';
    cell.style.caretColor = 'transparent';
    cell.dataset.pluswordIndex = i;
    cell.addEventListener('input', (e) => handlePluswordInput(e, i));
    cell.addEventListener('keydown', (e) => handlePluswordKeyDown(e, i));
    cell.addEventListener('focus', (e) => {
      // keep caret hidden and avoid selection highlighting
      e.target.select();
    });
    pluswordGrid.appendChild(cell);
  }
}


function handlePluswordInput(e, index) {
  const key = e.data || e.target.value; // data is available on input events for single char
  const value = (key || e.target.value).toUpperCase();
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
  console.log(e, row, col)
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

    // If this was the very last grid cell, move focus to the first plusword cell
    if (row === 4 && col === 4) {
      const firstPlus = document.querySelector('[data-plusword-index="0"]');
      if (firstPlus) firstPlus.focus();
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
      // Delete current cell
      e.target.value = '';
      gridData[row][col] = '';

      if (currentMode === 'across') {
        // Move left in across mode, or wrap to end of previous row
        if (col > 0) {
          const prevCell = document.querySelector(`[data-row="${row}"][data-col="${col - 1}"]`);
          if (prevCell) prevCell.focus();
        } else if (row > 0) {
          const prevCell = document.querySelector(`[data-row="${row - 1}"][data-col="4"]`);
          if (prevCell) {
            prevCell.value = '';
            gridData[row - 1][4] = '';
            prevCell.focus();
          }
        }
      } else {
        // Move up in down mode, or wrap to end of previous column
        if (row > 0) {
          const prevCell = document.querySelector(`[data-row="${row - 1}"][data-col="${col}"]`);
          if (prevCell) prevCell.focus();
        } else if (col > 0) {
          const prevCell = document.querySelector(`[data-row="4"][data-col="${col - 1}"]`);
          if (prevCell) {
            prevCell.value = '';
            gridData[4][col - 1] = '';
            prevCell.focus();
          }
        }
      }
      break;
  }
}

function handlePluswordKeyDown(e, index) {
  // Handle letters similar to grid cells
  if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
    e.preventDefault();
    const value = e.key.toUpperCase();
    e.target.value = value;
    // update data
    const cells = document.querySelectorAll('[data-plusword-index]');
    pluswordData = Array.from(cells).map(c => c.value).join('');
    e.target.classList.remove('bg-red-200', 'bg-green-200');
    if (index < 4) {
      const next = document.querySelector(`[data-plusword-index="${index + 1}"]`);
      if (next) next.focus();
    }
    checkIfComplete();
    return;
  }

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
      // If empty and not first, move to previous plusword cell
      if (!e.target.value && index > 0) {
        e.preventDefault();
        const prevCell = document.querySelector(`[data-plusword-index="${index - 1}"]`);
        if (prevCell) {
          prevCell.focus();
          prevCell.value = '';
        }
        // Update plusword data
        const cells = document.querySelectorAll('[data-plusword-index]');
        pluswordData = Array.from(cells).map(c => c.value).join('');
      } else if (!e.target.value && index === 0) {
        // Move back into the grid: focus last grid cell
        e.preventDefault();
        const lastGrid = document.querySelector('[data-row="4"][data-col="4"]');
        if (lastGrid) {
          lastGrid.focus();
          lastGrid.value = '';
          gridData[4][4] = '';
        }
      } else {
        // If there is content, clear it
        e.target.value = '';
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
    // Validate immediately (no artificial delay)
    validatePuzzle();
  }
}

async function validatePuzzle() {
  // Perform client-side validation using today's puzzle data (no network request)
  try {
    const errors = [];
    if (!currentPuzzle) {
      throw new Error('No puzzle loaded');
    }

    // Check across words (rows)
    currentPuzzle.across_words.forEach((expectedWord, row) => {
      for (let col = 0; col < expectedWord.word.length; col++) {
        const expectedChar = expectedWord.word[col].toUpperCase();
        const actual = (gridData[row][col] || '').toUpperCase();
        if (actual !== expectedChar) errors.push({ row, col });
      }
    });

    // Check down words (columns)
    currentPuzzle.down_words.forEach((expectedWord, col) => {
      for (let row = 0; row < expectedWord.word.length; row++) {
        const expectedChar = expectedWord.word[row].toUpperCase();
        const actual = (gridData[row][col] || '').toUpperCase();
        if (actual !== expectedChar) {
          if (!errors.find(e => e.row === row && e.col === col)) errors.push({ row, col });
        }
      }
    });

    // Check plusword
    const pluswordSolution = currentPuzzle.plusword || '';
    const pluswordError = pluswordData.toUpperCase() !== pluswordSolution.toUpperCase();

    if (errors.length === 0 && !pluswordError) {
      clearInterval(timerInterval);
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
      // Do not highlight incorrect letters when showing the modal, per user preference
      showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
      validationInProgress = false;
    }
  } catch (error) {
    console.error('Error validating answers:', error);
    showModal('❌', 'Error', 'Failed to validate answers. Please try again.');
    validationInProgress = false;
  }
}

function handleCellFocus(e, row, col) {
  activeCell = { row, col };
  highlightActiveWord();
}

function handleCellClick(e, row, col) {
  // Toggle mode only if the cell was already active before this click (mouse-down)
  if (prevActiveOnMouseDown && prevActiveOnMouseDown.row === row && prevActiveOnMouseDown.col === col) {
    currentMode = currentMode === 'across' ? 'down' : 'across';
  }
  prevActiveOnMouseDown = null;
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

  const selectedClueEl = document.getElementById('selected-clue');
  if (activeCell.row === null || activeCell.col === null) {
    if (selectedClueEl) selectedClueEl.textContent = '';
    return;
  }

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
    // Highlight the corresponding across clue and update selected clue display
    const clueIndex = activeCell.row;
    const clueElement = document.querySelector(`#across-clues > div:nth-child(${clueIndex + 1})`);
    if (clueElement) {
      clueElement.classList.add('bg-blue-200', 'font-bold');
      clueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (selectedClueEl && currentPuzzle && currentPuzzle.across_words && currentPuzzle.across_words[clueIndex]) {
      selectedClueEl.textContent = (clueIndex + 1) + '. ' + currentPuzzle.across_words[clueIndex].clue;
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
    // Highlight the corresponding down clue and update selected clue display
    const clueIndex = activeCell.col;
    const clueElement = document.querySelector(`#down-clues > div:nth-child(${clueIndex + 1})`);
    if (clueElement) {
      clueElement.classList.add('bg-blue-200', 'font-bold');
      clueElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (selectedClueEl && currentPuzzle && currentPuzzle.down_words && currentPuzzle.down_words[clueIndex]) {
      selectedClueEl.textContent = (clueIndex + 1) + '. ' + currentPuzzle.down_words[clueIndex].clue;
    }
  }
}

function showModal(icon, title, message) {
  document.getElementById('modal-icon').textContent = icon;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('result-modal').classList.remove('hidden');
  // Close modal on any key press (once)
  modalKeyHandlerRef = function () {
    hideModal();
  };
  document.addEventListener('keydown', modalKeyHandlerRef);
}

function hideModal() {
  document.getElementById('result-modal').classList.add('hidden');
  if (modalKeyHandlerRef) {
    document.removeEventListener('keydown', modalKeyHandlerRef);
    modalKeyHandlerRef = null;
  }
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
