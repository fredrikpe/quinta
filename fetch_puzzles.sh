#!/bin/bash

# Number of days to go back (default: 30)
DAYS=${1:-30}

# Output file
OUTPUT_FILE="puzzles.json"

echo "Fetching puzzles from the last $DAYS days..."
echo "[" > "$OUTPUT_FILE"

# Start from today
current_date=$(date +%Y-%m-%d)

for ((i=0; i<DAYS; i++)); do
    # Calculate date (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        puzzle_date=$(date -v-${i}d +%Y-%m-%d)
    else
        # Linux
        puzzle_date=$(date -d "$current_date -$i days" +%Y-%m-%d)
    fi

    echo "Fetching puzzle for $puzzle_date..."

    # Fetch and extract the puzzle data
    puzzle_data=$(curl -s "https://lettersolver.com/crosswords/telegraph-plusword/$puzzle_date/" | \
        rg 'recentSourceClues' | \
        rg 'items:\[.*' -o | \
        rg '\[.*?\]' -o | \
        head -n 1)

    if [ -n "$puzzle_data" ]; then
        # Convert JavaScript object notation to valid JSON
        # Replace unquoted keys with quoted keys
        json_data=$(echo "$puzzle_data" | \
            sed 's/\([a-zA-Z_][a-zA-Z0-9_]*\):/"\1":/g' | \
            sed "s/'/\"/g")

        # Add the date and data to output
        if [ $i -gt 0 ]; then
            echo "," >> "$OUTPUT_FILE"
        fi

        echo "  {" >> "$OUTPUT_FILE"
        echo "    \"date\": \"$puzzle_date\"," >> "$OUTPUT_FILE"
        echo "    \"clues\": $json_data" >> "$OUTPUT_FILE"
        echo -n "  }" >> "$OUTPUT_FILE"

        echo "  ✓ Found puzzle for $puzzle_date"
    else
        echo "  ✗ No puzzle found for $puzzle_date"
    fi

    # Be nice to the server
    sleep 1
done

echo "" >> "$OUTPUT_FILE"
echo "]" >> "$OUTPUT_FILE"

echo ""
echo "Done! Puzzles saved to $OUTPUT_FILE"
