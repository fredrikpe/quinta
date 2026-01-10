import { h, render } from "https://esm.sh/preact";
import { useState, useEffect, useRef } from "https://esm.sh/preact/hooks";
import htm from "https://esm.sh/htm";

const html = htm.bind(h);

// Main App Component
function App() {
  const [puzzle, setPuzzle] = useState(null);
  const [gridData, setGridData] = useState(Array(5).fill().map(() => Array(5).fill('')));
  const [pluswordData, setPluswordData] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [currentMode, setCurrentMode] = useState('across');
  const [activeCell, setActiveCell] = useState({ row: null, col: null });
  const [activePluswordIndex, setActivePluswordIndex] = useState(null);
  const [prevActiveOnMouseDown, setPrevActiveOnMouseDown] = useState(null);
  const [modal, setModal] = useState({ visible: false, icon: '', title: '', message: '', timeStr: null });
  const [copyButtonText, setCopyButtonText] = useState('Copy');

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
      const response = await fetch('/api/puzzle/today');
      if (!response.ok) throw new Error('Failed to load puzzle');
      const data = await response.json();
      setPuzzle(data);
    } catch (error) {
      console.error('Error loading puzzle:', error);
      showModal('❌', 'Error', 'Failed to load puzzle. Please refresh the page.');
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
      const copyText = `I completed Quinta in ${modal.timeStr}`;
      navigator.clipboard.writeText(copyText).then(() => {
        setCopyButtonText('Copied!');
        setTimeout(() => setCopyButtonText('Copy'), 2000);
      }).catch(err => console.error('Failed to copy:', err));
    }
  }

  function validatePuzzle() {
    if (!puzzle) return false;

    // Check across words
    for (let row = 0; row < puzzle.across_words.length; row++) {
      const across = puzzle.across_words[row];
      for (let col = 0; col < across.word.length; col++) {
        if (gridData[row][col].toUpperCase() !== across.word[col].toUpperCase()) {
          return false;
        }
      }
    }

    // Check down words
    for (let col = 0; col < puzzle.down_words.length; col++) {
      const down = puzzle.down_words[col];
      for (let row = 0; row < down.word.length; row++) {
        if (gridData[row][col].toUpperCase() !== down.word[row].toUpperCase()) {
          return false;
        }
      }
    }

    // Check plusword
    if (pluswordData.toUpperCase() !== puzzle.plusword.toUpperCase()) {
      return false;
    }

    return true;
  }

  function checkIfComplete() {
    const allGridFilled = gridData.every(row => row.every(cell => cell !== ''));
    const pluswordFilled = pluswordData.length === 5;

    console.log(allGridFilled, pluswordData)

    if (allGridFilled && pluswordFilled) {
      const success = validatePuzzle();

      if (success) {
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        showModal('🎉', 'Congratulations!', `You solved the puzzle in ${timeStr}!`, timeStr);
      } else {
        showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
      }
    }
  }

  function handleGridCellChange(row, col, value) {
    const newGridData = gridData.map(r => [...r]);
    newGridData[row][col] = value.toUpperCase();
    setGridData(newGridData);
  }

  function handlePluswordChange(index, value, shouldCheckComplete = false) {
    const cells = pluswordData.split('');
    while (cells.length < 5) cells.push('');
    cells[index] = value.toUpperCase();
    const newPluswordData = cells.join('').slice(0, 5);
    setPluswordData(newPluswordData);

    // If we should check complete, do it with the new value
    if (shouldCheckComplete) {
      setTimeout(() => {
        const allGridFilled = gridData.every(row => row.every(cell => cell !== ''));
        const pluswordFilled = newPluswordData.length === 5;

        if (allGridFilled && pluswordFilled) {
          // Validate using the new plusword data
          if (!puzzle) return;

          // Check across words
          for (let row = 0; row < puzzle.across_words.length; row++) {
            const across = puzzle.across_words[row];
            for (let col = 0; col < across.word.length; col++) {
              if (gridData[row][col].toUpperCase() !== across.word[col].toUpperCase()) {
                showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
                return;
              }
            }
          }

          // Check down words
          for (let col = 0; col < puzzle.down_words.length; col++) {
            const down = puzzle.down_words[col];
            for (let row = 0; row < down.word.length; row++) {
              if (gridData[row][col].toUpperCase() !== down.word[row].toUpperCase()) {
                showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
                return;
              }
            }
          }

          // Check plusword with new data
          if (newPluswordData.toUpperCase() !== puzzle.plusword.toUpperCase()) {
            showModal('❌', 'Not Quite!', 'At least one letter is wrong. Keep trying!');
            return;
          }

          // Success!
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
          showModal('🎉', 'Congratulations!', `You solved the puzzle in ${timeStr}!`, timeStr);
        }
      }, 0);
    }
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

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
                setActivePluswordIndex(null);
              }}
              onCellClick=${(row, col) => {
      if (prevActiveOnMouseDown && prevActiveOnMouseDown.row === row && prevActiveOnMouseDown.col === col) {
        setCurrentMode(currentMode === 'across' ? 'down' : 'across');
      }
      setPrevActiveOnMouseDown({ row, col });
      setActiveCell({ row, col });
      setActivePluswordIndex(null);
    }}
              onComplete=${checkIfComplete}
              setCurrentMode=${setCurrentMode}
            />

            <div class="w-full flex justify-center">
              <div class="bg-gray-100 rounded-lg" style="width: min(90vw, 400px);">
                <${PluswordInput}
                  pluswordData=${pluswordData}
                  onChange=${handlePluswordChange}
                  activePluswordIndex=${activePluswordIndex}
                  onFocus=${(index) => {
                    setActivePluswordIndex(index);
                    setActiveCell({ row: null, col: null });
                  }}
                />
                <${SelectedClue} puzzle=${puzzle} activeCell=${activeCell} currentMode=${currentMode} />
              </div>
            </div>

            <div class="mt-6 text-gray-600 font-mono text-xl">${timerDisplay}</div>
          </div>

          <${Clues} puzzle=${puzzle} onClueClick=${(orientation, position) => {
      setCurrentMode(orientation);
      if (orientation === 'across') {
        setActiveCell({ row: position, col: 0 });
      } else {
        setActiveCell({ row: 0, col: position });
      }
    }} activeCell=${activeCell} currentMode=${currentMode} />
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

function CrosswordGrid({ gridData, puzzle, currentMode, activeCell, onCellChange, onCellFocus, onCellClick, onComplete, setCurrentMode }) {
  const cellRefs = useRef({});

  function getHintClass(row, col) {
    if (!puzzle) return '';

    let hint = null;

    // Check across hints
    if (puzzle.across_words && puzzle.across_words[row]) {
      const acrossHint = puzzle.across_words[row].hints?.[col];
      if (acrossHint) hint = acrossHint;
    }

    // Check down hints (may override)
    if (puzzle.down_words && puzzle.down_words[col]) {
      const downHint = puzzle.down_words[col].hints?.[row];
      if (downHint) hint = downHint;
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

    return style;
  }

  function handleKeyDown(e, row, col) {
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
      onCellChange(row, col, e.key);

      // Auto-advance
      if (currentMode === 'across') {
        if (col < 4) {
          const key = `${row}-${col + 1}`;
          cellRefs.current[key]?.focus();
        } else if (row < 4) {
          const key = `${row + 1}-0`;
          cellRefs.current[key]?.focus();
        }
      } else {
        if (row < 4) {
          const key = `${row + 1}-${col}`;
          cellRefs.current[key]?.focus();
        } else if (col < 4) {
          const key = `0-${col + 1}`;
          cellRefs.current[key]?.focus();
        }
      }

      setTimeout(onComplete, 0);
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        if (col < 4) {
          e.preventDefault();
          setCurrentMode('across');
          cellRefs.current[`${row}-${col + 1}`]?.focus();
        }
        break;
      case 'ArrowLeft':
        if (col > 0) {
          e.preventDefault();
          setCurrentMode('across');
          cellRefs.current[`${row}-${col - 1}`]?.focus();
        }
        break;
      case 'ArrowDown':
        if (row < 4) {
          e.preventDefault();
          setCurrentMode('down');
          cellRefs.current[`${row + 1}-${col}`]?.focus();
        }
        break;
      case 'ArrowUp':
        if (row > 0) {
          e.preventDefault();
          setCurrentMode('down');
          cellRefs.current[`${row - 1}-${col}`]?.focus();
        }
        break;
      case 'Backspace':
        e.preventDefault();
        onCellChange(row, col, '');

        if (currentMode === 'across') {
          if (col > 0) {
            cellRefs.current[`${row}-${col - 1}`]?.focus();
          } else if (row > 0) {
            const prevCell = cellRefs.current[`${row - 1}-4`];
            if (prevCell) {
              onCellChange(row - 1, 4, '');
              prevCell.focus();
            }
          }
        } else {
          if (row > 0) {
            cellRefs.current[`${row - 1}-${col}`]?.focus();
          } else if (col > 0) {
            const prevCell = cellRefs.current[`4-${col - 1}`];
            if (prevCell) {
              onCellChange(4, col - 1, '');
              prevCell.focus();
            }
          }
        }
        break;
    }
  }

  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const key = `${row}-${col}`;
      const hintClass = getHintClass(row, col);
      const borderStyle = getBorderStyle(row, col);
      const isActive = activeCell.row === row && activeCell.col === col;

      cells.push(html`
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

  return html`
    <div class="crossword-grid inline-grid grid-cols-5 gap-0 border-2 border-black mb-8">
      ${cells}
    </div>
  `;
}

function PluswordInput({ pluswordData, onChange, activePluswordIndex, onFocus }) {
  const cellRefs = useRef([]);

  function handleKeyDown(e, index) {
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      e.preventDefault();
      const shouldCheck = index === 4; // Check if complete when entering last cell
      onChange(index, e.key, shouldCheck);
      if (index < 4) {
        cellRefs.current[index + 1]?.focus();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowRight':
        if (index < 4) {
          e.preventDefault();
          cellRefs.current[index + 1]?.focus();
        }
        break;
      case 'ArrowLeft':
        if (index > 0) {
          e.preventDefault();
          cellRefs.current[index - 1]?.focus();
        }
        break;
      case 'Backspace':
        e.preventDefault();
        const currentValue = pluswordData[index] || '';
        if (!currentValue && index > 0) {
          onChange(index - 1, '');
          cellRefs.current[index - 1]?.focus();
        } else {
          onChange(index, '');
        }
        break;
    }
  }

  function getBorderStyle(index) {
    if (activePluswordIndex === null) return {};

    const style = {};
    // Apply thicker border to all cells in plusword when any is active
    style.borderTop = '3px solid black';
    style.borderBottom = '3px solid black';
    if (index === 0) style.borderLeft = '3px solid black';
    if (index === 4) style.borderRight = '3px solid black';

    return style;
  }

  const cells = [];
  for (let i = 0; i < 5; i++) {
    const borderStyle = getBorderStyle(i);
    const isActive = activePluswordIndex === i;

    cells.push(html`
      <input
        key=${i}
        ref=${el => cellRefs.current[i] = el}
        type="text"
        maxLength="1"
        value=${pluswordData[i] || ''}
        class="w-full h-full text-center text-3xl font-bold uppercase bg-white border border-black focus:outline-none ${isActive ? 'hatch' : ''}"
        style=${{ caretColor: 'transparent', ...borderStyle }}
        data-plusword-index=${i}
        onKeyDown=${(e) => handleKeyDown(e, i)}
        onFocus=${() => onFocus(i)}
      />
    `);
  }

  return html`
    <div class="h-20 plusword-grid inline-grid grid-cols-5 gap-0 border-2 border-black mb-8">
      ${cells}
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
    const isActive = currentMode === 'across' && activeCell.row === wordData.position;
    return html`
              <div
                key=${index}
                class="p-2 hover:bg-gray-100 rounded cursor-pointer ${isActive ? 'bg-blue-200 font-bold' : ''}"
                onClick=${() => onClueClick('across', wordData.position)}
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
    const isActive = currentMode === 'down' && activeCell.col === wordData.position;
    return html`
              <div
                key=${index}
                class="p-2 hover:bg-gray-100 rounded cursor-pointer ${isActive ? 'bg-blue-200 font-bold' : ''}"
                onClick=${() => onClueClick('down', wordData.position)}
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
      onClose();
    };

    window.addEventListener('keydown', handleKeyOrClick, { capture: true });
    window.addEventListener('click', handleKeyOrClick, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyOrClick, { capture: true });
      window.removeEventListener('click', handleKeyOrClick, { capture: true });
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return html`
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: flex;">
      <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
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
