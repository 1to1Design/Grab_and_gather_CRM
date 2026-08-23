import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { prisma } from "@/lib/prisma";
import { buildLeadWhere } from "@/lib/lead-filters";
import { buildLeadOrderBy } from "@/lib/lead-sort";
import { STATUS_ORDER, LEAD_QUALITY_ORDER, VERTICAL_ORDER } from "@/lib/constants";
import { planRoute } from "@/lib/route-planner";

export const queryLeadsTool = betaZodTool({
  name: "query_leads",
  description:
    "Search and filter the shared lead pipeline. Use this to find leads matching status/vertical/quality, leads overdue or due for follow-up, or leads that have a street address on file (needed before route planning). Leads marked Lost are excluded unless status is explicitly set to LOST.",
  inputSchema: z.object({
    status: z.enum(STATUS_ORDER as [string, ...string[]]).optional().describe("Filter by pipeline status."),
    quality: z
      .enum(LEAD_QUALITY_ORDER as [string, ...string[]])
      .optional()
      .describe("Filter by lead quality rating."),
    vertical: z.enum(VERTICAL_ORDER as [string, ...string[]]).optional().describe("Filter by business vertical."),
    overdueOrDueToday: z
      .boolean()
      .optional()
      .describe("Only leads whose next follow-up date is today or earlier."),
    requireAddress: z
      .boolean()
      .optional()
      .describe("Only leads that have a street address on file. Set true before route planning."),
    sort: z
      .enum(["followup", "contacted", "quality"])
      .optional()
      .describe("How to order results: soonest follow-up first, most recently contacted first, or best quality first."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  }),
  run: async (input) => {
    const where = buildLeadWhere({ status: input.status, vertical: input.vertical, quality: input.quality });
    if (input.overdueOrDueToday) {
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.nextFollowUpDate = { lt: tomorrow, not: null };
    }
    if (input.requireAddress) {
      where.address = { not: null };
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: buildLeadOrderBy(input.sort ?? ""),
      take: input.limit ?? 20,
      include: { createdBy: { select: { name: true } } },
    });

    return JSON.stringify(
      leads.map((lead) => ({
        id: lead.id,
        organizationName: lead.organizationName,
        vertical: lead.vertical,
        status: lead.status,
        leadQuality: lead.leadQuality,
        contactName: lead.contactName,
        contactTitle: lead.contactTitle,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        nextFollowUpDate: lead.nextFollowUpDate?.toISOString().slice(0, 10) ?? null,
        lastContactedAt: lead.lastContactedAt?.toISOString().slice(0, 10) ?? null,
        footTrafficNotes: lead.footTrafficNotes,
        loggedBy: lead.createdBy.name,
      }))
    );
  },
});

export const getLeadDetailsTool = betaZodTool({
  name: "get_lead_details",
  description: "Get full details for one lead by ID, including its meeting note history. Use after query_leads when the user wants more depth on a specific lead.",
  inputSchema: z.object({
    leadId: z.string().describe("The lead's id, from a prior query_leads result."),
  }),
  run: async (input) => {
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: {
        createdBy: { select: { name: true } },
        notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      },
    });
    if (!lead) return JSON.stringify({ error: "No lead found with that id." });

    return JSON.stringify({
      id: lead.id,
      organizationName: lead.organizationName,
      vertical: lead.vertical,
      status: lead.status,
      leadQuality: lead.leadQuality,
      contactName: lead.contactName,
      contactTitle: lead.contactTitle,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      nextFollowUpDate: lead.nextFollowUpDate?.toISOString().slice(0, 10) ?? null,
      lastContactedAt: lead.lastContactedAt?.toISOString().slice(0, 10) ?? null,
      footTrafficNotes: lead.footTrafficNotes,
      loggedBy: lead.createdBy.name,
      meetingNotes: lead.notes.map((n) => ({
        date: n.createdAt.toISOString().slice(0, 10),
        author: n.author.name,
        content: n.content,
      })),
    });
  },
});

export const planRouteTool = betaZodTool({
  name: "plan_route",
  description:
    "Plan an optimized driving route to visit a set of leads and return an ordered stop list plus a ready-to-open Google Maps link. Always confirm the starting address and the address to end at (they're often the same, e.g. home) with the user before calling this if neither was mentioned. Get lead addresses from query_leads first — do not guess or compute the visiting order yourself, this tool calls a real routing service for that.",
  inputSchema: z.object({
    origin: z.string().describe("Starting address for the trip."),
    destination: z.string().describe("Address to end the trip at (e.g. home)."),
    stops: z
      .array(z.object({ name: z.string().describe("Lead/organization name"), address: z.string() }))
      .min(1)
      .describe("Leads to visit, with their street addresses."),
  }),
  run: async (input) => {
    const result = await planRoute(input.origin, input.destination, input.stops);
    if ("error" in result) return JSON.stringify(result);
    return JSON.stringify({
      orderedStops: result.route.orderedStops,
      totalDistance: result.route.totalDistance,
      totalDuration: result.route.totalDuration,
      mapsUrl: result.route.mapsUrl,
      note: result.truncated
        ? `Only the first ${result.route.orderedStops.length} stops were routed — that's the current limit per trip.`
        : undefined,
    });
  },
});

export const chatTools = [queryLeadsTool, getLeadDetailsTool, planRouteTool];
