const PLATFORM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

type DateInput = string | number | Date | null | undefined

function parseDate(value: DateInput) {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatWithOptions(value: DateInput, options: Intl.DateTimeFormatOptions) {
  const date = parseDate(value)
  if (!date) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: PLATFORM_TIME_ZONE,
    ...options,
  }).format(date)
}

export function formatDate(value: DateInput) {
  return formatWithOptions(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTime(value: DateInput) {
  return formatWithOptions(value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDateTime(value: DateInput) {
  return formatWithOptions(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
