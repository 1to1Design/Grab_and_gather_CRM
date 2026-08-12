import { authenticate } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Grab & Gather</h1>
          <p className="mt-1 text-sm text-neutral-400">Lead pipeline</p>
        </div>

        <form action={authenticate} className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">
              Email or password is incorrect.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-amber-500 px-3 py-2.5 font-medium text-neutral-950 transition hover:bg-amber-400"
          >
            Log in
          </button>
        </form>
      </div>
    </div>
  );
}
