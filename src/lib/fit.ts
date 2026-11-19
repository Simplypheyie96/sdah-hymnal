import { useLayoutEffect, type RefObject } from 'react'

/**
 * Shrinks the text inside `box` until it fits, so a long verse is never cut
 * off on a short screen (a phone turned sideways, a projector). Starts from the
 * size the stylesheet gives it and only ever goes smaller.
 */
export function useFitText(box: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, key: unknown) {
  useLayoutEffect(() => {
    const b = box.current
    const t = text.current
    if (!b || !t) return
    const fit = () => {
      t.style.fontSize = ''
      const cs = getComputedStyle(b)
      const h = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      const w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      let size = parseFloat(getComputedStyle(t).fontSize)
      while (size > 14 && (t.scrollHeight > h || t.scrollWidth > w)) {
        size -= 2
        t.style.fontSize = `${size}px`
      }
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    window.addEventListener('resize', fit)
    void document.fonts?.ready.then(fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [box, text, key])
}
