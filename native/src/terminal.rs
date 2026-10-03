use std::io::{Read, Write};
use std::path::Path;
use std::sync::mpsc::{self, Receiver, TryRecvError};
use std::thread;

use eframe::egui::Color32;
use portable_pty::{
    Child, ChildKiller, CommandBuilder, MasterPty, PtySize, native_pty_system,
};

pub struct TerminalSpan {
    pub text: String,
    pub foreground: Color32,
    pub background: Color32,
    pub bold: bool,
    pub italic: bool,
}

pub struct TerminalSession {
    parser: vt100::Parser,
    output: Receiver<Vec<u8>>,
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    _child: Box<dyn Child + Send + Sync>,
    size: (u16, u16),
    exited: bool,
    styled_cache: Vec<Vec<TerminalSpan>>,
    screen_dirty: bool,
}

impl TerminalSession {
    pub fn spawn(cwd: &Path) -> Result<Self, String> {
        let system = native_pty_system();
        let size = (24, 80);
        let pair = system.openpty(PtySize {
            rows: size.0,
            cols: size.1,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|error| error.to_string())?;
        let shell = default_shell();
        let mut command = CommandBuilder::new(&shell);
        command.cwd(cwd);
        command.env("TERM", "xterm-256color");
        #[cfg(unix)]
        command.arg("-l");
        let child = pair.slave.spawn_command(command).map_err(|error| error.to_string())?;
        let killer = child.clone_killer();
        let mut reader = pair.master.try_clone_reader().map_err(|error| error.to_string())?;
        let writer = pair.master.take_writer().map_err(|error| error.to_string())?;
        let master = pair.master;
        let (sender, output) = mpsc::channel();
        thread::spawn(move || {
            let mut buffer = [0u8; 8192];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) | Err(_) => break,
                    Ok(length) => if sender.send(buffer[..length].to_vec()).is_err() { break; },
                }
            }
        });
        Ok(Self {
            parser: vt100::Parser::new(size.0, size.1, 10_000),
            output,
            writer,
            master,
            killer,
            _child: child,
            size,
            exited: false,
            styled_cache: Vec::new(),
            screen_dirty: true,
        })
    }

    pub fn poll(&mut self) -> bool {
        let mut changed = false;
        loop {
            match self.output.try_recv() {
                Ok(bytes) => { self.parser.process(&bytes); changed = true; }
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => { self.exited = true; break; }
            }
        }
        self.screen_dirty |= changed;
        changed
    }

    pub fn send(&mut self, bytes: &[u8]) {
        if self.exited { return; }
        if self.writer.write_all(bytes).and_then(|_| self.writer.flush()).is_err() {
            self.exited = true;
        }
    }

    pub fn paste(&mut self, text: &str) {
        if self.parser.screen().bracketed_paste() {
            self.send(format!("\x1b[200~{text}\x1b[201~").as_bytes());
        } else {
            self.send(text.as_bytes());
        }
    }

    pub fn scrollback_by(&mut self, rows: i32) {
        let current = self.parser.screen().scrollback() as i32;
        self.parser.screen_mut().set_scrollback((current + rows).max(0) as usize);
        self.screen_dirty = true;
    }

    pub fn alternate_screen(&self) -> bool { self.parser.screen().alternate_screen() }

    pub fn is_scrolled_back(&self) -> bool { self.parser.screen().scrollback() > 0 }

    pub fn cursor(&self) -> (u16, u16, bool) {
        let screen = self.parser.screen();
        let (row, col) = screen.cursor_position();
        (row, col, screen.hide_cursor())
    }

    pub fn resize(&mut self, rows: u16, cols: u16) {
        let rows = rows.max(1);
        let cols = cols.max(1);
        if self.size == (rows, cols) { return; }
        if self.master.resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 }).is_ok() {
            self.parser.screen_mut().set_size(
                rows,
                cols,
            );
            self.size = (rows, cols);
            self.screen_dirty = true;
        }
    }

    pub fn styled_rows(&mut self) -> &[Vec<TerminalSpan>] {
        if self.screen_dirty {
            self.styled_cache = (0..self.size.0).map(|row| {
            (0..self.size.1).filter_map(|col| {
                let cell = self.parser.screen().cell(row, col)?;
                if cell.is_wide_continuation() { return None; }
                let mut foreground = terminal_color(cell.fgcolor(), true);
                let mut background = terminal_color(cell.bgcolor(), false);
                if cell.inverse() { std::mem::swap(&mut foreground, &mut background); }
                Some(TerminalSpan {
                    text: if cell.contents().is_empty() { " ".into() } else { cell.contents().to_owned() },
                    foreground,
                    background,
                    bold: cell.bold(),
                    italic: cell.italic(),
                })
            }).collect()
            }).collect();
            self.screen_dirty = false;
        }
        &self.styled_cache
    }

    pub fn exited(&self) -> bool { self.exited }
}

fn terminal_color(color: vt100::Color, foreground: bool) -> Color32 {
    match color {
        vt100::Color::Default => if foreground { Color32::from_rgb(220, 224, 230) } else { Color32::from_rgb(18, 20, 24) },
        vt100::Color::Rgb(red, green, blue) => Color32::from_rgb(red, green, blue),
        vt100::Color::Idx(index) => {
            const BASIC: [[u8; 3]; 16] = [
                [0, 0, 0], [205, 49, 49], [13, 188, 121], [229, 229, 16],
                [36, 114, 200], [188, 63, 188], [17, 168, 205], [229, 229, 229],
                [102, 102, 102], [241, 76, 76], [35, 209, 139], [245, 245, 67],
                [59, 142, 234], [214, 112, 214], [41, 184, 219], [255, 255, 255],
            ];
            let [red, green, blue] = match index {
                0..=15 => BASIC[index as usize],
                16..=231 => {
                    let cube = index - 16;
                    let component = |value: u8| if value == 0 { 0 } else { 55 + value * 40 };
                    [component(cube / 36), component((cube / 6) % 6), component(cube % 6)]
                }
                _ => { let gray = 8 + (index - 232) * 10; [gray, gray, gray] }
            };
            Color32::from_rgb(red, green, blue)
        }
    }
}

impl Drop for TerminalSession {
    fn drop(&mut self) {
        let _ = self.killer.kill();
    }
}

fn default_shell() -> String {
    #[cfg(windows)]
    { std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".into()) }
    #[cfg(not(windows))]
    { std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into()) }
}
