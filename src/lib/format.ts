const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function parseEventDate(date: string, time?: string) {
  return new Date(`${date}T${time ?? '00:00'}`)
}

export function dayBlock(date: string) {
  const d = parseEventDate(date)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS[d.getMonth()],
    weekday: DAYS[d.getDay()],
  }
}

export function formatDate(date: string) {
  const d = parseEventDate(date)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatShortDate(date: string) {
  const d = parseEventDate(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatTimeRange(start: string, end: string) {
  return `${to12(start)} – ${to12(end)}`
}

export function to12(t: string) {
  const [hRaw, m] = t.split(':')
  const h = Number(hRaw)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${m}${suffix}`
}

export function relativeDay(date: string) {
  const target = parseEventDate(date)
  const today = new Date()
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 864e5)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)} days ago`
  if (diff < 7) return `In ${diff} days`
  return formatShortDate(date)
}

export function isPast(date: string, endTime?: string) {
  return parseEventDate(date, endTime).getTime() < Date.now()
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

export const BADGES: {
  key: string
  name: string
  test: (p: { points: number; attended: number; hosted: number }) => boolean
  hint: string
}[] = [
  {
    key: 'first',
    name: 'First Steps',
    test: (s) => s.attended >= 1,
    hint: 'Attend one verified event',
  },
  {
    key: 'regular',
    name: 'Regular',
    test: (s) => s.attended >= 5,
    hint: 'Attend five verified events',
  },
  { key: 'host', name: 'Host', test: (s) => s.hosted >= 1, hint: 'Host one verified event' },
  {
    key: 'organiser',
    name: 'Organiser',
    test: (s) => s.hosted >= 3,
    hint: 'Host three verified events',
  },
  {
    key: 'century',
    name: 'Century',
    test: (s) => s.points >= 100,
    hint: 'Reach 100 participation points',
  },
  {
    key: 'hub',
    name: 'Community Hub',
    test: (s) => s.points >= 250,
    hint: 'Reach 250 participation points',
  },
]
