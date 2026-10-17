import type {
  AttendanceDispute,
  CampusEvent,
  CollabRequest,
  PointsEntry,
  Profile,
  Registration,
} from '../types'

const KEY = 'collabsphere.demo.v3'

export interface DemoDB {
  profiles: Profile[]
  events: CampusEvent[]
  registrations: Registration[]
  collabs: CollabRequest[]
  points: PointsEntry[]
  disputes: AttendanceDispute[]
  credentials: Record<string, string>
  session: string | null
}

export const uid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

export const token = () =>
  Array.from(
    { length: 16 },
    () => 'ABCDEFGHJKMNPQRSTVWXYZ23456789'[Math.floor(Math.random() * 30)],
  ).join('')

const iso = (d: Date) => d.toISOString()
const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function seed(): DemoDB {
  const now = iso(new Date())

  const profiles: Profile[] = [
    {
      id: 'u-admin',
      full_name: 'Ananya Rao',
      email: 'admin@collabsphere.in',
      house: 'Ganga',
      society: 'DevSoc',
      city: 'Chennai',
      role: 'admin',
      points: 240,
      bio: 'Community operations lead for the Chennai cluster.',
      cohort: 'BS Data Science · 2024',
      created_at: now,
    },
    {
      id: 'u-org',
      full_name: 'Karthik Iyer',
      email: 'organizer@collabsphere.in',
      house: 'Yamuna',
      society: 'E-Cell IITM',
      city: 'Bengaluru',
      role: 'organizer',
      points: 185,
      bio: 'Organises co-working sprints across Bengaluru.',
      cohort: 'BS Electronic Systems · 2024',
      created_at: now,
    },
    {
      id: 'u-student',
      full_name: 'Meera Krishnan',
      email: 'student@collabsphere.in',
      house: 'Kaveri',
      society: 'Aavesam',
      city: 'Chennai',
      role: 'student',
      points: 92,
      bio: 'Weekend vocalist, weekday debugger.',
      cohort: 'BS Computer Science · 2025',
      created_at: now,
    },
    {
      id: 'u-3',
      full_name: 'Rohan Deshpande',
      email: 'rohan@example.in',
      house: 'Godavari',
      city: 'Pune',
      role: 'student',
      points: 148,
      cohort: 'BS Mathematics · 2024',
      created_at: now,
    },
    {
      id: 'u-4',
      full_name: 'Sana Fathima',
      email: 'sana@example.in',
      house: 'Krishna',
      society: 'Nexus Design',
      city: 'Hyderabad',
      role: 'student',
      points: 121,
      cohort: 'BS Humanities · 2025',
      created_at: now,
    },
    {
      id: 'u-5',
      full_name: 'Dev Patel',
      email: 'dev@example.in',
      house: 'Narmada',
      society: 'Robotics Club',
      city: 'Mumbai',
      role: 'organizer',
      points: 167,
      cohort: 'BS Electronic Systems · 2023',
      created_at: now,
    },
    {
      id: 'u-6',
      full_name: 'Ishita Nair',
      email: 'ishita@example.in',
      house: 'Ganga',
      city: 'Singapore',
      role: 'student',
      points: 74,
      cohort: 'BS Data Science · 2025',
      created_at: now,
    },
    {
      id: 'u-7',
      full_name: 'Arjun Menon',
      email: 'arjun@example.in',
      house: 'Yamuna',
      society: 'DevSoc',
      city: 'Dubai',
      role: 'student',
      points: 66,
      cohort: 'BS Computer Science · 2024',
      created_at: now,
    },
  ]

  const mk = (e: Omit<CampusEvent, 'id' | 'created_at'> & { id?: string }): CampusEvent =>
    ({
      id: e.id ?? uid(),
      created_at: now,
      ...e,
    }) as CampusEvent

  const events: CampusEvent[] = [
    mk({
      id: 'e-1',
      title: 'Chennai Bay Area Co-working Sprint',
      description:
        'A focused four-hour co-working block at Besant Nagar followed by a coastal walk. Bring your laptop, a problem you are stuck on, and leave with two new accountability partners. Open to every house and every study centre.',
      type: 'coworking',
      status: 'approved',
      date: day(3),
      start_time: '09:30',
      end_time: '13:30',
      venue: 'The Hive, Besant Nagar',
      city: 'Chennai',
      lat: 13.0317,
      lng: 80.2635,
      capacity: 24,
      host_id: 'u-admin',
      house: 'Ganga',
      society: 'DevSoc',
      collab_orgs: ['Yamuna', 'E-Cell IITM'],
      cohost_ids: ['u-org'],
      points_value: 30,
    }),
    mk({
      id: 'e-2',
      title: 'Bengaluru Study Circle: Probability Sprint',
      description:
        'Work through the Week 6 probability problem set together. Two mentors circulate to unblock doubts. Ideal if you are behind on the graded assignment.',
      type: 'study-group',
      status: 'approved',
      date: day(1),
      start_time: '18:00',
      end_time: '20:30',
      venue: 'Church Street Social',
      city: 'Bengaluru',
      lat: 12.9756,
      lng: 77.6068,
      capacity: 18,
      host_id: 'u-org',
      house: 'Yamuna',
      collab_orgs: ['Godavari'],
      cohost_ids: [],
      points_value: 25,
    }),
    mk({
      id: 'e-3',
      title: 'Hyderabad Cross-House Demo Night',
      description:
        'Six five-minute demos from students across four houses, then open networking. Submit a demo when you register — slots are allotted first-come.',
      type: 'meetup',
      status: 'approved',
      date: day(6),
      start_time: '17:30',
      end_time: '20:00',
      venue: 'WeWork Galaxy, Banjara Hills',
      city: 'Hyderabad',
      lat: 17.4126,
      lng: 78.4392,
      capacity: 40,
      host_id: 'u-4',
      house: 'Krishna',
      society: 'Nexus Design',
      collab_orgs: ['Ganga', 'Kaveri', 'DevSoc'],
      cohost_ids: ['u-admin'],
      points_value: 35,
    }),
    mk({
      id: 'e-4',
      title: 'Mumbai Harbour Hackathon Kickoff',
      description:
        'An in-person team-formation and kickoff for the 36-hour remote build sprint. Teams of four, mixed across houses and cohorts. Mentors on site for the first two hours.',
      type: 'hackathon',
      status: 'approved',
      date: day(9),
      start_time: '10:00',
      end_time: '14:00',
      venue: 'CODE, Lower Parel',
      city: 'Mumbai',
      lat: 19.0176,
      lng: 72.8562,
      capacity: 32,
      host_id: 'u-5',
      house: 'Narmada',
      society: 'Robotics Club',
      collab_orgs: ['Yamuna'],
      cohost_ids: [],
      points_value: 40,
    }),
    mk({
      id: 'e-5',
      title: 'Pune Portfolio Review Meetup',
      description:
        'Peer review of resumes and project portfolios in pairs. Bring one project you are proud of and one you abandoned — both are useful material.',
      type: 'meetup',
      status: 'approved',
      date: day(12),
      start_time: '16:00',
      end_time: '18:00',
      venue: 'Banganaka, Koregaon Park',
      city: 'Pune',
      lat: 18.5362,
      lng: 73.8939,
      capacity: 20,
      host_id: 'u-3',
      house: 'Godavari',
      collab_orgs: [],
      cohost_ids: [],
      points_value: 25,
    }),
    mk({
      id: 'e-6',
      title: 'Singapore Regional Coffee & Code',
      description:
        'A relaxed Saturday morning session for IITM BS students in Singapore. Pair up, pick a shared goal, ship something before noon.',
      type: 'coworking',
      status: 'approved',
      date: day(5),
      start_time: '10:00',
      end_time: '12:30',
      venue: 'National Library, Victoria Street',
      city: 'Singapore',
      lat: 1.2906,
      lng: 103.8519,
      capacity: 14,
      host_id: 'u-6',
      house: 'Ganga',
      collab_orgs: [],
      cohost_ids: [],
      points_value: 25,
    }),
    mk({
      id: 'e-7',
      title: 'Dubai Career Storytelling Workshop',
      description:
        'Rewrite your internship story using a simple three-beat structure, then rehearse it out loud with a partner. Hosted with the E-Cell mentoring circle.',
      type: 'workshop',
      status: 'approved',
      date: day(8),
      start_time: '19:00',
      end_time: '21:00',
      venue: 'D3 Building 6, Al Quoz',
      city: 'Dubai',
      lat: 25.1872,
      lng: 55.2995,
      capacity: 22,
      host_id: 'u-7',
      house: 'Yamuna',
      society: 'E-Cell IITM',
      collab_orgs: ['Narmada'],
      cohost_ids: [],
      points_value: 30,
    }),
    mk({
      id: 'e-8',
      title: 'Kolkata Sunset Social: Board Games',
      description:
        'An unhurried evening of board games and chai. No prep required, and a good first event if you have never attended a CollabSphere meetup.',
      type: 'social',
      status: 'approved',
      date: day(15),
      start_time: '17:00',
      end_time: '20:00',
      venue: 'The Tea Stop, Park Street',
      city: 'Kolkata',
      lat: 22.5537,
      lng: 88.3526,
      capacity: 16,
      host_id: 'u-4',
      house: 'Krishna',
      collab_orgs: [],
      cohost_ids: [],
      points_value: 20,
    }),
    mk({
      id: 'e-9',
      title: 'Coimbatore Mid-week Doubt Clinic',
      description:
        'Drop in with your stuck questions from the current graded week. Mentors from the Data Science cohort rotate through every table.',
      type: 'study-group',
      status: 'pending',
      date: day(4),
      start_time: '18:30',
      end_time: '20:30',
      venue: 'The Workstation, Race Course',
      city: 'Coimbatore',
      lat: 11.0056,
      lng: 76.9824,
      capacity: 20,
      host_id: 'u-org',
      house: 'Yamuna',
      collab_orgs: ['Kaveri'],
      cohost_ids: [],
      points_value: 25,
    }),
    mk({
      id: 'e-10',
      title: 'Delhi NCR Cross-House Leadership Circle',
      description:
        'A facilitated conversation for student organisers on running inclusive events across houses. Includes a ready-to-use event checklist.',
      type: 'meetup',
      status: 'pending',
      date: day(11),
      start_time: '11:00',
      end_time: '13:00',
      venue: 'Hauz Khas Social',
      city: 'Delhi',
      lat: 28.5494,
      lng: 77.2,
      capacity: 26,
      host_id: 'u-5',
      house: 'Narmada',
      society: 'E-Cell IITM',
      collab_orgs: ['Ganga', 'DevSoc'],
      cohost_ids: [],
      points_value: 30,
    }),
    mk({
      id: 'e-11',
      title: 'Bengaluru Workshop: Git Without Fear',
      description:
        'A hands-on workshop covering branching, rebasing and resolving conflicts on a shared repository. Laptops required.',
      type: 'workshop',
      status: 'pending',
      date: day(14),
      start_time: '15:00',
      end_time: '17:30',
      venue: 'Bhive Workspace, Koramangala',
      city: 'Bengaluru',
      lat: 12.9345,
      lng: 77.6266,
      capacity: 30,
      host_id: 'u-org',
      house: 'Yamuna',
      society: 'DevSoc',
      collab_orgs: [],
      cohost_ids: [],
      points_value: 35,
    }),
    mk({
      id: 'e-12',
      title: 'Chennai Marina Morning Run Club',
      description:
        'A easy-paced 5 km group run along Marina followed by breakfast. All fitness levels welcome — walking counts.',
      type: 'social',
      status: 'approved',
      date: day(-4),
      start_time: '06:30',
      end_time: '08:30',
      venue: 'Marina Beach, Gandhi Statue',
      city: 'Chennai',
      lat: 13.0642,
      lng: 80.2835,
      capacity: 35,
      host_id: 'u-admin',
      house: 'Ganga',
      collab_orgs: ['Kaveri'],
      cohost_ids: ['u-student'],
      points_value: 20,
    }),
  ]

  const registrations: Registration[] = [
    {
      id: uid(),
      event_id: 'e-1',
      user_id: 'u-student',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-2',
      user_id: 'u-student',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-12',
      user_id: 'u-student',
      status: 'registered',
      token: token(),
      checked_in_at: iso(new Date(Date.now() - 4 * 864e5)),
      checkin_by: 'u-admin',
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-12',
      user_id: 'u-org',
      status: 'registered',
      token: token(),
      checked_in_at: iso(new Date(Date.now() - 4 * 864e5)),
      checkin_by: 'u-admin',
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-1',
      user_id: 'u-org',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-3',
      user_id: 'u-admin',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-6',
      user_id: 'u-7',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-4',
      user_id: 'u-student',
      status: 'registered',
      token: token(),
      checked_in_at: null,
      created_at: now,
    },
  ]

  const points: PointsEntry[] = [
    {
      id: uid(),
      user_id: 'u-student',
      event_id: 'e-12',
      points: 20,
      reason: 'Verified check-in · Marina Morning Run Club',
      created_at: iso(new Date(Date.now() - 4 * 864e5)),
    },
    {
      id: uid(),
      user_id: 'u-org',
      event_id: 'e-12',
      points: 20,
      reason: 'Verified check-in · Marina Morning Run Club',
      created_at: iso(new Date(Date.now() - 4 * 864e5)),
    },
    {
      id: uid(),
      user_id: 'u-admin',
      event_id: 'e-12',
      points: 30,
      reason: 'Hosted verified event · Marina Morning Run Club',
      created_at: iso(new Date(Date.now() - 4 * 864e5)),
    },
  ]

  const collabs: CollabRequest[] = [
    {
      id: uid(),
      event_id: 'e-4',
      requested_by: 'u-5',
      target_org: 'Ganga',
      message: 'Would love a Ganga co-host for the kickoff, we have 12 Ganga members registered.',
      status: 'pending',
      created_at: now,
    },
    {
      id: uid(),
      event_id: 'e-6',
      requested_by: 'u-6',
      target_org: 'DevSoc',
      message: 'Requesting DevSoc to co-brand the Singapore session.',
      status: 'pending',
      created_at: now,
    },
  ]

  const disputes: AttendanceDispute[] = [
    {
      id: uid(),
      event_id: 'e-12',
      user_id: 'u-3',
      note: 'I attended but my QR failed to scan at the gate.',
      status: 'open',
      created_at: now,
    },
  ]

  return {
    profiles,
    events,
    registrations,
    collabs,
    points,
    disputes,
    credentials: {
      'admin@collabsphere.in': 'admin123',
      'organizer@collabsphere.in': 'organizer123',
      'student@collabsphere.in': 'student123',
    },
    session: null,
  }
}

let cache: DemoDB | null = null

export function load(): DemoDB {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoDB
      if (parsed?.profiles?.length) {
        cache = parsed
        return cache
      }
    }
  } catch {
    /* fall through to seed */
  }
  cache = seed()
  persist()
  return cache
}

function persist() {
  if (!cache) return
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage unavailable — in-memory only */
  }
}

export function write<T>(fn: (db: DemoDB) => T): T {
  const db = load()
  const out = fn(db)
  persist()
  return out
}

export function resetDemo() {
  cache = seed()
  persist()
}
