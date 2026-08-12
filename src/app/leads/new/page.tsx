import { LeadForm } from "@/components/lead-form";
import { createLead } from "@/app/leads/actions";

export default function NewLeadPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold text-white">New lead</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Dictate what happened right after the meeting, then check the fields it filled in.
      </p>
      <LeadForm action={createLead} showVoiceCapture submitLabel="Save lead" />
    </div>
  );
}
