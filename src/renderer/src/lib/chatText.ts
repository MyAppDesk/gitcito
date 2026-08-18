/** Tokenizing chat message text so the panel can make URLs clickable and
 *  image mentions hoverable. The tokenizer is pure; `annotateChatHtml` applies
 *  the same tokens to already-sanitized markdown HTML. */

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif'])

export type ChatTextToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string; image: boolean }
  | { kind: 'image'; value: string }

/** True when the value (URL or path) ends in a known image extension. */
export function isImageRef(value: string): boolean {
  const clean = value.replace(/[?#].*$/, '')
  const dot = clean.lastIndexOf('.')
  return dot > 0 && IMAGE_EXTS.has(clean.slice(dot + 1).toLowerCase())
}

// One combined scan keeps token order stable: URLs first (so an image URL is a
// link, not a bare path), then repo-relative paths ending in an image extension.
const URL_PART = String.raw`https?:\/\/[^\s<>"']+`
const PATH_PART = String.raw`(?:[\w.@+-]+[\\/])*[\w.@+-]+\.(?:png|jpe?g|gif|webp|bmp|ico|svg|avif)\b`
const TOKEN_RE = new RegExp(`${URL_PART}|${PATH_PART}`, 'gi')

/** Split plain chat text into text / link / image-path tokens. */
export function tokenizeChatText(text: string): ChatTextToken[] {
  const out: ChatTextToken[] = []
  let last = 0
  TOKEN_RE.lastIndex = 0
  for (let m = TOKEN_RE.exec(text); m; m = TOKEN_RE.exec(text)) {
    let value = m[0]
    // Sentence punctuation after a URL is prose, not part of the address.
    if (/^https?:/i.test(value)) value = value.replace(/[.,;:!?)\]'"»›]+$/, '')
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) })
    if (/^https?:/i.test(value)) out.push({ kind: 'link', value, image: isImageRef(value) })
    else out.push({ kind: 'image', value })
    last = m.index + value.length
    TOKEN_RE.lastIndex = last
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) })
  return out
}

/** Marks image mentions in rendered assistant HTML with `data-img` so the
 *  panel's delegated hover handler can attach a preview. Runs after DOMPurify
 *  and only adds inert spans, classes and data attributes. */
export function annotateChatHtml(html: string): string {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  tpl.content.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (/^https?:/i.test(href) && isImageRef(href)) {
      a.classList.add('repo-chat-img-ref')
      a.setAttribute('data-img', href)
    }
  })
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text)
  for (const node of texts) {
    // Links are handled above; code blocks keep their exact text untouched.
    if (node.parentElement?.closest('a, pre')) continue
    const tokens = tokenizeChatText(node.textContent ?? '')
    if (!tokens.some((tok) => tok.kind !== 'text')) continue
    const frag = document.createDocumentFragment()
    for (const tok of tokens) {
      if (tok.kind === 'text') {
        frag.append(tok.value)
      } else if (tok.kind === 'link') {
        const a = document.createElement('a')
        a.setAttribute('href', tok.value)
        a.textContent = tok.value
        if (tok.image) {
          a.classList.add('repo-chat-img-ref')
          a.setAttribute('data-img', tok.value)
        }
        frag.append(a)
      } else {
        const span = document.createElement('span')
        span.className = 'repo-chat-img-ref'
        span.setAttribute('data-img', tok.value)
        span.textContent = tok.value
        frag.append(span)
      }
    }
    node.replaceWith(frag)
  }
  return tpl.innerHTML
}
