import { z } from "zod";
import { LeadQuality, LeadStatus, Vertical } from "@prisma/client";
import { LEAD_QUALITY_ORDER, STATUS_ORDER, VERTICAL_ORDER } from "@/lib/constants";

export const leadFieldsSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required."),
  vertical: z.enum(VERTICAL_ORDER as [Vertical, ...Vertical[]]),
  contactName: z.string().trim().optional().or(z.literal("")),
  contactTitle: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  status: z.enum(STATUS_ORDER as [LeadStatus, ...LeadStatus[]]),
  leadQuality: z.enum(LEAD_QUALITY_ORDER as [LeadQuality, ...LeadQuality[]]),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
  footTrafficNotes: z.string().optional().or(z.literal("")),
  financialModelUrl: z.string().trim().optional().or(z.literal("")),
  placementAgreementUrl: z.string().trim().optional().or(z.literal("")),
});

// Creating a lead also captures the raw voice note as the first meeting note.
export const leadCreateSchema = leadFieldsSchema.extend({
  notes: z.string(),
});

export type LeadFieldsValues = z.infer<typeof leadFieldsSchema>;
export type LeadCreateValues = z.infer<typeof leadCreateSchema>;
