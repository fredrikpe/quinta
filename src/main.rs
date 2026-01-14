mod generator;
mod models;

use actix_files as fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use models::{DailyPuzzle, WordWithPosition};
use rusqlite::Connection;
use std::time::Instant;
use std::{collections::HashSet, sync::Mutex};

use crate::models::{ClueWord, Hint, Puzzle};

type AppResult<T> = Result<T, String>;

struct AppState {
    db: Mutex<Connection>,
}

fn load_all_clues() -> AppResult<Vec<ClueWord>> {
    let conn = Connection::open("quinta.db").map_err(|e| format!("DB connection failed: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, clue, word FROM clue_word_pairs")
        .map_err(|e| format!("select failed: {}", e))?;

    let result = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let clue: String = row.get(1)?;
            let word: String = row.get(2)?;
            Ok(ClueWord { id, word, clue })
        })
        .and_then(|e| e.collect());

    match result {
        Ok(data) => Ok(data),
        Err(e) => Err(format!("Error loading clues: {:?}", &e)),
    }
}

fn load_random_word() -> AppResult<String> {
    let conn = Connection::open("quinta.db").map_err(|e| format!("db connection failed: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM word ORDER BY RANDOM() LIMIT 1")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([], |row| {
        let word: String = row.get(1)?;
        Ok(word)
    });

    match result {
        Ok(data) => Ok(data),
        Err(rusqlite::Error::QueryReturnedNoRows) => panic!("get random word returned no word"),
        Err(e) => Err(e.to_string()),
    }
}

fn get_word_and_clue_by_id(conn: &Connection, id: i64) -> AppResult<(String, String)> {
    conn.query_row(
        "SELECT word, clue FROM clue_word_pairs WHERE id = ?1",
        [id],
        |row| {
            let word: String = row.get(0)?;
            let clue: String = row.get(1)?;
            Ok((word, clue))
        },
    )
    .map_err(|e| e.to_string())
}

fn load_todays_puzzle(date: &str) -> AppResult<Option<Puzzle>> {
    let conn = Connection::open("quinta.db").map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT across_word_ids, down_word_ids, plusword FROM puzzles where date = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_row([date], |row| {
        let across_ids_json: String = row.get(0)?;
        let down_ids_json: String = row.get(1)?;
        let plusword: String = row.get(2)?;

        let across_ids: Vec<i64> = serde_json::from_str(&across_ids_json).unwrap();
        let down_ids: Vec<i64> = serde_json::from_str(&down_ids_json).unwrap();

        // Fetch actual words from IDs
        let mut across_words = Vec::new();
        for id in across_ids {
            if let Ok((word, clue)) = get_word_and_clue_by_id(&conn, id) {
                across_words.push(ClueWord { id, word, clue });
            }
        }

        let mut down_words = Vec::new();
        for id in down_ids {
            if let Ok((word, clue)) = get_word_and_clue_by_id(&conn, id) {
                down_words.push(ClueWord { id, word, clue });
            }
        }

        Ok(Puzzle {
            date: date.to_owned(),
            across_words,
            down_words,
            plusword,
        })
    });

    match result {
        Ok(data) => {
            println!("Loaded existing puzzle for {}", date);
            Ok(Some(data))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/*
fn get_clue_for_word(word: &str) -> AppResult<String> {
    let conn = Connection::open("quinta.db").map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT clue FROM clue_word_pairs WHERE word = ?1 LIMIT 1")
        .map_err(|e| e.to_string())?;

    stmt.query_row([word], |row| row.get(0))
        .map_err(|e| e.to_string())?
}
*/

fn get_word_id(conn: &Connection, word: &str) -> AppResult<Option<i64>> {
    let result = conn.query_row(
        "SELECT id FROM clue_word_pairs WHERE word = ?1 LIMIT 1",
        [word],
        |row| row.get(0),
    );

    match result {
        Ok(id) => Ok(Some(id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

fn hints_across(plusword: &str, word: &str) -> Vec<Option<Hint>> {
    let mut hints: Vec<Option<Hint>> = vec![None; word.len()];

    let solution_chars: Vec<char> = plusword.chars().collect();
    let word_chars: Vec<char> = word.chars().collect();

    // 1. GREEN pass - check position match
    for i in 0..word_chars.len().min(solution_chars.len()) {
        if word_chars[i] == solution_chars[i] {
            hints[i] = Some(Hint::Green);
        }
    }
    // 2. YELLOW pass - check if char exists anywhere in plusword (not already GREEN)
    for i in 0..word_chars.len() {
        if hints[i].is_none() && solution_chars.contains(&word_chars[i]) {
            hints[i] = Some(Hint::Yellow);
        }
    }
    hints
}

fn hints_down(plusword: &str, word: &str, col_index: usize) -> Vec<Option<Hint>> {
    let mut hints: Vec<Option<Hint>> = vec![None; word.len()];

    let solution_chars: Vec<char> = plusword.chars().collect();
    let word_chars: Vec<char> = word.chars().collect();

    // For down words, only check GREEN for the character at position col_index in plusword
    if col_index < solution_chars.len() {
        for (row, &ch) in word_chars.iter().enumerate() {
            if ch == solution_chars[col_index] {
                hints[row] = Some(Hint::Green);
            }
        }
    }

    // YELLOW pass - check if char exists anywhere in plusword (not already GREEN)
    for row in 0..word_chars.len() {
        if hints[row].is_none() && solution_chars.contains(&word_chars[row]) {
            hints[row] = Some(Hint::Yellow);
        }
    }
    hints
}

fn add_hints(puzzle: Puzzle) -> DailyPuzzle {
    let mut across_with_clues = Vec::new();
    let mut down_with_clues = Vec::new();

    for (i, clue_word) in puzzle.across_words.iter().enumerate() {
        across_with_clues.push(WordWithPosition {
            word: clue_word.word.clone(),
            clue: clue_word.clue.clone(),
            hints: hints_across(&puzzle.plusword, &clue_word.word),
            position: i,
        });
    }

    for (i, clue_word) in puzzle.down_words.iter().enumerate() {
        down_with_clues.push(WordWithPosition {
            word: clue_word.word.clone(),
            clue: clue_word.clue.clone(),
            hints: hints_down(&puzzle.plusword, &clue_word.word, i),
            position: i,
        });
    }

    DailyPuzzle {
        date: puzzle.date,
        across_words: across_with_clues,
        down_words: down_with_clues,
        plusword: puzzle.plusword,
    }
}

fn save_puzzle_to_db(puzzle: &Puzzle) -> AppResult<()> {
    let conn = Connection::open("quinta.db").map_err(|e| format!("DB connection failed: {}", e))?;

    // Get word IDs for across and down words
    let mut across_word_ids = Vec::new();
    for clue_word in &puzzle.across_words {
        if let Some(id) = get_word_id(&conn, &clue_word.word)? {
            across_word_ids.push(id);
        } else {
            eprintln!("Warning: No ID found for word '{}'", &clue_word.word);
        }
    }

    let mut down_word_ids = Vec::new();
    for clue_word in &puzzle.down_words {
        if let Some(id) = get_word_id(&conn, &clue_word.word)? {
            down_word_ids.push(id);
        } else {
            eprintln!("Warning: No ID found for word '{}'", &clue_word.word);
        }
    }

    let across_json = serde_json::to_string(&across_word_ids).unwrap();
    let down_json = serde_json::to_string(&down_word_ids).unwrap();

    conn.execute(
        "INSERT INTO puzzles (date, across_word_ids, down_word_ids, plusword) VALUES (?1, ?2, ?3, ?4)",
        (&puzzle.date, &across_json, &down_json, &puzzle.plusword),
    ).map_err(|e| format!("insert failed: {}", e))?;

    println!("✓ Saved puzzle to database for {}", puzzle.date);

    Ok(())
}

fn create_todays_puzzle() -> AppResult<DailyPuzzle> {
    let overall_start = Instant::now();
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    println!("Generating new puzzle for {}", today);

    let clue_words = load_all_clues().expect("Failed to load clues");
    println!("Loaded {} clue-word pairs", clue_words.len());

    let plusword = load_random_word()
        .expect("Failed to load random word")
        .to_uppercase();

    println!("Selected plusword: {}", plusword);

    // Generate a valid crossword with brute force
    let (across_words, down_words) = match generator::generate_crossword(&clue_words) {
        Some(result) => result,
        None => {
            return Err(format!("Failed to generate crossword, using fallback").to_string());
        }
    };

    let puzzle = Puzzle {
        date: today.clone(),
        across_words: across_words.clone(),
        down_words: down_words.clone(),
        plusword: plusword.clone(),
    };

    // Save to database
    if let Err(e) = save_puzzle_to_db(&puzzle) {
        eprintln!("Failed to save puzzle to database: {}", e);
    }

    let total_elapsed = overall_start.elapsed();
    println!(
        "✓ Total puzzle generation time: {:.2}s",
        total_elapsed.as_secs_f64()
    );

    // Return with hints
    Ok(add_hints(puzzle))
}

async fn get_today_puzzle(_data: web::Data<AppState>) -> impl Responder {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let puzzle = match load_todays_puzzle(&today) {
        Ok(Some(puzzle)) => Ok(add_hints(puzzle)),
        Ok(None) => create_todays_puzzle(),
        Err(e) => Err(e),
    };

    match puzzle {
        Ok(puzzle) => HttpResponse::Ok().json(puzzle),
        Err(e) => HttpResponse::InternalServerError().body(format!("error: {}", e)),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Quinta server at http://localhost:8080");

    //let clue_words = load_all_clues().expect("Failed to load clues");
    //generate_crossword(&clue_words);

    //return Ok(());

    let _conn = Connection::open("quinta.db")
        .expect("Failed to open database. Make sure quinta.db exists.");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(AppState {
                db: Mutex::new(Connection::open("quinta.db").unwrap()),
            }))
            .route("/api/puzzle/today", web::get().to(get_today_puzzle))
            .service(fs::Files::new("/", "./static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
