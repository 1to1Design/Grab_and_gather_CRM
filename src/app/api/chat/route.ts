import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { chatTools } from "@/lib/chat-tools";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat isn't configured yet — set ANTHROPIC_API_KEY on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const messages: Anthropic.Beta.BetaMessageParam[] | null = Array.isArray(body?.messages)
    ? body.messages
    : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const anthropic = new Anthropic({ apiKey });

  try {
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: `You are the lead-pipeline assistant inside Grab & Gather's internal CRM. Grab & Gather places premium automated retail (smart vending) machines at host locations at no cost to the host, making money on product sales. Today's date is ${today}.

Answer questions about the shared lead pipeline using the query_leads and get_lead_details tools — never guess at lead data, always look it up first. When asked what to follow up on next, weigh status, lead quality, and how overdue the follow-up is, and briefly explain your reasoning.

For route-planning requests: first call query_leads (with requireAddress: true) to find the relevant leads, confirm the starting and ending address with the user if neither was mentioned in their message, then call plan_route. Never compute or guess the visiting order yourself — that tool calls a real routing service for that. Present the result as a short ordered list ending with the Maps link.

Be direct and concise, like a colleague texting back — no filler, no over-explaining, no em dashes.`,
      tools: chatTools,
      messages,
    });

    const text = finalMessage.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({
      reply: text || "I didn't get a text response back — try rephrasing that.",
    });
  } catch (error) {
    console.error("chat failed", error);
    return NextResponse.json({ error: "Something went wrong answering that." }, { status: 502 });
  }
}
