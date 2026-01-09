# Puzzle Fetcher

This script fetches Telegraph Plusword puzzles from lettersolver.com and converts them to valid JSON format.

## Requirements

- `curl` - for fetching web pages
- `rg` (ripgrep) - for pattern matching (install via `brew install ripgrep` on macOS)
- `sed` - for text transformation (standard on Unix systems)

## Usage

Fetch puzzles for the last N days (default: 30):

```bash
./fetch_puzzles.sh [DAYS]
```

### Examples

Fetch last 7 days:
```bash
./fetch_puzzles.sh 7
```

Fetch last 30 days (default):
```bash
./fetch_puzzles.sh
```

Fetch last 100 days:
```bash
./fetch_puzzles.sh 100
```

## Output

The script creates a `puzzles.json` file with the following structure:

```json
[
  {
    "date": "2026-01-09",
    "clues": [
      {
        "clue": "Dutch cheese",
        "slug": "dutch-cheese",
        "word": "GOUDA",
        "dir": "across",
        "num": 1
      },
      ...
    ]
  },
  ...
]
```

## Importing to Database

After fetching puzzles, import them to SQLite database:

```bash
cargo run --bin import_puzzles
```

This will:
- Read `puzzles.json`
- Create `quinta.db` with two tables:
  - `clue_word_pairs` - All word/clue combinations
  - `puzzles` - Complete daily puzzles with 5 across, 5 down, and plusword
- Show import summary with success/skip counts

### Database Schema

**clue_word_pairs table:**
- `id` - Primary key
- `word` - The answer word (5 letters)
- `clue` - The clue text
- `slug` - URL-friendly clue identifier
- `created_at` - Timestamp

**puzzles table:**
- `id` - Primary key
- `date` - Puzzle date (YYYY-MM-DD)
- `plusword` - The bonus word solution
- `across_words` - JSON array of 5 across words
- `down_words` - JSON array of 5 down words
- `created_at` - Timestamp

## Complete Workflow

1. Fetch puzzles from the web:
   ```bash
   ./fetch_puzzles.sh 30
   ```

2. Import to database:
   ```bash
   cargo run --bin import_puzzles
   ```

3. The database is now ready to use with the Quinta game!

## Notes

- The script includes a 1-second delay between requests to be respectful to the server
- Not all dates may have puzzles available
- The script works on both macOS and Linux
- Progress is shown for each date being fetched
- The importer expects exactly 6 across clues (5 regular + 1 plusword) and 5 down clues
- Puzzles that don't match this format will be skipped
