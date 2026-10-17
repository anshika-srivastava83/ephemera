import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-6">
      <SignIn />
    </main>
  );
}
