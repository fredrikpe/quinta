# Quinta

A daily crossword puzzle game inspired by Telegraph's Plusword. Built with Rust and vanilla JavaScript.

## Features

- Daily 5x5 crossword puzzle
- Tailwind CSS styling with responsive design
- Hard-coded puzzle (no database required)
- Simple and clean user interface
- Arrow key navigation
- Real-time answer validation

## Quick Start

1. Build and run the server:
```bash
cargo run
```

2. Open your browser and visit:
```
http://localhost:8080
```

## How to Play

1. Read the ACROSS and DOWN clues
2. Fill in the 5x5 grid with your answers
3. Use arrow keys to navigate between cells
4. Click "Check Answers" to validate your solution
5. Incorrect cells will be highlighted in red
6. Correct solution will show green highlighting

## Project Structure

```
quinta/
├── src/
│   ├── main.rs       # Server, API endpoints, and hard-coded puzzle
│   └── models.rs     # Data structures
├── static/
│   ├── index.html    # Game interface (with Tailwind CSS)
│   └── game.js       # Frontend logic
├── claude.md         # Detailed architecture docs
├── Cargo.toml        # Rust dependencies
└── README.md         # This file
```

## API Endpoints

- `GET /` - Main game page
- `GET /api/puzzle/today` - Get today's puzzle with clues
- `POST /api/puzzle/check` - Validate user answers

## Tech Stack

- **Backend**: Rust + Actix-web
- **Frontend**: Vanilla HTML/JavaScript + Tailwind CSS (CDN)
- **Database**: SQLite (optional, for storing multiple puzzles)
- **Current setup**: Hard-coded puzzle in the backend

## Puzzle Management

Quinta includes tools to fetch and import Telegraph Plusword puzzles:

### Fetch Puzzles

Fetch puzzles from lettersolver.com:
```bash
./fetch_puzzles.sh 30  # Fetch last 30 days
```

### Import to Database

Import fetched puzzles to SQLite:
```bash
cargo run --bin import_puzzles
```

This creates `quinta.db` with:
- **clue_word_pairs** table - All word/clue combinations
- **puzzles** table - Complete daily puzzles (5 across + 5 down + plusword)

See [PUZZLE_FETCHER.md](PUZZLE_FETCHER.md) for detailed instructions.

## Development

See `claude.md` for detailed architecture documentation and future enhancement ideas.
