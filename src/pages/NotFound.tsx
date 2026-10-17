import { Link } from 'react-router-dom'
import { SiteShell } from '../components/Shell'
import { Logo } from '../components/icons'

export default function NotFound() {
  return (
    <SiteShell>
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-16">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <Logo className="h-14 w-14" />
          </div>
          <p className="numeral">404</p>
          <h1 className="display-md mt-2">This page left the calendar</h1>
          <p className="mx-auto mt-3 max-w-md text-px-base leading-relaxed text-ink-soft">
            The event or page you were looking for does not exist, or it was withdrawn by its
            organiser.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Back home
            </Link>
            <Link to="/explore" className="btn-ghost">
              Explore events
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  )
}
