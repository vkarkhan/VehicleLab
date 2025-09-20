import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, signIn, signOut } from "@/lib/auth";

export const metadata = {
  title: "Account",
  description: "Manage your VehicleLab account and billing."
};

export default async function AccountPage() {
  const session = await auth();

  async function handleSignIn(formData: FormData) {
    "use server";

    const email = formData.get("email");
    if (!email || typeof email !== "string") {
      return;
    }

    await signIn("email", { email, redirectTo: "/account" });
  }

  async function handleSignOut() {
    "use server";

    await signOut({ redirectTo: "/" });
  }

  if (!session?.user) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Account</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Sign in with your email to manage subscriptions, presets, and exports. We will send you a secure magic link via Resend.
        </p>
        <form action={handleSignIn} className="mt-10 space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Send magic link
          </Button>
        </form>
      </div>
    );
  }

  async function handleManageBilling() {
    "use server";

    redirect("/pricing");
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">Signed in as {session.user.email ?? "unknown"}.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <form action={handleManageBilling} className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Manage billing</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Billing portals will be connected once payments are configured.</p>
          <Button type="submit" className="mt-6" variant="outline">
            View options
          </Button>
        </form>
        <form action={handleSignOut} className="rounded-3xl border border-slate-200 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sign out</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">End your current session on this device.</p>
          <Button type="submit" className="mt-6" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
