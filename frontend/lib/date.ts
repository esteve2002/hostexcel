import * as XLSX from 'xlsx'

export function parseFlexibleDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }

  const text = String(value).trim()
  if (!text) return null

  if (/^\d+(\.\d+)?$/.test(text)) {
    const parsed = XLSX.SSF.parse_date_code(Number(text))
    if (!parsed) return null
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
  }

  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

export function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
}
