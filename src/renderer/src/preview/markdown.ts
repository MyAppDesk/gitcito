import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

// GitHub-ish defaults: hard line breaks off, GFM on (tables, autolinks, etc).
marked.setOptions({ gfm: true, breaks: false })

/** Sanitize arbitrary HTML (e.g. converted .docx) for dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
}

/** Render markdown to sanitized HTML, with syntax-highlighted code blocks.
 *  Output is safe to pass to dangerouslySetInnerHTML — DOMPurify strips any
 *  scripts/handlers (matters since AI output and repo files are untrusted). */
export function renderMarkdown(src: string): string {
  const raw = marked.parse(src, { async: false }) as string
  const clean = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] })
  // Highlight fenced code after sanitizing (operates on a detached fragment).
  const tpl = document.createElement('template')
  tpl.innerHTML = clean
  tpl.content.querySelectorAll('pre code').forEach((el) => {
    const lang = [...el.classList].find((c) => c.startsWith('language-'))?.slice(9)
    try {
      el.innerHTML =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(el.textContent || '', { language: lang }).value
          : hljs.highlightAuto(el.textContent || '').value
      el.classList.add('hljs')
    } catch {
      /* leave plain on highlight failure */
    }
  })
  return tpl.innerHTML
}
