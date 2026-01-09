mod models;

use actix_files as fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use models::{CheckAnswerRequest, CheckAnswerResponse, DailyPuzzle, ErrorPosition, WordWithPosition};
use rusqlite::{Connection, Result};
use std::sync::Mutex;

struct AppState {
    db: Mutex<Connection>,
}

fn load_puzzle_from_db(date: &str) -> Result<Option<(Vec<String>, Vec<String>, String)>> {
    let conn = Connection::open("quinta.db")?;

    let mut stmt = conn.prepare(
        "SELECT across_words, down_words, plusword FROM puzzles WHERE date = ?1"
    )?;

    let result = stmt.query_row([date], |row| {
        let across_json: String = row.get(0)?;
        let down_json: String = row.get(1)?;
        let plusword: String = row.get(2)?;
        let across_words: Vec<String> = serde_json::from_str(&across_json).unwrap();
        let down_words: Vec<String> = serde_json::from_str(&down_json).unwrap();
        Ok((across_words, down_words, plusword))
    });

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

fn get_clue_for_word(word: &str) -> Result<String> {
    let conn = Connection::open("quinta.db")?;

    let mut stmt = conn.prepare(
        "SELECT clue FROM clue_word_pairs WHERE word = ?1 LIMIT 1"
    )?;

    stmt.query_row([word], |row| row.get(0))
}

async fn get_today_puzzle(_data: web::Data<AppState>) -> impl Responder {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    match load_puzzle_from_db(&today) {
        Ok(Some((across_words, down_words, plusword))) => {
            let mut across_with_clues = Vec::new();
            let mut down_with_clues = Vec::new();

            for (i, word) in across_words.iter().enumerate() {
                let clue = get_clue_for_word(word).unwrap_or_else(|_| "No clue available".to_string());
                across_with_clues.push(WordWithPosition {
                    word: word.clone(),
                    clue,
                    position: i,
                });
            }

            for (i, word) in down_words.iter().enumerate() {
                let clue = get_clue_for_word(word).unwrap_or_else(|_| "No clue available".to_string());
                down_with_clues.push(WordWithPosition {
                    word: word.clone(),
                    clue,
                    position: i,
                });
            }

            let plusword_clue = get_clue_for_word(&plusword).unwrap_or_else(|_| "Plusword clue".to_string());

            let puzzle = DailyPuzzle {
                date: today,
                across_words: across_with_clues,
                down_words: down_with_clues,
                plusword_clue,
                plusword,
            };

            HttpResponse::Ok().json(puzzle)
        }
        Ok(None) => {
            HttpResponse::NotFound().body("No puzzle available for today")
        }
        Err(e) => {
            HttpResponse::InternalServerError().body(format!("Database error: {}", e))
        }
    }
}

async fn check_answer(req: web::Json<CheckAnswerRequest>, _data: web::Data<AppState>) -> impl Responder {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    match load_puzzle_from_db(&today) {
        Ok(Some((across_words, down_words, plusword))) => {
            let mut errors = Vec::new();

            // Check across words (rows)
            for (row, expected_word) in across_words.iter().enumerate() {
                for (col, expected_char) in expected_word.chars().enumerate() {
                    if req.answers[row][col].to_uppercase() != expected_char.to_uppercase().to_string() {
                        errors.push(ErrorPosition { row, col });
                    }
                }
            }

            // Check down words (columns)
            for (col, expected_word) in down_words.iter().enumerate() {
                for (row, expected_char) in expected_word.chars().enumerate() {
                    if req.answers[row][col].to_uppercase() != expected_char.to_uppercase().to_string() {
                        if !errors.contains(&ErrorPosition { row, col }) {
                            errors.push(ErrorPosition { row, col });
                        }
                    }
                }
            }

            // Check plusword
            let plusword_error = req.plusword.to_uppercase() != plusword.to_uppercase();

            HttpResponse::Ok().json(CheckAnswerResponse {
                correct: errors.is_empty() && !plusword_error,
                errors,
                plusword_error,
            })
        }
        Ok(None) => {
            HttpResponse::NotFound().body("No puzzle available for today")
        }
        Err(e) => {
            HttpResponse::InternalServerError().body(format!("Database error: {}", e))
        }
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
            .route("/api/puzzle/check", web::post().to(check_answer))
            .service(fs::Files::new("/", "./static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
