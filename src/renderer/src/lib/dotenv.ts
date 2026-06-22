/** Parse a pasted `.env` blob into key/value pairs.
 *
 *  Lenient on purpose — people paste messy files. Rules:
 *  - blank lines and `#` comment lines are dropped
 *  - an optional leading `export ` is stripped
 *  - the key is everything before the first `=`; lines without `=` or with an
 *    empty key are skipped
 *  - surrounding matching quotes (single or double) are removed; inside double
 *    quotes `\n`/`\t`/`\r` escapes are unescaped
 *  - for unquoted values a trailing ` # comment` is stripped
 *  Later duplicates of the same key win. */
export interface ParsedEnv {
  key: string
  value: string
}

export function parseDotenv(text: string): ParsedEnv[] {
  const out = new Map<string, string>()
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('export ')) line = line.slice(7).trimStart()

    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!key) continue

    let value = line.slice(eq + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
      value = value.slice(1, -1)
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    } else {
      // strip an inline comment that follows whitespace
      const hash = value.search(/\s#/)
      if (hash >= 0) value = value.slice(0, hash).trimEnd()
    }
    out.set(key, value)
  }
  return [...out.entries()].map(([key, value]) => ({ key, value }))
}
