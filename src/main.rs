mod models;

use actix_files as fs;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use models::{CheckAnswerRequest, CheckAnswerResponse, DailyPuzzle, ErrorPosition, WordWithPosition};

async fn get_today_puzzle() -> impl Responder {
    let puzzle = DailyPuzzle {
        date: chrono::Local::now().format("%Y-%m-%d").to_string(),
        across_words: vec![
            WordWithPosition {
                word: "BEACH".to_string(),
                clue: "Sandy shore by the ocean".to_string(),
                position: 0,
            },
            WordWithPosition {
                word: "EARTH".to_string(),
                clue: "Third planet from the sun".to_string(),
                position: 1,
            },
            WordWithPosition {
                word: "ANGLE".to_string(),
                clue: "Corner measurement".to_string(),
                position: 2,
            },
            WordWithPosition {
                word: "CHANT".to_string(),
                clue: "Rhythmic song".to_string(),
                position: 3,
            },
            WordWithPosition {
                word: "HEART".to_string(),
                clue: "Organ that pumps blood".to_string(),
                position: 4,
            },
        ],
        down_words: vec![
            WordWithPosition {
                word: "BEACH".to_string(),
                clue: "Sandy shore by the ocean".to_string(),
                position: 0,
            },
            WordWithPosition {
                word: "EARTH".to_string(),
                clue: "Third planet from the sun".to_string(),
                position: 1,
            },
            WordWithPosition {
                word: "ANGLE".to_string(),
                clue: "Corner measurement".to_string(),
                position: 2,
            },
            WordWithPosition {
                word: "CHANT".to_string(),
                clue: "Rhythmic song".to_string(),
                position: 3,
            },
            WordWithPosition {
                word: "HEART".to_string(),
                clue: "Organ that pumps blood".to_string(),
                position: 4,
            },
        ],
    };

    HttpResponse::Ok().json(puzzle)
}

async fn check_answer(req: web::Json<CheckAnswerRequest>) -> impl Responder {
    let expected = vec![
        vec!["B", "E", "A", "C", "H"],
        vec!["E", "A", "R", "T", "H"],
        vec!["A", "N", "G", "L", "E"],
        vec!["C", "H", "A", "N", "T"],
        vec!["H", "E", "A", "R", "T"],
    ];

    let mut errors = Vec::new();

    for (row, row_data) in req.answers.iter().enumerate() {
        for (col, cell) in row_data.iter().enumerate() {
            if cell.to_uppercase() != expected[row][col] {
                errors.push(ErrorPosition { row, col });
            }
        }
    }

    HttpResponse::Ok().json(CheckAnswerResponse {
        correct: errors.is_empty(),
        errors,
    })
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Quinta server at http://localhost:8080");

    HttpServer::new(move || {
        App::new()
            .route("/api/puzzle/today", web::get().to(get_today_puzzle))
            .route("/api/puzzle/check", web::post().to(check_answer))
            .service(fs::Files::new("/", "./static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
