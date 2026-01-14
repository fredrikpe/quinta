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
    pub across_words: Vec<WordWithPosition>,
    pub down_words: Vec<WordWithPosition>,
    pub plusword: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WordWithPosition {
    pub word: String,
    pub hints: Vec<Option<Hint>>,
    pub clue: String,
    pub position: usize, // Row or column index (0-4)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Hint {
    Yellow,
    Green,
}
