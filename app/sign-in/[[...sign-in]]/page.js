import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
        <div className="bg-ivory border border-ink/10 rounded-2xl p-8 max-w-sm w-full shadow-sm">
          <h1 className="font-editorial text-3xl text-ink font-normal mb-2">Host Access</h1>
          <p className="text-xs text-ink-muted mb-6 font-light leading-relaxed">
            Clerk authentication is not configured for this deployment. Access your events directly via the host dashboard.
          </p>
          <Link href="/owner/dashboard" className="btn-editorial btn-editorial-primary text-xs px-5 py-2.5 inline-flex justify-center w-full">
            Open Host Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-6">
      <SignIn />
    </main>
  );
}

