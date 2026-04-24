import { z } from "zod";
import { idSchema } from "@repo/contracts";

export const organizationMembershipSchema = z.object({
  organizationId: idSchema,
  organizationSlug: z.string().min(1),
  role: z.string().min(1),
});

export const userIdentitySchema = z.object({
  userId: idSchema,
  email: z.string().email(),
  name: z.string().min(1).optional(),
  memberships: z.array(organizationMembershipSchema).default([]),
});

export type OrganizationMembership = z.infer<typeof organizationMembershipSchema>;
export type UserIdentity = z.infer<typeof userIdentitySchema>;
