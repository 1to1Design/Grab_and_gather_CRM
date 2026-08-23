import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-white">
          Grab <span className="text-amber-500">&</span> Gather
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            Pipeline
          </Link>
          <Link
            href="/leads/new"
            className="rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            New lead
          </Link>
          <Link
            href="/ask"
            className="rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            Ask
          </Link>
          <Link
            href="/leads/import"
            className="hidden rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white sm:block"
          >
            Import
          </Link>
          <Link
            href="/settings/team"
            className="hidden rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white sm:block"
          >
            Team
          </Link>
          <Link
            href="/settings/notifications"
            className="hidden rounded-md px-2.5 py-1.5 text-neutral-300 hover:bg-neutral-900 hover:text-white sm:block"
          >
            Notifications
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
