import { AskChat } from "@/components/ask-chat";

export default function AskPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <div className="border-b border-neutral-800 px-4 py-4">
        <h1 className="text-xl font-semibold text-white">Ask</h1>
        <p className="text-sm text-neutral-400">Ask the pipeline assistant about your leads.</p>
      </div>
      <AskChat />
    </div>
  );
}
