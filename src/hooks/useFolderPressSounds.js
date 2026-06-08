import { useCallback, useEffect, useRef, useState } from 'react'
import { playFolderHoverTap, playFolderOpenSwish } from '../utils/folderSounds'

const MOBILE_MQ = '(max-width: 820px)'
const LONG_PRESS_MS = 450

export function useFolderPressSounds(onOpen) {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches,
  )
  const longPressTimer = useRef(null)
  const longPressFired = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const onMouseEnter = useCallback(() => {
    if (!mobile) playFolderHoverTap()
  }, [mobile])

  const onTouchStart = useCallback(() => {
    if (!mobile) return
    longPressFired.current = false
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      playFolderHoverTap()
    }, LONG_PRESS_MS)
  }, [mobile, clearLongPress])

  const onTouchEnd = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  const onTouchMove = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  const open = useCallback(() => {
    if (mobile && longPressFired.current) {
      longPressFired.current = false
      return
    }
    playFolderOpenSwish()
    onOpen()
  }, [mobile, onOpen])

  return {
    onMouseEnter,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    open,
  }
}
