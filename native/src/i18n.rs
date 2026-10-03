use std::collections::HashMap;
use std::sync::OnceLock;

type Dictionaries = HashMap<String, HashMap<String, String>>;

static DICTIONARIES: OnceLock<Dictionaries> = OnceLock::new();

pub fn translate(language: &str, key: &str) -> &'static str {
    let dictionaries = DICTIONARIES.get_or_init(|| {
        serde_json::from_str(include_str!("translations.json"))
            .expect("native translation catalog must be valid JSON")
    });
    dictionaries.get(language)
        .and_then(|dictionary| dictionary.get(key))
        .or_else(|| dictionaries.get("en").and_then(|dictionary| dictionary.get(key)))
        .map(String::as_str)
        .unwrap_or("[missing translation]")
}

pub fn translate_interpolated(language: &str, key: &str, values: &[(&str, String)]) -> String {
    values.iter().fold(translate(language, key).to_owned(), |text, (name, value)| {
        text.replace(&format!("{{{name}}}"), value)
    })
}
