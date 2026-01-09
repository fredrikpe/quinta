use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
struct FetchedClue {
    clue: String,
    slug: String,
    word: String,
    dir: String,
    num: i32,
}

#[derive(Debug, Deserialize)]
struct FetchedPuzzle {
    date: String,
    clues: Vec<FetchedClue>,
}

fn init_database(conn: &Connection) -> Result<()> {
    // Table for word-clue pairs
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clue_word_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            clue TEXT NOT NULL,
            slug TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(word, clue)
        )",
        [],
    )?;

    // Table for complete puzzles
    conn.execute(
        "CREATE TABLE IF NOT EXISTS puzzles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            plusword TEXT NOT NULL,
            across_words TEXT NOT NULL,
            down_words TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    Ok(())
}

fn extract_plusword(clues: &[FetchedClue]) -> Option<String> {
    clues
        .iter()
        .find(|c| c.clue.to_lowercase().contains("plusword") && c.clue.contains("solution"))
        .map(|c| c.word.clone())
}

fn insert_clue_word_pair(conn: &Connection, word: &str, clue: &str, slug: &str) -> Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO clue_word_pairs (word, clue, slug) VALUES (?1, ?2, ?3)",
        [word, clue, slug],
    )?;
    Ok(())
}

fn insert_puzzle(
    conn: &Connection,
    date: &str,
    plusword: &str,
    across_words: &[String],
    down_words: &[String],
) -> Result<()> {
    let across_json = serde_json::to_string(across_words).unwrap();
    let down_json = serde_json::to_string(down_words).unwrap();

    conn.execute(
        "INSERT OR REPLACE INTO puzzles (date, plusword, across_words, down_words) VALUES (?1, ?2, ?3, ?4)",
        [date, plusword, &across_json, &down_json],
    )?;
    Ok(())
}

fn main() -> Result<()> {
    println!("Quinta Puzzle Importer");
    println!("=====================\n");

    // Read the puzzles.json file
    let json_content = fs::read_to_string("puzzles.json").expect("Failed to read puzzles.json");
    let puzzles: Vec<FetchedPuzzle> =
        serde_json::from_str(&json_content).expect("Failed to parse puzzles.json");

    println!("Found {} puzzles to import\n", puzzles.len());

    // Open database connection
    let conn = Connection::open("quinta.db")?;
    init_database(&conn)?;

    let mut imported_count = 0;
    let mut skipped_count = 0;
    let total_count = puzzles.len();

    for puzzle in &puzzles {
        println!("Processing puzzle for {}...", puzzle.date);

        // Separate across and down clues
        let across_clues: Vec<&FetchedClue> = puzzle
            .clues
            .iter()
            .filter(|c| c.dir == "across")
            .collect();

        let down_clues: Vec<&FetchedClue> = puzzle
            .clues
            .iter()
            .filter(|c| c.dir == "down")
            .collect();

        // Check if we have exactly 5 across and 5 down (standard Plusword format)
        if across_clues.len() != 6 || down_clues.len() != 5 {
            println!(
                "  ⚠ Skipping: Expected 6 across and 5 down, got {} across and {} down",
                across_clues.len(),
                down_clues.len()
            );
            skipped_count += 1;
            continue;
        }

        // Extract plusword (should be the last across clue)
        let plusword = match extract_plusword(&puzzle.clues) {
            Some(word) => word,
            None => {
                println!("  ⚠ Skipping: Could not find plusword solution");
                skipped_count += 1;
                continue;
            }
        };

        // Get the 5 regular across words (excluding plusword clue)
        let across_words: Vec<String> = across_clues
            .iter()
            .filter(|c| !c.clue.to_lowercase().contains("plusword"))
            .map(|c| c.word.clone())
            .collect();

        let down_words: Vec<String> = down_clues.iter().map(|c| c.word.clone()).collect();

        if across_words.len() != 5 || down_words.len() != 5 {
            println!(
                "  ⚠ Skipping: After filtering, got {} across and {} down words",
                across_words.len(),
                down_words.len()
            );
            skipped_count += 1;
            continue;
        }

        // Insert all clue-word pairs
        for clue in &puzzle.clues {
            insert_clue_word_pair(&conn, &clue.word, &clue.clue, &clue.slug)?;
        }

        // Insert the complete puzzle
        insert_puzzle(&conn, &puzzle.date, &plusword, &across_words, &down_words)?;

        println!("  ✓ Imported: {} (plusword: {})", puzzle.date, plusword);
        imported_count += 1;
    }

    println!("\n======================");
    println!("Import Summary:");
    println!("  Imported: {}", imported_count);
    println!("  Skipped:  {}", skipped_count);
    println!("  Total:    {}", total_count);
    println!("\nDatabase saved to quinta.db");

    Ok(())
}
