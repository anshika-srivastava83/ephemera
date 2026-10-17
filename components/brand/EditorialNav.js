import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function Wordmark({ className = '', light = false }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 group transition-opacity hover:opacity-85 ${className}`}
    >
      <span
        className={`font-editorial text-2xl md:text-3xl tracking-tight transition-colors ${
          light ? 'text-ivory' : 'text-ink'
        }`}
      >
        Ephemera
      </span>
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          light ? 'bg-rose' : 'bg-sepia'
        }`}
      />
    </Link>
  );
}

export function EditorialNav({ light = false, event = null }) {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header
      className={`w-full z-50 transition-colors ${
        light
          ? 'bg-darkroom/90 text-ivory border-b border-darkroom-border/60'
          : 'glass-nav text-ink'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between py-4">
        <Wordmark light={light} />

        <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium">
          {event && (
            <Link
              href={`/wall/${event.id}`}
              target="_blank"
              className={`hidden sm:inline-flex items-center gap-1.5 hover:underline ${
                light ? 'text-rose-light' : 'text-sepia'
              }`}
            >
              <span>View Wall</span>
              <span className="text-xs">↗</span>
            </Link>
          )}

          <Link
            href="/create"
            className={`btn-editorial whitespace-nowrap text-xs md:text-sm px-4 py-2 ${
              light ? 'btn-editorial-accent' : 'btn-editorial-primary'
            }`}
          >
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create an Event</span>
          </Link>

          {hasClerk ? (
            <>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className={`text-xs md:text-sm font-medium whitespace-nowrap px-2 sm:px-3 py-1.5 rounded-md transition-colors ${
                    light
                      ? 'text-ivory/80 hover:text-white hover:bg-white/10'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-dark/40'
                  }`}
                >
                  <span className="sm:hidden">Sign in</span><span className="hidden sm:inline">Host Sign In</span>
                </Link>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/owner/dashboard"
                  className={`text-xs md:text-sm font-medium whitespace-nowrap px-2 sm:px-3 py-1.5 rounded-md transition-colors ${
                    light
                      ? 'text-ivory/80 hover:text-white hover:bg-white/10'
                      : 'text-ink-muted hover:text-ink hover:bg-paper-dark/40'
                  }`}
                >
                  Dashboard
                </Link>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <Link
              href="/owner/dashboard"
              className={`text-xs md:text-sm font-medium whitespace-nowrap px-2 sm:px-3 py-1.5 rounded-md transition-colors ${
                light
                  ? 'text-ivory/80 hover:text-white hover:bg-white/10'
                  : 'text-ink-muted hover:text-ink hover:bg-paper-dark/40'
              }`}
            >
              Host Access
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
