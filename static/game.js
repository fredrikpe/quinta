import { h, render } from "https://esm.sh/preact";
import { useState, useEffect, useRef } from "https://esm.sh/preact/hooks";
import htm from "https://esm.sh/htm";

const html = htm.bind(h);

function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState(Array(6).fill().map(() => Array(5).fill(''))); // 6 rows: 0-4 regular, 5 plusword
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentMode, setCurrentMode] = useState('across');
  const [activeCell, setActiveCell] = useState({ row: null, col: null });
  const [prevActiveOnMouseDown, setPrevActiveOnMouseDown] = useState(null);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', timeStr: null });
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [hasShownResult, setHasShownResult] = useState(false);
  const cellRefsFromGrid = useRef(null);

  // Load puzzle on mount
  useEffect(() => {
    loadPuzzle();
  }, []);

  // Start timer
  useEffect(() => {
    if (!startTime) {
      setStartTime(Date.now());
    }
    const interval = setInterval(() => {
      if (startTime) {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  async function loadPuzzle() {
    try {
      setLoading(true);
      const response = await fetch('/api/puzzle/today');
      if (!response.ok) throw new Error('Failed to load puzzle');
      const data = await response.json();
      setPuzzle(data);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      showModal('❌', 'Error', 'Failed to load puzzle. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  function showModal(icon, title, message, timeStr = null) {
    setModal({ visible: true, icon, title, message, timeStr });
  }

  function hideModal() {
    setModal({ visible: false, icon: '', title: '', message: '', timeStr: null });
    setCopyButtonText('Copy');
  }

  function handleCopy() {
    if (modal.timeStr) {
      const copyText = `I just completed Quinta in ${modal.timeStr}! https://quinta.pl`;
      navigator.clipboard.writeText(copyText).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
      }).catch(err => console.error('Failed to copy:', err));
    }
  }

  function validatePuzzle(currentGridData) {
    if (!puzzle) return false;

    // Check across words (rows 0-4)
    for (let row = 0; row < puzzle.across_words.length; row++) {
      const across = puzzle.across_words[row];
      for (let col = 0; col < across.word.length; col++) {
        if (currentGridData[row][col].toUpperCase() !== across.word[col].toUpperCase()) {
          return false;
        }
      }
    }

    // Check down words (rows 0-4)
    for (let col = 0; col < puzzle.down_words.length; col++) {
      const down = puzzle.down_words[col];
      for (let row = 0; row < down.word.length; row++) {
        if (currentGridData[row][col].toUpperCase() !== down.word[row].toUpperCase()) {
          return false;
        }
      }
    }

    // Check plusword (row 5)
    const pluswordFromGrid = currentGridData[5].join('');
    if (pluswordFromGrid.toUpperCase() !== puzzle.plusword.toUpperCase()) {
      return false;
    }

    return true;
  }

  // Check for completion whenever grid changes
  useEffect(() => {
    // Don't check if modal is already visible, puzzle not loaded, or result already shown
    if (!puzzle || modal.visible || hasShownResult) return;

    const allGridFilled = gridData.every(row => row.every(cell => cell !== ''));

    if (allGridFilled) {
      const success = validatePuzzle(gridData);

      if (success) {
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        showModal('🎉', 'Congratulations!', `You solved the puzzle in ${timeStr}!`, timeStr);
        setHasShownResult(true);
      } else {
        showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
        setHasShownResult(true);
      }
    }
  }, [gridData, puzzle, modal.visible, elapsed, hasShownResult]);

  function handleGridCellChange(row, col, value) {
    const newGridData = gridData.map(r => [...r]);
    newGridData[row][col] = value.toUpperCase();
    setGridData(newGridData);
    // Reset the flag when user makes changes after seeing a result
    if (hasShownResult) {
      setHasShownResult(false);
    }
  }

  function focusCell(row, col) {
    if (cellRefsFromGrid.current) {
      const key = `${row}-${col}`;
      cellRefsFromGrid.current[key]?.focus();
    }
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (loading) {
    return html`
      <div class="max-w-7xl mx-auto">
        <${Header} puzzleNumber="1328" />
        <div class="flex items-center justify-center min-h-[400px]">
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <p class="text-gray-600 text-lg">Loading puzzle...</p>
          </div>
        </div>
      </div>
    `;
  }

  return html`
    <div class="max-w-7xl mx-auto">
      <${Header} puzzleNumber="1328" />

      <main class="max-w-7xl mx-auto">
        <div class="grid md:grid-cols-2 gap-8 items-start">
          <div class="flex flex-col items-center justify-center md:justify-start">
            <${CrosswordGrid}
              gridData=${gridData}
              puzzle=${puzzle}
              currentMode=${currentMode}
              activeCell=${activeCell}
              onCellChange=${handleGridCellChange}
              onCellFocus=${(row, col) => {
      setActiveCell({ row, col });
    }}
              onCellClick=${(row, col) => {
      if (prevActiveOnMouseDown && prevActiveOnMouseDown.row === row && prevActiveOnMouseDown.col === col) {
        setCurrentMode(currentMode === 'across' ? 'down' : 'across');
      }
      setPrevActiveOnMouseDown({ row, col });
      setActiveCell({ row, col });
    }}
              setCurrentMode=${setCurrentMode}
              cellRefsFromGrid=${cellRefsFromGrid}
            />
            ${activeCell.row !== null && activeCell.row !== 5 && html`
              <div class="w-full flex justify-center">
                <div class="bg-gray-100 rounded-lg px-4 py-2" style="width: min(90vw, 400px);">
                  <${SelectedClue} puzzle=${puzzle} activeCell=${activeCell} currentMode=${currentMode} />
                </div>
              </div>
            `}

            <div class="mt-6 text-gray-600 font-mono text-xl">${timerDisplay}</div>
          </div>

          <${Clues}
            puzzle=${puzzle}
            onClueClick=${(orientation, position) => {
      setCurrentMode(orientation);
      if (orientation === 'across') {
        setActiveCell({ row: position, col: 0 });
        // Focus the first cell of the across word after a short delay
        setTimeout(() => focusCell(position, 0), 0);
      } else {
        setActiveCell({ row: 0, col: position });
        // Focus the first cell of the down word after a short delay
        setTimeout(() => focusCell(0, position), 0);
      }
    }}
            activeCell=${activeCell}
            currentMode=${currentMode}
          />
        </div>
      </main>

      <${Modal}
        visible=${modal.visible}
        icon=${modal.icon}
        title=${modal.title}
        message=${modal.message}
        timeStr=${modal.timeStr}
        copyButtonText=${copyButtonText}
        onClose=${hideModal}
        onCopy=${handleCopy}
      />
    </div>
  `;
}

function Header({ puzzleNumber }) {
  return html`
    <header class="text-center py-6">
      <div class="inline-block bg-gray-900 text-white px-8 py-3 rounded-lg mb-4">
        <h1 class="text-2xl font-bold tracking-wider">QUINTA NO. ${puzzleNumber}</h1>
      </div>
    </header>
  `;
}

function CrosswordGrid({ gridData, puzzle, currentMode, activeCell, onCellChange, onCellFocus, onCellClick, setCurrentMode, cellRefsFromGrid }) {
  const cellRefs = useRef({});

  // Share cellRefs with parent component
  useEffect(() => {
    if (cellRefsFromGrid) {
      cellRefsFromGrid.current = cellRefs.current;
    }
  }, [cellRefsFromGrid]);

  function getHintClass(row, col) {
    if (!puzzle || row === 5) return ''; // No hints for plusword row

    let hint = null;

    if (puzzle.hints && puzzle.hints[row][col]) {
      hint = puzzle.hints[row][col];
    }

    if (!hint) return '';
    const hintStr = String(hint).toLowerCase();
    if (hintStr.startsWith('g')) return 'hint-green';
    if (hintStr.startsWith('y')) return 'hint-yellow';
    return '';
  }

  function getBorderStyle(row, col) {
    if (activeCell.row === null || activeCell.col === null) return {};

    const style = {};

    // For plusword (row 5), highlight all cells
    if (row === 5 && activeCell.row === 5) {
      style.borderTop = '3px solid black';
      style.borderBottom = '3px solid black';
      if (col === 0) style.borderLeft = '3px solid black';
      if (col === 4) style.borderRight = '3px solid black';
    } else if (row !== 5) {
      // Regular grid behavior (rows 0-4)
      if (currentMode === 'across' && activeCell.row === row) {
        style.borderTop = '3px solid black';
        style.borderBottom = '3px solid black';
        if (col === 0) style.borderLeft = '3px solid black';
        if (col === 4) style.borderRight = '3px solid black';
      } else if (currentMode === 'down' && activeCell.col === col) {
        style.borderLeft = '3px solid black';
        style.borderRight = '3px solid black';
        if (row === 0) style.borderTop = '3px solid black';
        if (row === 4) style.borderBottom = '3px solid black';
      }
    }

    return style;
  }

  function handleKeyDown(e, row, col) {
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
      onCellChange(row, col, e.key);

      // Auto-advance
      if (row === 5) {
        // Plusword row - move right
        if (col < 4) {
          cellRefs.current[`${row}-${col + 1}`]?.focus();
        }
      } else if (currentMode === 'across') {
        if (col < 4) {
          const key = `${row}-${col + 1}`;
          cellRefs.current[key]?.focus();
        } else if (row < 4) {
          const key = `${row + 1}-0`;
          cellRefs.current[key]?.focus();
        } else {
          // At last cell of grid (row 4, col 4), move to plusword
          cellRefs.current[`5-0`]?.focus();
        }
      } else {
        if (row < 4) {
          const key = `${row + 1}-${col}`;
          cellRefs.current[key]?.focus();
        } else if (col < 4) {
          const key = `0-${col + 1}`;
          cellRefs.current[key]?.focus();
        } else {
          // At last cell of grid, move to plusword
          cellRefs.current[`5-0`]?.focus();
        }
      }

      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        if (col < 4) {
          e.preventDefault();
          if (row !== 5) setCurrentMode('across');
          cellRefs.current[`${row}-${col + 1}`]?.focus();
        }
        break;
      case 'ArrowLeft':
        if (col > 0) {
          e.preventDefault();
          if (row !== 5) setCurrentMode('across');
          cellRefs.current[`${row}-${col - 1}`]?.focus();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (row < 5) {
          if (row < 4) {
            setCurrentMode('down');
          } else {
            setCurrentMode('across');
          }
          cellRefs.current[`${row + 1}-${col}`]?.focus();
        }
        break;
      case 'ArrowUp':
        if (row > 0) {
          e.preventDefault();
          if (row <= 5) setCurrentMode('down');
          cellRefs.current[`${row - 1}-${col}`]?.focus();
        }
        break;
      case 'Backspace':
        e.preventDefault();
        const currentValue = gridData[row][col];

        // If current cell is empty, move back and delete previous cell
        if (!currentValue) {
          if (row === 5) {
            // Plusword row - move left
            if (col > 0) {
              onCellChange(row, col - 1, '');
              cellRefs.current[`${row}-${col - 1}`]?.focus();
            } else {
              // Move to last cell of regular grid
              onCellChange(4, 4, '');
              cellRefs.current[`4-4`]?.focus();
            }
          } else if (currentMode === 'across') {
            if (col > 0) {
              onCellChange(row, col - 1, '');
              cellRefs.current[`${row}-${col - 1}`]?.focus();
            } else if (row > 0) {
              onCellChange(row - 1, 4, '');
              cellRefs.current[`${row - 1}-4`]?.focus();
            }
          } else {
            if (row > 0) {
              onCellChange(row - 1, col, '');
              cellRefs.current[`${row - 1}-${col}`]?.focus();
            } else if (col > 0) {
              onCellChange(4, col - 1, '');
              cellRefs.current[`4-${col - 1}`]?.focus();
            }
          }
        } else {
          // If current cell has value, just delete it (stay in place)
          onCellChange(row, col, '');
        }
        break;
    }
  }

  const regularCells = [];
  // Regular grid cells (rows 0-4)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const key = `${row}-${col}`;
      const hintClass = getHintClass(row, col);
      const borderStyle = getBorderStyle(row, col);
      const isActive = activeCell.row === row && activeCell.col === col;

      regularCells.push(html`
        <div class="cell-wrapper relative" key=${key}>
          ${col === 0 && html`<div class="cell-number">${row + 1}</div>`}
          ${row === 0 && col > 0 && html`<div class="cell-number">${col + 1}</div>`}
          <input
            ref=${el => cellRefs.current[key] = el}
            type="text"
            maxLength="1"
            value=${gridData[row][col]}
            class="w-full h-full text-center text-2xl md:text-3xl font-bold uppercase bg-white border border-black focus:outline-none ${hintClass} ${isActive ? 'hatch' : ''}"
            style=${{ caretColor: 'transparent', ...borderStyle }}
            data-row=${row}
            data-col=${col}
            onKeyDown=${(e) => handleKeyDown(e, row, col)}
            onFocus=${() => onCellFocus(row, col)}
            onClick=${() => onCellClick(row, col)}
            onTouchStart=${(e) => { e.preventDefault(); cellRefs.current[key]?.focus(); }}
          />
        </div>
      `);
    }
  }

  // Plusword cells (row 5)
  const pluswordCells = [];
  for (let col = 0; col < 5; col++) {
    const key = `5-${col}`;
    const borderStyle = getBorderStyle(5, col);
    const isActive = activeCell.row === 5 && activeCell.col === col;

    pluswordCells.push(html`
      <input
        key=${key}
        ref=${el => cellRefs.current[key] = el}
        type="text"
        maxLength="1"
        value=${gridData[5][col]}
        class="w-full h-full text-center text-3xl font-bold uppercase bg-white border border-black focus:outline-none ${isActive ? 'hatch' : ''}"
        style=${{ caretColor: 'transparent', ...borderStyle }}
        data-row="5"
        data-col=${col}
        onInput=${(e) => {
        // Prevent input changes - we handle everything in onKeyDown
        e.preventDefault();
        e.stopPropagation();
        const currentVal = gridData[5][col];
        if (e.target.value !== currentVal) {
          e.target.value = currentVal;
        }
      }}
        onKeyDown=${(e) => handleKeyDown(e, 5, col)}
        onFocus=${() => onCellFocus(5, col)}
        onClick=${() => onCellClick(5, col)}
      />
    `);
  }

  return html`
    <div class="flex flex-col items-center gap-8 mb-8">
      <div class="crossword-grid inline-grid grid-cols-5 gap-0 border-2 border-black">
        ${regularCells}
      </div>
      <div class="w-full flex justify-center">
        <div class="h-20 plusword-grid inline-grid grid-cols-5 gap-0 border-2 border-black" style="width: min(90vw, 400px);">
          ${pluswordCells}
        </div>
      </div>
    </div>
  `;
}

function SelectedClue({ puzzle, activeCell, currentMode }) {
  if (!puzzle || activeCell.row === null || activeCell.col === null) {
    return html`<p class="text-lg font-semibold text-gray-800 mt-4 text-center"></p>`;
  }

  let clueText = '';
  if (currentMode === 'across' && puzzle.across_words?.[activeCell.row]) {
    clueText = `${activeCell.row + 1}. ${puzzle.across_words[activeCell.row].clue}`;
  } else if (currentMode === 'down' && puzzle.down_words?.[activeCell.col]) {
    clueText = `${activeCell.col + 1}. ${puzzle.down_words[activeCell.col].clue}`;
  }

  return html`
    <p class="text-lg font-semibold text-gray-800 mt-4 text-center">${clueText}</p>
  `;
}

function Clues({ puzzle, onClueClick, activeCell, currentMode }) {
  if (!puzzle) return null;

  return html`
    <div class="space-y-6 hidden md:block">
      <div>
        <h2 class="text-2xl font-bold mb-4">Across</h2>
        <div class="space-y-2">
          ${puzzle.across_words.map((wordData, index) => {
    const isActive = currentMode === 'across' && activeCell.row === index;
    return html`
              <div
                key=${index}
                class="p-2 hover:bg-gray-100 rounded cursor-pointer ${isActive ? 'bg-blue-200 font-bold' : ''}"
                onClick=${() => onClueClick('across', index)}
              >
                <span class="font-bold mr-2">${index + 1}.</span>
                <span>${wordData.clue}</span>
              </div>
            `;
  })}
        </div>
      </div>
      <div>
        <h2 class="text-2xl font-bold mb-4">Down</h2>
        <div class="space-y-2">
          ${puzzle.down_words.map((wordData, index) => {
    const isActive = currentMode === 'down' && activeCell.col === index;
    return html`
              <div
                key=${index}
                class="p-2 hover:bg-gray-100 rounded cursor-pointer ${isActive ? 'bg-blue-200 font-bold' : ''}"
                onClick=${() => onClueClick('down', index)}
              >
                <span class="font-bold mr-2">${index + 1}.</span>
                <span>${wordData.clue}</span>
              </div>
            `;
  })}
        </div>
      </div>
    </div>
  `;
}

function Modal({ visible, icon, title, message, timeStr, copyButtonText, onClose, onCopy }) {
  useEffect(() => {
    if (!visible) return;

    const handleKeyOrClick = (e) => {
      // Ignore clicks on the modal content itself
      if (e.type === 'click' && e.target.closest('.modal-content')) {
        return;
      }
      onClose();
    };

    // Add a small delay to avoid catching the event that triggered the modal
    const timeoutId = setTimeout(() => {
      window.addEventListener('keydown', handleKeyOrClick);
      window.addEventListener('click', handleKeyOrClick);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('keydown', handleKeyOrClick);
      window.removeEventListener('click', handleKeyOrClick);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return html`
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: flex;">
      <div class="modal-content bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div class="text-center">
          <div class="text-6xl mb-4">${icon}</div>
          <h2 class="text-2xl font-bold mb-2">${title}</h2>
          <p class="text-gray-600 mb-6">${message}</p>
          <div class="flex gap-3 justify-center">
            ${timeStr && html`
              <button
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full transition"
                onClick=${(e) => { e.stopPropagation(); onCopy(); }}
              >
                ${copyButtonText}
              </button>
            `}
            <button
              class="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded-full transition"
              onClick=${onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render the app
render(html`<${App} />`, document.getElementById('root'));
