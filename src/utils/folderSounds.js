let tapSound = null
let swishSound = null

export function playFolderHoverTap() {
  if (typeof window === 'undefined') return
  try {
    if (!tapSound) tapSound = new Audio('/tap.mpeg')
    tapSound.currentTime = 0
    const p = tapSound.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* autoplay policy or missing file */
  }
}

export function playFolderOpenSwish() {
  if (typeof window === 'undefined') return
  try {
    if (!swishSound) swishSound = new Audio('/swish.mp3')
    swishSound.currentTime = 0
    const p = swishSound.play()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch {
    /* autoplay policy or missing file */
  }
}
