use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyPuzzle {
    pub date: String,
    pub across_words: Vec<WordWithPosition>,
    pub down_words: Vec<WordWithPosition>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordWithPosition {
    pub word: String,
    pub clue: String,
    pub position: usize, // Row or column index (0-4)
}

#[derive(Debug, Deserialize)]
pub struct CheckAnswerRequest {
    pub answers: Vec<Vec<String>>, // 5x5 grid of answers
}

#[derive(Debug, Serialize)]
pub struct CheckAnswerResponse {
    pub correct: bool,
    pub errors: Vec<ErrorPosition>,
}

#[derive(Debug, Serialize)]
pub struct ErrorPosition {
    pub row: usize,
    pub col: usize,
}
