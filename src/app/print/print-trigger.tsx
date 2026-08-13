"use client";

import Link from "next/link";
import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mb-6 flex items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400"
      >
        Print / Save as PDF
      </button>
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
        ← Back to pipeline
      </Link>
    </div>
  );
}
