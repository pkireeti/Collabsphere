import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/Shell'
import { Avatar, EmptyState, ErrorState, SectionHead, Skeleton } from '../components/ui'
import { IconSpark, IconTrophy } from '../components/icons'
import * as api from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Profile } from '../lib/types'

type Row = { house: string; points: number; members: number }

export default function Leaderboard() {
  const { user } = useAuth()
  const [overall, setOverall] = useState<Profile[]>([])
  const [houses, setHouses] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .leaderboard()
      .then((d) => {
        setOverall(d.overall)
        setHouses(d.houses)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const podium = overall.slice(0, 3)
  const topHouse = houses[0]

  return (
    <AppShell>
      <div className="sky-band">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
          <p className="label-xs text-ink">Recognition</p>
          <h1 className="display-lg text-on-sky mt-1.5">Leaderboard</h1>
          <p className="mt-2 max-w-2xl font-body text-px-base text-ink">
            Verified participation points only — every point traces back to a server-confirmed
            check-in, never to a self-report.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {error && <ErrorState body={error} onRetry={load} />}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <>
            {/* podium */}
            <div className="grid gap-4 sm:grid-cols-3">
              {podium.map((p, i) => (
                <div
                  key={p.id}
                  className={`card relative overflow-hidden p-5 ${
                    i === 0 ? 'border-sky shadow-lift' : ''
                  }`}
                >
                  <span className="numeral absolute -right-2 -top-3 opacity-10">{i + 1}</span>
                  <div className="flex items-center gap-3">
                    <Avatar name={p.full_name} size="lg" />
                    <div className="min-w-0">
                      <p className="truncate text-px-base font-extrabold tracking-poster">
                        {p.full_name}
                      </p>
                      <p className="text-px-sm text-ink-soft">
                        {p.house} · {p.city}
                      </p>
                      <p className="mt-1 text-px-xl tabular-nums text-sky text-chunky">
                        {p.points}
                        <span className="ml-1 text-px-xs uppercase tracking-label text-mist-dim">
                          pts
                        </span>
                      </p>
                    </div>
                  </div>
                  {user?.id === p.id && (
                    <span className="mt-3 inline-block border-2 border-ink bg-sky px-2.5 py-1 text-px-xs uppercase tracking-label text-ink">
                      That&apos;s you
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* house ranking */}
            <section className="mt-10">
              <SectionHead
                eyebrow="House standings"
                title="House-level ranking"
                action={
                  topHouse ? (
                    <span className="chip border-flame/30 bg-flame-light text-flame-dark">
                      <IconTrophy className="h-3.5 w-3.5" /> Leading: {topHouse.house}
                    </span>
                  ) : undefined
                }
              />
              <div className="card overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-ink/[0.03]">
                    <tr className="label-xs text-ink-mute">
                      <th className="px-5 py-3">Rank</th>
                      <th className="px-5 py-3">House</th>
                      <th className="px-5 py-3 text-right">Members</th>
                      <th className="px-5 py-3 text-right">Total points</th>
                      <th className="hidden px-5 py-3 sm:table-cell">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {houses.map((h, i) => {
                      const max = houses[0]?.points ?? 1
                      return (
                        <tr
                          key={h.house}
                          className={user?.house === h.house ? 'bg-brand-light/50' : ''}
                        >
                          <td className="px-5 py-3 font-black tabular-nums text-brand">
                            {String(i + 1).padStart(2, '0')}
                          </td>
                          <td className="px-5 py-3 font-bold">
                            {h.house}
                            {user?.house === h.house && (
                              <span className="ml-2 text-px-xs font-black uppercase tracking-label text-brand">
                                yours
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-ink-soft">
                            {h.members}
                          </td>
                          <td className="px-5 py-3 text-right font-black tabular-nums">
                            {h.points}
                          </td>
                          <td className="hidden px-5 py-3 sm:table-cell">
                            <div className="h-2 w-full overflow-hidden bg-ink/10">
                              <div
                                className="h-full bg-brand"
                                style={{ width: `${(h.points / max) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* students */}
            <section className="mt-10">
              <SectionHead eyebrow="Individual standings" title="All participants" />
              {overall.length === 0 ? (
                <EmptyState
                  title="No participants yet"
                  body="Points appear once students attend verified events."
                />
              ) : (
                <div className="card divide-y divide-line">
                  {overall.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 px-5 py-3.5 ${
                        user?.id === p.id ? 'bg-brand-light/50' : ''
                      }`}
                    >
                      <span className="w-8 shrink-0 text-px-sm font-black tabular-nums text-brand">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <Avatar name={p.full_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-px-base font-bold">{p.full_name}</p>
                        <p className="truncate text-px-sm text-ink-soft">
                          {p.house} · {p.city}
                        </p>
                      </div>
                      {p.points >= 100 && (
                        <span className="hidden items-center gap-1 bg-flame-light px-2.5 py-1 text-px-xs font-black uppercase tracking-label text-flame-dark sm:flex">
                          <IconSpark className="h-3 w-3" /> Century
                        </span>
                      )}
                      <span className="w-20 shrink-0 text-right text-px-base font-black tabular-nums text-brand">
                        {p.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border border-line bg-panel px-5 py-4">
              <p className="text-sm font-semibold text-ink-soft">
                Want to climb? Register for an event and get your pass scanned.
              </p>
              <Link to="/explore" className="btn-primary btn-sm">
                Find your next event
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
