import Anthropic from "@anthropic-ai/sdk";

// Fallback for when a lead is saved without going through the client-side
// "Parse into fields" step (so no summary came back with the parsed
// fields) — used to still get a summarized note rather than only the raw
// dictated text.
export async function summarizeLeadNote(rawText: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !rawText.trim()) return "";

  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "Summarize a sales rep's voice-note transcript about a lead visit or call into a concise 2-4 sentence summary in plain prose. Call out any action items or next steps and key lead-quality details (contact info, decision timeline, traffic/interest signals) if present. Do not restate the note verbatim. Reply with only the summary text, nothing else.",
      messages: [{ role: "user", content: rawText }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
  } catch (error) {
    console.error("summarizeLeadNote failed", error);
    return "";
  }
}

// Builds the saved note content: an AI summary up top (when available) with
// the original raw dictated text preserved verbatim as a quoted block below
// it, so nothing gets lost even though the note now leads with the summary.
export function formatNoteWithQuote(summary: string, rawText: string): string {
  const quoted = rawText
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return summary.trim() ? `${summary.trim()}\n\n${quoted}` : quoted;
}
