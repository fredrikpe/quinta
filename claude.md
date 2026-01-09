# Quinta - Plusword Clone

A daily crossword puzzle game inspired by Telegraph's Plusword, built with Rust and static HTML.

## Architecture

### Backend (Rust + Actix-web)
- **Framework**: Actix-web for HTTP server
- **Data**: Hard-coded puzzle (no database)
- **No authentication**: Simple landing page with daily puzzle

### Frontend (Static HTML/JS with Tailwind CSS)
- Single page application served as static files
- Tailwind CSS from CDN for styling
- Vanilla JavaScript for game logic
- Responsive design for mobile and desktop

## Game Rules (Plusword Style)

- 5x5 grid crossword
- Daily puzzle with both ACROSS and DOWN clues
- Players fill in the grid based on clues
- Shared letters between across and down words
- One puzzle per day, same for all players

## API Endpoints

- `GET /` - Serve static HTML page
- `GET /api/puzzle/today` - Get today's puzzle with clues (hard-coded)
- `POST /api/puzzle/check` - Validate user's answers

## Development Setup

1. Install Rust (rustup)
2. Run `cargo build`
3. Run server: `cargo run`
4. Access at `http://localhost:8080`

## File Structure

```
quinta/
├── src/
│   ├── main.rs           # Entry point, server setup, hard-coded puzzle
│   └── models.rs         # Data structures
├── static/
│   ├── index.html        # Main game page (Tailwind CSS)
│   └── game.js           # Game logic
└── Cargo.toml
```

## Current Puzzle

The puzzle is hard-coded in `src/main.rs`:
- BEACH / EARTH / ANGLE / CHANT / HEART (both across and down)

## Future Enhancements
- Database for multiple puzzles
- Daily puzzle rotation
- User accounts and login
- Score tracking
- Streak counting
- Puzzle archive
- Hint system
