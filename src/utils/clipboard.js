// navigator.clipboard requires a secure context (HTTPS or localhost) —
// a typical XAMPP dev setup accessed over plain HTTP on a LAN IP doesn't
// count, hence the execCommand fallback below.
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) throw new Error('Copy command was blocked by the browser.')
  } finally {
    document.body.removeChild(textarea)
  }
}
