const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/**
 * Parses a timezone-less ISO date-time (yyyy-MM-ddTHH:mm[:ss]) into a Date
 * whose UTC fields hold the same wall-clock values. This is how the value is
 * stored in the "timestamp without time zone" column.
 * @returns {Date|null} null when the text is not a real date-time
 */
export function parseLocalDateTime(value) {
  const match = LOCAL_DATE_TIME.exec(value)
  if (!match) {
    return null
  }

  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number)
  const second = Number(match[6] ?? 0)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))

  const isReal =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hour < 24 &&
    minute < 60 &&
    second < 60

  return isReal ? date : null
}

/** Formats a stored Date back to yyyy-MM-ddTHH:mm:ss (no timezone) */
export function formatLocalDateTime(date) {
  return date.toISOString().slice(0, 19)
}

export function serializeTask(task) {
  return {
    id: Number(task.id),
    title: task.title,
    description: task.description,
    status: task.status,
    dueDateTime: formatLocalDateTime(task.due_date_time),
    createdAt: task.created_at.toISOString()
  }
}
