use rusqlite::{Connection, Result};
use std::fs;

fn init_database(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS word (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            UNIQUE(word)
        )",
        [],
    )?;

    Ok(())
}

fn insert_word(conn: &Connection, word: &str) -> Result<()> {
    conn.execute("INSERT INTO word (word) VALUES (?1)", [word])?;
    Ok(())
}

fn main() -> Result<()> {
    println!("Quinta Puzzle Importer");
    println!("=====================\n");

    let json_content = fs::read_to_string("words.json").expect("Failed to read words.json");
    let words: Vec<String> =
        serde_json::from_str(&json_content).expect("Failed to parse words.json");

    println!("Found {} words to import\n", words.len());

    // Open database connection
    let conn = Connection::open("quinta.db")?;
    init_database(&conn)?;

    let mut imported_count = 0;
    let total_count = words.len();

    for word in &words {
        insert_word(&conn, &word)?;
        imported_count += 1;
    }

    println!("\n======================");
    println!("Import Summary:");
    println!("  Imported: {}", imported_count);
    println!("  Total:    {}", total_count);
    println!("\nDatabase saved to quinta.db");

    Ok(())
}
