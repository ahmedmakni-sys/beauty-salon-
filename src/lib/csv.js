// Export CSV compatible Excel (séparateur ";" et BOM UTF-8 pour les accents).
function cell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(cell).join(';'), ...rows.map((r) => r.map(cell).join(';'))]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const todayStamp = () => new Date().toISOString().slice(0, 10)
