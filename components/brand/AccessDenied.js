import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

// Shown when a signed-in user has no host or collaborator role.
export function AccessDenied({
  title = 'Host access only',
  message = "This account isn't set up as a host or collaborator. Ask the event owner to add your email, or sign in with a different account.",
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center">
      <main className="max-w-md mx-auto w-full p-6 py-24 text-center">
        <h1 className="font-editorial text-4xl text-ink font-normal mb-3">{title}</h1>
        <p className="text-sm text-ink-muted font-light mb-8">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <SignOutButton redirectUrl="/sign-in">
            <button className="btn-editorial btn-editorial-primary text-xs px-4 py-2">
              Switch account
            </button>
          </SignOutButton>
          <Link href="/" className="btn-editorial btn-editorial-secondary text-xs px-4 py-2">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
