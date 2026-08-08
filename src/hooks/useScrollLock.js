import { useEffect } from 'react'

// Shared across every instance of this hook so that if two overlays are
// ever open at once (e.g. a modal opened from inside the cart drawer) the
// first one to close doesn't unlock the page while the second is still open.
let lockCount = 0
let scrollY = 0

// Locks the page in place while `active` is true — used by any modal,
// drawer, or sidebar so the content behind it can't be scrolled.
//
// Plain `overflow: hidden` on <body> stops the scrollbar but iOS Safari
// still lets the page rubber-band/scroll behind fixed elements, which is
// what caused the sidebar to visually "lose" a strip at the bottom while
// scrolling — the browser's address bar collapses mid-scroll, the viewport
// resizes, and a fixed `h-full` panel no longer lines up with the page
// behind it. Pinning <body> itself with `position: fixed` removes the
// scroll entirely (nothing behind the panel can move), and we restore the
// exact scroll position on close.
export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined

    if (lockCount === 0) {
      scrollY = window.scrollY
      const { style } = document.body
      style.position = 'fixed'
      style.top = `-${scrollY}px`
      style.left = '0'
      style.right = '0'
      style.overflow = 'hidden'
    }
    lockCount += 1

    return () => {
      lockCount -= 1
      if (lockCount === 0) {
        const { style } = document.body
        style.position = ''
        style.top = ''
        style.left = ''
        style.right = ''
        style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [active])
}
