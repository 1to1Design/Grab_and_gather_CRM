import { prisma } from "@/lib/prisma";
import { AddMemberForm } from "./add-member-form";

export default async function TeamPage() {
  const members = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Team</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Every rep you add here can log in from their own phone and shares the same lead pipeline.
      </p>

      <AddMemberForm />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-400">Current reps</h2>
        <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-neutral-500">{m.email}</p>
              </div>
              <span className="text-xs text-neutral-600">
                joined {m.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
