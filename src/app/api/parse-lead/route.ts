import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { extractEmail, extractPhone } from "@/lib/extract";
import { STATUS_ORDER, VERTICAL_ORDER } from "@/lib/constants";

const EXTRACT_TOOL = {
  name: "extract_lead",
  description:
    "Extract structured lead fields from a rambling voice-note transcript about a sales visit or call.",
  input_schema: {
    type: "object" as const,
    properties: {
      organizationName: {
        type: "string",
        description: "The business or location name, e.g. the gym or clinic name. Empty string if not mentioned.",
      },
      vertical: {
        type: "string",
        enum: VERTICAL_ORDER,
        description: "Best-guess category for this location based on the note.",
      },
      contactName: { type: "string", description: "Name of the person spoken with, if mentioned. Empty string if none." },
      contactTitle: { type: "string", description: "Their title or role, if mentioned. Empty string if none." },
      status: {
        type: "string",
        enum: STATUS_ORDER,
        description:
          "Best-guess pipeline status based on tone/content. Default to CONTACTED if a meeting or call clearly happened but no next step is obvious.",
      },
      nextFollowUpDate: {
        type: "string",
        description:
          "If the note mentions a specific or relative follow-up timeframe (e.g. 'call back in two weeks', 'follow up next Friday'), resolve it to an ISO date (YYYY-MM-DD) using the provided current date. Empty string if no follow-up timing is mentioned.",
      },
      footTrafficNotes: {
        type: "string",
        description:
          "Any mention of daily visitor counts, foot traffic, busyness, Google review counts, or other volume/quality signals. Empty string if none mentioned.",
      },
    },
    required: [
      "organizationName",
      "vertical",
      "contactName",
      "contactTitle",
      "status",
      "nextFollowUpDate",
      "footTrafficNotes",
    ],
  },
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "No text to parse." }, { status: 400 });
  }

  const phone = extractPhone(text);
  const email = extractEmail(text);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Voice-note parsing isn't configured yet. Fill in the fields below by hand for now.",
        phone: phone ?? "",
        email: email ?? "",
      },
      { status: 503 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const today = new Date().toISOString().slice(0, 10);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You extract structured sales-lead fields from a rep's rambling voice-note transcript for Grab & Gather, a premium automated retail (smart vending) placement company. Today's date is ${today}. Only use information actually present in the note — leave a field as an empty string rather than guessing when it isn't mentioned. Never invent a phone number, email, or contact name.`,
      messages: [{ role: "user", content: text }],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_lead" },
    });

    const toolUse = message.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Model did not return structured output.");
    }

    const extracted = toolUse.input as Record<string, string>;

    return NextResponse.json({
      organizationName: extracted.organizationName || "",
      vertical: VERTICAL_ORDER.includes(extracted.vertical as (typeof VERTICAL_ORDER)[number])
        ? extracted.vertical
        : "OTHER",
      contactName: extracted.contactName || "",
      contactTitle: extracted.contactTitle || "",
      status: STATUS_ORDER.includes(extracted.status as (typeof STATUS_ORDER)[number])
        ? extracted.status
        : "CONTACTED",
      nextFollowUpDate: extracted.nextFollowUpDate || "",
      footTrafficNotes: extracted.footTrafficNotes || "",
      phone: phone ?? "",
      email: email ?? "",
    });
  } catch (error) {
    console.error("parse-lead failed", error);
    return NextResponse.json(
      { error: "Parsing failed. You can still fill in the fields by hand.", phone: phone ?? "", email: email ?? "" },
      { status: 502 }
    );
  }
}
