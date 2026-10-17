import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'
import { useToast } from '../lib/toast'
import { IconAlert, IconCheck } from './icons'
import { Spinner } from './ui'

export const encodePayload = (eventId: string, token: string) =>
  `COLLABSPHERE|CHECKIN|${eventId}|${token}`

export function parsePayload(raw: string): { eventId: string; token: string } | null {
  const cleaned = (raw || '').trim()
  const parts = cleaned.split('|')
  if (parts.length === 4 && parts[0] === 'COLLABSPHERE' && parts[1] === 'CHECKIN') {
    return { eventId: parts[2], token: parts[3] }
  }
  const url = cleaned.match(/\/events\/([0-9a-f-]{8,})\/checkin\/([A-Z0-9]{6,})/i)
  if (url) return { eventId: url[1], token: url[2] }
  return null
}

/* ------------------------------------------------------ attendee pass */

export function AttendeeQr({
  eventId,
  token,
  title,
}: {
  eventId: string
  token: string
  title: string
}) {
  const toast = useToast()
  const payload = encodePayload(eventId, token)

  return (
    <div className="card overflow-hidden">
      <div className="sky-band px-5 py-4">
        <p className="label-xs text-ink">Check-in pass</p>
        <h3 className="mt-2 text-[13px] leading-relaxed tracking-poster text-ink">{title}</h3>
      </div>
      <div className="flex flex-col items-center gap-5 px-5 py-6 sm:flex-row sm:items-start">
        <div className="relative shrink-0 border-[4px] border-ink bg-white p-3 shadow-card">
          {/* pixel corner brackets */}
          <span className="absolute -left-1 -top-1 h-3 w-3 border-l-4 border-t-4 border-sky" />
          <span className="absolute -right-1 -top-1 h-3 w-3 border-r-4 border-t-4 border-sky" />
          <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-4 border-l-4 border-sky" />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-4 border-r-4 border-sky" />
          <QRCodeSVG value={payload} size={168} level="M" includeMargin={false} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="label-xs text-mist-dim">Attendee token</p>
          <p className="mt-2 break-all border-2 border-line bg-panel-dark px-3 py-2 font-body text-px-base tracking-wider text-sky">
            {token}
          </p>
          <p className="mt-3 font-body text-px-sm leading-snug text-mist">
            Show this code to the organiser at the venue. The token is single-use for check-in —
            duplicates are rejected by the server.
          </p>
          <button
            className="btn-ghost btn-sm mt-4"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(token)
                toast.success('Token copied')
              } catch {
                toast.error('Could not copy', 'Select the token and copy it manually.')
              }
            }}
          >
            Copy token
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- scanner */

export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const toast = useToast()
  const [state, setState] = useState<'idle' | 'starting' | 'running' | 'stopped'>('idle')
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<Html5Qrcode | null>(null)
  const holderId = 'cs-qr-reader'
  const busy = useRef(false)

  const stop = useCallback(async () => {
    const s = ref.current
    if (s) {
      try {
        await s.stop()
        s.clear()
      } catch {
        /* already stopped */
      }
      ref.current = null
    }
    setState('stopped')
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setState('starting')
    busy.current = false
    try {
      const s = new Html5Qrcode(holderId, { verbose: false })
      ref.current = s
      await s.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (text) => {
          if (busy.current) return
          busy.current = true
          onResult(text)
        },
        () => {
          /* frame with no code — expected */
        },
      )
      setState('running')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        /permission|NotAllowed/i.test(msg)
          ? 'Camera permission was denied. Allow camera access in your browser settings, or paste the token below.'
          : `Could not start the camera: ${msg}`,
      )
      setState('idle')
      toast.error('Camera unavailable', 'Use manual token entry instead.')
    }
  }, [onResult, toast])

  useEffect(() => {
    return () => {
      const s = ref.current
      if (s) {
        void s
          .stop()
          .then(() => s.clear())
          .catch(() => undefined)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden border-4 border-ink bg-panel-dark shadow-card">
        <div
          id={holderId}
          className="min-h-[260px] w-full [&_video]:!h-full [&_video]:object-cover"
        />
        {state !== 'running' && (
          <div className="absolute inset-0 grid place-items-center bg-panel-dark px-6 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center border-[3px] border-line bg-panel text-mist">
                <IconAlert className="h-6 w-6" />
              </div>
              <p className="text-[11px] leading-relaxed tracking-poster text-cream">
                {state === 'starting' ? 'Starting camera…' : 'Camera is off'}
              </p>
              <p className="mx-auto mt-2 max-w-xs font-body text-px-sm leading-snug text-mist">
                Point the camera at an attendee&apos;s check-in pass.
              </p>
            </div>
          </div>
        )}
        {state === 'running' && (
          <>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[230px] -translate-x-1/2 -translate-y-1/2">
              <span className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-flame" />
              <span className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-flame" />
              <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-flame" />
              <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-flame" />
              <span className="absolute inset-x-0 top-0 h-1 bg-flame animate-scanline" />
            </div>
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_6px_#070B18]" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {state !== 'running' ? (
          <button className="btn-primary" onClick={start} disabled={state === 'starting'}>
            {state === 'starting' && <Spinner />} Start camera
          </button>
        ) : (
          <button className="btn-ghost" onClick={stop}>
            Stop camera
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 border-[3px] border-pixamber bg-pixamber-light px-4 py-3 font-body text-px-sm text-pixamber-dark">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------- verification result */

export function CheckinResultCard({
  ok,
  message,
  attendeeName,
  already,
}: {
  ok: boolean
  message: string
  attendeeName?: string
  already?: boolean
}) {
  const tone = ok
    ? 'border-pixgreen bg-pixgreen-light text-pixgreen-dark'
    : already
      ? 'border-pixamber bg-pixamber-light text-pixamber-dark'
      : 'border-pixred bg-pixred-light text-pixred-dark'
  return (
    <div className={`animate-scale-in border-[3px] px-5 py-4 shadow-card ${tone}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center border-2 border-ink bg-ink/50">
          {ok ? <IconCheck className="h-4 w-4" /> : <IconAlert className="h-4 w-4" />}
        </span>
        <div>
          <p className="text-[12px] leading-relaxed tracking-poster">
            {ok ? 'Verified check-in' : already ? 'Duplicate blocked' : 'Rejected'}
          </p>
          {attendeeName && <p className="mt-1 font-body text-px-base text-cream">{attendeeName}</p>}
          <p className="mt-1 font-body text-px-sm leading-snug opacity-90">{message}</p>
        </div>
      </div>
    </div>
  )
}
