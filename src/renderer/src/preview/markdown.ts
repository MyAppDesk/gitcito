import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'

// GitHub-ish defaults: hard line breaks off, GFM on (tables, autolinks, etc).
marked.setOptions({ gfm: true, breaks: false })

/** Sanitize arbitrary HTML (e.g. converted .docx) for dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ADD_ATTR: ['target'] })
}

// DOMPurify's default URI filter, extended with `file:`. In the packaged app
// the window is loaded via file://, so bundled images resolve to absolute
// file:// URLs which the default filter would strip. Only used for trusted,
// bundled content (the handbook) — never for repo files or AI output.
const URI_WITH_FILE =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|file):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i

/** Render markdown to sanitized HTML, with syntax-highlighted code blocks.
 *  Output is safe to pass to dangerouslySetInnerHTML — DOMPurify strips any
 *  scripts/handlers (matters since AI output and repo files are untrusted).
 *  `allowFileMedia` must only be set for content bundled with the app. */
export function renderMarkdown(src: string, opts?: { allowFileMedia?: boolean }): string {
  const raw = marked.parse(src, { async: false }) as string
  const clean = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target'],
    ...(opts?.allowFileMedia ? { ALLOWED_URI_REGEXP: URI_WITH_FILE } : {})
  })
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
