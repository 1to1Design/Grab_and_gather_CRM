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
        <h2 className="text-lg font-semibold text-white">Meeting notes</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400"
          >
            + New meeting note
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="new-note" className="block text-sm font-medium text-amber-200">
              New meeting note
            </label>
            <VoiceDictateButton onTranscript={appendDraft} />
          </div>
          <textarea
            id="new-note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            placeholder="Talk it out or type what happened…"
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
        <p className="text-sm text-neutral-500">No meeting notes yet.</p>
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
              <p className="whitespace-pre-wrap border-t border-neutral-800 px-4 py-3 text-sm text-neutral-300">
                {note.content}
              </p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
