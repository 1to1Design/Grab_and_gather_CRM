import { ImportClient } from "./import-client";

export default function ImportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">Import leads</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Bring in your existing urgent care or gym lists. Export each Google Sheet as CSV first, then import
        one file at a time (they&apos;ll usually each map to one vertical).
      </p>
      <ImportClient />
    </div>
  );
}
