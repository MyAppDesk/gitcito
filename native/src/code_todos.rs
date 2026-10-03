use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc::{self, Receiver}};
use std::thread;
use std::time::{Duration, Instant};

use regex::{Regex, RegexBuilder};

const MAX_TODOS: usize = 5_000;
const SCAN_TIMEOUT: Duration = Duration::from_secs(60);
const TAGS: [&str; 14] = [
    "FIXME", "TODO", "BUG", "HACK", "XXX", "NOTE", "OPTIMIZE", "REVIEW",
    "REFACTOR", "DEPRECATED", "QUESTION", "IDEA", "WIP", "TEMP",
];

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum GroupBy {
    Tag,
    Owner,
    Folder,
    File,
}

#[derive(Clone)]
pub struct Todo {
    pub file: String,
    pub line: usize,
    pub col: usize,
    pub tag: String,
    pub owner: Option<String>,
    pub message: String,
    pub text: String,
}

pub struct ScanResult {
    pub todos: Vec<Todo>,
    pub truncated: bool,
    pub ms: u128,
}

pub enum ScanError {
    Timeout,
    GitExit(String),
    System(String),
}

pub type ScanProcess = Arc<Mutex<Child>>;

pub fn start(path: &Path) -> Result<(Receiver<Result<ScanResult, ScanError>>, ScanProcess), ScanError> {
    let tags = TAGS.join("|");
    let grep_pattern = format!("(//|/\\*|\\*|#|<!--|--|;|%|\"\"\"|''')[ \\t*!-]*({tags})");
    let mut child = Command::new("git")
        .current_dir(path)
        .args([
            "grep", "-n", "-I", "-E", "-i", "--no-color", "--untracked",
            "--exclude-standard", "-e", &grep_pattern,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| ScanError::System(error.to_string()))?;
    let stdout = child.stdout.take().ok_or_else(|| ScanError::System("Git grep did not provide output".to_owned()))?;
    let process = Arc::new(Mutex::new(child));
    let (sender, receiver) = mpsc::channel();
    let scan_process = Arc::clone(&process);
    let finished = Arc::new(AtomicBool::new(false));
    let timed_out = Arc::new(AtomicBool::new(false));
    let timeout_process = Arc::clone(&process);
    let timeout_finished = Arc::clone(&finished);
    let timeout_flag = Arc::clone(&timed_out);
    thread::spawn(move || {
        let started = Instant::now();
        while !timeout_finished.load(Ordering::Acquire) {
            if started.elapsed() >= SCAN_TIMEOUT {
                timeout_flag.store(true, Ordering::Release);
                if let Ok(mut child) = timeout_process.lock() { let _ = child.kill(); }
                break;
            }
            thread::sleep(Duration::from_millis(100));
        }
    });
    thread::spawn(move || {
        let started = Instant::now();
        let result = scan_output(stdout, &scan_process)
            .and_then(|(todos, truncated)| {
                let status = scan_process.lock()
                    .map_err(|_| ScanError::System("TODO scanner process lock failed".to_owned()))?
                    .wait()
                    .map_err(|error| ScanError::System(error.to_string()))?;
                if timed_out.load(Ordering::Acquire) {
                    return Err(ScanError::Timeout);
                }
                if !status.success() && status.code() != Some(1) && !truncated {
                    return Err(ScanError::GitExit(status.code().map_or_else(|| "?".to_owned(), |code| code.to_string())));
                }
                Ok(ScanResult { todos, truncated, ms: started.elapsed().as_millis() })
            });
        finished.store(true, Ordering::Release);
        let _ = sender.send(result);
    });
    Ok((receiver, process))
}

fn scan_output(
    stdout: impl std::io::Read,
    process: &ScanProcess,
) -> Result<(Vec<Todo>, bool), ScanError> {
    let tags = TAGS.join("|");
    let candidates = RegexBuilder::new(&format!(r"(?i)\b({tags})\b"))
        .build().map_err(|error| ScanError::System(error.to_string()))?;
    let leader = Regex::new(r#"(?://|/\*|\*|#|<!--|--|;|%|"""|''')[ \t*!\-=>]*$"#)
        .map_err(|error| ScanError::System(error.to_string()))?;
    let marker = RegexBuilder::new(&format!(
        r"(?i)^({tags})\b[ \t]*(?:\(([^)]*)\)|\[([^\]]*)\])?[ \t]*[:：\-–—]?[ \t]*(.*)$"
    )).build().map_err(|error| ScanError::System(error.to_string()))?;
    let owner_at = Regex::new(r"^@([A-Za-z0-9_.+-]{1,32})\b[ \t]*[:：\-–—]?[ \t]*")
        .map_err(|error| ScanError::System(error.to_string()))?;
    let valid_owner = Regex::new(r"^[A-Za-z0-9_.@+\-]{1,32}$")
        .map_err(|error| ScanError::System(error.to_string()))?;
    let closer = Regex::new(r#"\s*(?:\*/|-->|"""|''')\s*$"#)
        .map_err(|error| ScanError::System(error.to_string()))?;
    let grep_line = Regex::new(r"^(.+?):([0-9]+):(.*)$")
        .map_err(|error| ScanError::System(error.to_string()))?;
    let mut reader = BufReader::new(stdout);
    let mut todos = Vec::new();
    let mut truncated = false;

    loop {
        let mut bytes = Vec::new();
        if reader.read_until(b'\n', &mut bytes).map_err(|error| ScanError::System(error.to_string()))? == 0 {
            break;
        }
        if bytes.last() == Some(&b'\n') { bytes.pop(); }
        if bytes.last() == Some(&b'\r') { bytes.pop(); }
        let raw = String::from_utf8_lossy(&bytes);
        let Some(capture) = grep_line.captures(&raw) else { continue };
        let file = capture.get(1).map(|m| m.as_str()).unwrap_or_default().replace('\\', "/");
        if file.split('/').any(|part| part == "node_modules") { continue }
        let line_number = capture.get(2).and_then(|m| m.as_str().parse::<usize>().ok()).unwrap_or(1);
        let source = capture.get(3).map(|m| m.as_str()).unwrap_or_default();
        if let Some(todo) = parse_line(
            &file, line_number, source, &candidates, &leader, &marker, &owner_at, &valid_owner, &closer,
        ) {
            if todos.len() == MAX_TODOS {
                truncated = true;
                if let Ok(mut child) = process.lock() { let _ = child.kill(); }
                break;
            }
            todos.push(todo);
        }
    }

    todos.sort_by(|a, b| a.file.cmp(&b.file).then(a.line.cmp(&b.line)));
    Ok((todos, truncated))
}

fn parse_line(
    file: &str,
    line: usize,
    source: &str,
    candidates: &Regex,
    leader: &Regex,
    marker: &Regex,
    owner_at: &Regex,
    valid_owner: &Regex,
    closer: &Regex,
) -> Option<Todo> {
    for hit in candidates.find_iter(source) {
        if !leader.is_match(&source[..hit.start()]) { continue }
        let tail = &source[hit.start()..];
        let Some(capture) = marker.captures(tail) else { continue };
        let tag = capture.get(1)?.as_str().to_uppercase();
        let mut owner = capture.get(2).or_else(|| capture.get(3))
            .map(|value| value.as_str().trim().to_owned()).unwrap_or_default();
        let mut message = capture.get(4).map(|value| value.as_str().trim().to_owned()).unwrap_or_default();
        if !owner.is_empty() && !valid_owner.is_match(&owner) {
            message = tail.get(tag.len()..)?.trim().to_owned();
            message = message.trim_start_matches(|ch| matches!(ch, ':' | '：' | '-' | '–' | '—')).trim().to_owned();
            owner.clear();
        }
        if owner.is_empty() {
            if let Some(capture) = owner_at.captures(&message) {
                owner = capture.get(1)?.as_str().to_owned();
                message = message[capture.get(0)?.end()..].to_owned();
            }
        }
        message = closer.replace(&message, "").trim().chars().take(300).collect();
        return Some(Todo {
            file: file.to_owned(),
            line,
            col: source[..hit.start()].encode_utf16().count() + 1,
            tag,
            owner: (!owner.is_empty()).then(|| owner.trim_start_matches('@').to_lowercase()),
            message,
            text: source.trim().chars().take(300).collect(),
        });
    }
    None
}
