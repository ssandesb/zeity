export const CHARS_PER_PAGE = 260

export function splitIntoPages(text) {
  if (!text) return ['']
  const pages = []
  let i = 0
  while (i < text.length) {
    let end = Math.min(i + CHARS_PER_PAGE, text.length)
    if (end < text.length) {
      const slice = text.slice(i, end)
      const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '))
      if (lastBreak > CHARS_PER_PAGE * 0.45) {
        end = i + lastBreak + 1
      }
    }
    pages.push(text.slice(i, end))
    i = end
  }
  return pages.length ? pages : ['']
}

export function replacePageText(pages, pageIndex, newText) {
  const next = [...pages]
  next[pageIndex] = newText
  return next.join('')
}
