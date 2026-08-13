export function parseDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) { return { date: '', time: '' } }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/)
  if (match) { return { date: match[1], time: match[2] || '' } }
  return { date: '', time: '' }
}

export function combineDateTime(date: string, time: string): string {
  if (!date) { return '' }
  if (!time) { return date }
  return `${date}T${time}:00`
}
