use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Puzzle {
    pub date: String,
    pub across_words: Vec<ClueWord>,
    pub down_words: Vec<ClueWord>,
    pub plusword: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClueWord {
    pub id: i64,
    pub word: String,
    pub clue: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyPuzzle {
    pub date: String,
    pub across_words: Vec<ClueWord>,
    pub down_words: Vec<ClueWord>,
    pub hints: Vec<Vec<Option<Hint>>>,
    pub plusword: String,
}

#[derive(PartialEq, Copy, Clone, Debug, Serialize, Deserialize)]
pub enum Hint {
    Yellow,
    Green,
}
