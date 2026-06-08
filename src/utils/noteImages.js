const IMAGE_MARKER_RE = /!\[\]\(([\w.\-]+)\)/g

export function extractImageFilenames(text) {
  return [...(text || '').matchAll(IMAGE_MARKER_RE)].map((m) => m[1])
}

export function stripImageMarkers(text) {
  return (text || '')
    .replace(/ ?!\[\]\([\w.\-]+\) ?/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function reconstructNoteText(displayText, filenames) {
  const base = (displayText || '').trimEnd()
  if (!filenames?.length) return base
  const markers = filenames.map((fn) => `![](${fn})`).join('\n')
  return base ? `${base}\n${markers}` : markers
}

export function noteHasContent(text) {
  return Boolean(stripImageMarkers(text).trim() || extractImageFilenames(text).length)
}
