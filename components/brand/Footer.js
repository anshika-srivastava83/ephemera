import Link from 'next/link';
import { Wordmark } from './EditorialNav';

export function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper-light py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <Wordmark />
          <p className="mt-3 text-sm text-ink-muted max-w-sm font-light leading-relaxed">
            A communal photographic ritual for gatherings, celebrations, and unforgettable nights.
            Designed to bring physical nostalgia into the digital present.
          </p>
        </div>

        <div className="flex flex-wrap gap-8 text-sm text-ink-muted">
          <div>
            <span className="block text-xs uppercase font-semibold tracking-wider text-ink/60 mb-3">
              Experience
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/create" className="hover:text-ink transition-colors">
                  Create an Event
                </Link>
              </li>
              <li>
                <Link href="/event" className="hover:text-ink transition-colors">
                  Event Directory
                </Link>
              </li>
              <li>
                <Link href="/owner/dashboard" className="hover:text-ink transition-colors">
                  Host Workspace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <span className="block text-xs uppercase font-semibold tracking-wider text-ink/60 mb-3">
              Philosophy
            </span>
            <ul className="space-y-2">
              <li className="text-ink-muted">Ephemeral Privacy</li>
              <li className="text-ink-muted">Archival Tapestry</li>
              <li className="text-ink-muted">No-App Guest Flow</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-ink/5 flex flex-col sm:flex-row justify-between items-center text-xs text-ink-faint gap-4">
        <span>© {new Date().getFullYear()} Ephemera. Made to be remembered, designed to let go.</span>
        <span>Curated with archival care.</span>
      </div>
    </footer>
  );
}
