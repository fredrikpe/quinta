use std::{collections::HashSet, time::Instant};

use crate::models::ClueWord;

pub fn generate_crossword(clue_words: &[ClueWord]) -> Option<(Vec<ClueWord>, Vec<ClueWord>)> {
    use rand::seq::SliceRandom;
    use rand::thread_rng;

    let start_time = Instant::now();
    println!("Starting crossword generation...");

    let mut rng = thread_rng();
    let mut shuffled = clue_words.to_vec();
    shuffled.shuffle(&mut rng);
    let n = shuffled.len();

    let mut grid: [[char; 5]; 5] = [['-'; 5]; 5];

    let mut prefix_set: HashSet<String> = HashSet::new();
    for clue_word in &shuffled {
        for i in 1..6 {
            prefix_set.insert(clue_word.word[..i].to_string());
        }
    }
    let mut index0: usize = 0;
    let mut index1: usize = 0;
    let mut index2: usize = 0;
    let mut index3: usize = 0;
    let mut index4: usize = 0;

    'outer: for i0 in 0..n {
        index0 = i0;
        set_across(&mut grid, 0, &shuffled[i0].word);
        for i1 in 0..n {
            index1 = i1;
            set_across(&mut grid, 1, &shuffled[i1].word);
            if !test(&prefix_set, grid) {
                continue;
            }

            for i2 in 0..n {
                index2 = i2;
                set_across(&mut grid, 2, &shuffled[i2].word);
                if !test(&prefix_set, grid) {
                    continue;
                }
                for i3 in 0..n {
                    index3 = i3;
                    set_across(&mut grid, 3, &shuffled[i3].word);
                    if !test(&prefix_set, grid) {
                        continue;
                    }
                    for i4 in 0..n {
                        index4 = i4;
                        set_across(&mut grid, 4, &shuffled[i4].word);
                        if !test(&prefix_set, grid) {
                            continue;
                        } else {
                            break 'outer;
                        }
                    }
                    set_across(&mut grid, 4, "-----");
                }
                set_across(&mut grid, 3, "-----");
            }
            set_across(&mut grid, 2, "-----");
        }
        set_across(&mut grid, 1, "-----");
    }
    dbg_print_grid(grid);
    let across_words = vec![
        shuffled[index0].clone(),
        shuffled[index1].clone(),
        shuffled[index2].clone(),
        shuffled[index3].clone(),
        shuffled[index4].clone(),
    ];
    let down_words = vec![
        down_word_at_i(&grid, 0),
        down_word_at_i(&grid, 1),
        down_word_at_i(&grid, 2),
        down_word_at_i(&grid, 3),
        down_word_at_i(&grid, 4),
    ]
    .iter()
    .map(|w| {
        shuffled
            .iter()
            .find(|clue_word| clue_word.word.eq(w))
            .unwrap()
            .clone()
    })
    .collect::<Vec<ClueWord>>();

    let elapsed = start_time.elapsed();
    eprintln!("Generated crossword in ({:.2}s)", elapsed.as_secs_f64());
    Some((across_words, down_words))
}

fn down_word_at_i(grid: &[[char; 5]; 5], i: usize) -> String {
    vec![grid[0][i], grid[1][i], grid[2][i], grid[3][i], grid[4][i]]
        .iter()
        .collect::<String>()
}

fn test(prefix_set: &HashSet<String>, grid: [[char; 5]; 5]) -> bool {
    let mut depth: usize = 0;
    for i in 0..5 {
        if grid[i][0] != '-' {
            depth += 1;
        } else {
            break;
        }
    }

    for j in 0..5 {
        let mut down: [char; 5] = ['-'; 5];
        for i in 0..depth {
            down[i] = grid[i][j];
        }
        let prefix: String = down[..depth].iter().collect();
        if !prefix_set.contains(&prefix) {
            return false;
        }
    }

    true
}

fn dbg_print_grid(grid: [[char; 5]; 5]) {
    for i in 0..5 {
        println!(
            "{}{}{}{}{}",
            grid[i][0], grid[i][1], grid[i][2], grid[i][3], grid[i][4]
        );
    }
}

fn set_across(grid: &mut [[char; 5]; 5], i: usize, word: &str) {
    grid[i][0] = word.chars().nth(0).unwrap();
    grid[i][1] = word.chars().nth(1).unwrap();
    grid[i][2] = word.chars().nth(2).unwrap();
    grid[i][3] = word.chars().nth(3).unwrap();
    grid[i][4] = word.chars().nth(4).unwrap();
}
