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

## Notes

- The script includes a 1-second delay between requests to be respectful to the server
- Not all dates may have puzzles available
- The script works on both macOS and Linux
- Progress is shown for each date being fetched
