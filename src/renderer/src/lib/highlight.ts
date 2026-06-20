import hljs from 'highlight.js'

/** Lowercase file extension (no dot), or '' when none. */
export function fileExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

/** HTML-escape the three characters that matter inside a text node. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Map a filename to a highlight.js language id, or '' when unknown. */
export function guessLanguage(filename: string): string {
  const ext = fileExt(filename)
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript', py: 'python', rb: 'ruby', go: 'go',
    rs: 'rust', java: 'java', cpp: 'cpp', cc: 'cpp', c: 'c', h: 'cpp',
    cs: 'csharp', php: 'php', swift: 'swift', kt: 'kotlin', scala: 'scala',
    sh: 'bash', bash: 'bash', zsh: 'bash', json: 'json', xml: 'xml',
    html: 'xml', htm: 'xml', vue: 'xml', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', markdown: 'markdown', yml: 'yaml', yaml: 'yaml',
    toml: 'ini', ini: 'ini', sql: 'sql', r: 'r', dart: 'dart', lua: 'lua',
    pl: 'perl', dockerfile: 'dockerfile', makefile: 'makefile'
  }
  return map[ext] || ''
}

/** Syntax-highlight a single line to HTML, falling back to plain escaped text
 *  when the language is unknown or highlight.js throws. */
export function highlightLine(text: string, lang: string): string {
  if (!lang || !hljs.getLanguage(lang)) return escapeHtml(text)
  try {
    return hljs.highlight(text, { language: lang }).value
  } catch {
    return escapeHtml(text)
  }
}
