import { z } from "zod";
import { LeadStatus, Vertical } from "@prisma/client";
import { STATUS_ORDER, VERTICAL_ORDER } from "@/lib/constants";

export const leadFormSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required."),
  vertical: z.enum(VERTICAL_ORDER as [Vertical, ...Vertical[]]),
  contactName: z.string().trim().optional().or(z.literal("")),
  contactTitle: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().optional().or(z.literal("")),
  status: z.enum(STATUS_ORDER as [LeadStatus, ...LeadStatus[]]),
  notes: z.string(),
  nextFollowUpDate: z.string().optional().or(z.literal("")),
  footTrafficNotes: z.string().optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
