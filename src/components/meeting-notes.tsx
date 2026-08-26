"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceDictateButton } from "@/components/voice-dictate-button";
import { addLeadNote } from "@/app/leads/[id]/notes-actions";

type NoteItem = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
};

// Notes built from a voice-note parse are stored as "summary\n\n> quoted raw
// text" (see formatNoteWithQuote). Render the quoted tail as an actual
// blockquote instead of plain text so the original wording stays visually
// distinct from the AI summary above it. Manually-added notes have no "> "
// lines and just render as plain text.
function NoteBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const quoteStart = lines.findIndex((line) => line.startsWith("> "));

  if (quoteStart === -1) {
    return <p className="whitespace-pre-wrap text-sm text-neutral-300">{content}</p>;
  }

  const before = lines.slice(0, quoteStart).join("\n").trim();
  const quote = lines
    .slice(quoteStart)
    .map((line) => line.replace(/^>\s?/, ""))
    .join("\n");

  return (
    <div className="space-y-3 text-sm text-neutral-300">
      {before && <p className="whitespace-pre-wrap">{before}</p>}
      <blockquote className="whitespace-pre-wrap border-l-2 border-neutral-700 pl-3 italic text-neutral-500">
        {quote}
      </blockquote>
    </div>
  );
}

export function MeetingNotes({ leadId, notes }: { leadId: string; notes: NoteItem[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function appendDraft(text: string) {
    setDraft((prev) => (prev ? `${prev} ${text}` : text));
  }

  async function handleAdd() {
    if (!draft.trim()) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("content", draft);
    const result = await addLeadNote(leadId, {}, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setDraft("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="mt-10 border-t border-neutral-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Contact log</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400"
          >
            + Log contact
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="new-note" className="block text-sm font-medium text-amber-200">
              Log contact
            </label>
            <VoiceDictateButton onTranscript={appendDraft} />
          </div>
          <textarea
            id="new-note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Talked on the phone, left a voicemail, they stopped by, emailed back and forth… what happened?"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-white outline-none focus:border-amber-500"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setDraft("");
                setError(null);
              }}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !draft.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add note"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-neutral-500">No contact logged yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note, idx) => (
            <details
              key={note.id}
              open={idx === 0}
              className="group rounded-lg border border-neutral-800 bg-neutral-900"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-neutral-300">
                <span>
                  {new Date(note.createdAt).toLocaleString()} · {note.author.name}
                </span>
                <span className="text-neutral-600 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="border-t border-neutral-800 px-4 py-3">
                <NoteBody content={note.content} />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
