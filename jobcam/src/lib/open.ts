/**
 * Safari and other mobile browsers block window.open() that happens after an `await`. Open the
 * window synchronously inside the click handler, then fill it once the document is ready.
 */
export function openPending(): Window | null {
  const w = window.open('', '_blank')
  if (w) w.document.write('<p style="font:16px system-ui;padding:24px;color:#475569">Building your document…</p>')
  return w
}

export function showHtml(w: Window | null, html: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  if (w && !w.closed) w.location.href = url
  else {
    // popup blocked: fall back to a download so the user still gets the document
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
}
