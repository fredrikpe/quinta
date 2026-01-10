mod models;

use actix_files as fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use models::{DailyPuzzle, WordWithPosition};
use rusqlite::{Connection, Result};
use std::sync::Mutex;

use crate::models::Hint;

struct AppState {
    db: Mutex<Connection>,
}

fn load_random_word() -> Result<String> {
    let conn = Connection::open("quinta.db")?;

    let mut stmt = conn.prepare("SELECT * FROM word ORDER BY RANDOM() LIMIT 1")?;

    let result = stmt.query_row([], |row| {
        let word: String = row.get(1)?;
        Ok(word)
    });

    match result {
        Ok(data) => Ok(data),
        Err(rusqlite::Error::QueryReturnedNoRows) => panic!("get random word returned no word"),
        Err(e) => {
            print!("{:?}", &e);
            Err(e)
        }
    }
}

fn load_puzzle_from_db(date: &str) -> Result<Option<(Vec<String>, Vec<String>)>> {
    let conn = Connection::open("quinta.db")?;

    let mut stmt = conn.prepare(
        "SELECT across_words, down_words, plusword FROM puzzles order by date desc limit 1",
    )?;

    let result = stmt.query_row([], |row| {
        let across_json: String = row.get(0)?;
        let down_json: String = row.get(1)?;
        let across_words: Vec<String> = serde_json::from_str(&across_json).unwrap();
        let down_words: Vec<String> = serde_json::from_str(&down_json).unwrap();
        Ok((across_words, down_words))
    });

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

fn get_clue_for_word(word: &str) -> Result<String> {
    let conn = Connection::open("quinta.db")?;

    let mut stmt = conn.prepare("SELECT clue FROM clue_word_pairs WHERE word = ?1 LIMIT 1")?;

    stmt.query_row([word], |row| row.get(0))
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

async fn get_today_puzzle(_data: web::Data<AppState>) -> impl Responder {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let plusword = match load_random_word() {
        Ok(w) => w.to_uppercase(),
        Err(e) => panic!("{:?}", e),
    };

    match load_puzzle_from_db(&today) {
        Ok(Some((across_words, down_words))) => {
            let mut across_with_clues = Vec::new();
            let mut down_with_clues = Vec::new();

            for (i, word) in across_words.iter().enumerate() {
                let clue =
                    get_clue_for_word(word).unwrap_or_else(|_| "No clue available".to_string());
                across_with_clues.push(WordWithPosition {
                    word: word.clone(),
                    clue,
                    hints: hints_across(&plusword, &word),
                    position: i,
                });
            }

            for (i, word) in down_words.iter().enumerate() {
                let clue =
                    get_clue_for_word(word).unwrap_or_else(|_| "No clue available".to_string());
                down_with_clues.push(WordWithPosition {
                    word: word.clone(),
                    clue,
                    hints: hints_down(&plusword, &word, i),
                    position: i,
                });
            }

            let puzzle = DailyPuzzle {
                date: today,
                across_words: across_with_clues,
                down_words: down_with_clues,
                plusword,
            };

            HttpResponse::Ok().json(puzzle)
        }
        Ok(None) => HttpResponse::NotFound().body("No puzzle available for today"),
        Err(e) => HttpResponse::InternalServerError().body(format!("Database error: {}", e)),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Quinta server at http://localhost:8080");

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
