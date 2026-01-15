mod generator;
mod models;

use actix_files as fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use models::DailyPuzzle;
use rusqlite::Connection;
use std::sync::Mutex;
use std::time::Instant;

use crate::models::{ClueWord, Puzzle};

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

fn load_words() -> AppResult<Vec<String>> {
    let conn = Connection::open("quinta.db").map_err(|e| format!("db connection failed: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM word")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            let word: String = row.get(1)?;
            Ok(word)
        })
        .and_then(|e| e.collect());

    match result {
        Ok(data) => Ok(data),
        Err(rusqlite::Error::QueryReturnedNoRows) => panic!("get words returned no word"),
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

fn load_todays_puzzle(date: &str) -> AppResult<Option<DailyPuzzle>> {
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

        Ok(add_hints(Puzzle {
            date: date.to_owned(),
            across_words,
            down_words,
            plusword,
        }))
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

    // Generate a valid crossword with brute force
    let (across_words, down_words) = match generator::generate_crossword(&clue_words) {
        Some(result) => result,
        None => {
            return Err(format!("Failed to generate crossword, using fallback").to_string());
        }
    };

    let words = load_words().expect("Failed to load words");

    let plusword = generator::choose_plusword(
        &words,
        &across_words
            .iter()
            .map(|cw| cw.word.clone())
            .collect::<Vec<String>>(),
    )
    .to_uppercase();

    println!("Selected plusword: {}", plusword);

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

    Ok(add_hints(puzzle))
}

fn add_hints(puzzle: Puzzle) -> DailyPuzzle {
    let hints = generator::hints(
        &puzzle.plusword,
        &puzzle
            .across_words
            .iter()
            .map(|cw| cw.word.clone())
            .collect(),
    );

    DailyPuzzle {
        date: puzzle.date,
        across_words: puzzle.across_words,
        down_words: puzzle.down_words,
        hints: hints.into_iter().map(|row| row.to_vec()).collect(),
        plusword: puzzle.plusword,
    }
}

async fn get_today_puzzle(_data: web::Data<AppState>) -> impl Responder {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let puzzle = match load_todays_puzzle(&today) {
        Ok(Some(puzzle)) => Ok(puzzle),
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
