// Turns a simple recurrence rule into a list of dated occurrences. Kept
// deliberately small (weekly / biweekly / monthly, ending after N times or
// on a date) because that covers the vast majority of real contractor
// cases — recurring maintenance visits, monthly service retainers — without
// the complexity of a full RRULE implementation.

export const FREQ_LABEL = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
}

// Hard ceiling so a mistyped end date (e.g. 10 years out, weekly) can't
// silently generate thousands of records.
const MAX_OCCURRENCES = 24

export function emptyRecurrence() {
  return { enabled: false, freq: 'monthly', endType: 'count', count: 6, endDate: '' }
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

function nextDate(current, freq) {
  // Parsed as local midnight via 'YYYY-MM-DDT00:00:00' to avoid UTC
  // day-shift bugs when the date string alone is passed to `new Date()`.
  const d = new Date(`${current}T00:00:00`)
  if (freq === 'weekly') return toDateStr(addDays(d, 7))
  if (freq === 'biweekly') return toDateStr(addDays(d, 14))
  return toDateStr(addMonths(d, 1)) // monthly
}

// Returns an array of date strings starting at `startDate` (inclusive),
// stepping by the recurrence's frequency, stopping at whichever comes
// first: the count limit, the end date, or MAX_OCCURRENCES.
export function generateOccurrences(startDate, recurrence) {
  if (!startDate) return []
  if (!recurrence?.enabled) return [startDate]

  const dates = [startDate]
  let current = startDate
  const limit = recurrence.endType === 'count'
    ? Math.min(Number(recurrence.count) || 1, MAX_OCCURRENCES)
    : MAX_OCCURRENCES

  while (dates.length < limit) {
    current = nextDate(current, recurrence.freq)
    if (recurrence.endType === 'date' && recurrence.endDate && current > recurrence.endDate) break
    dates.push(current)
  }

  return dates
}

export function daysBetween(a, b) {
  const d1 = new Date(`${a}T00:00:00`)
  const d2 = new Date(`${b}T00:00:00`)
  return Math.round((d2 - d1) / 86400000)
}

export function shiftDate(dateStr, days) {
  if (!dateStr) return dateStr
  return toDateStr(addDays(new Date(`${dateStr}T00:00:00`), days))
}
