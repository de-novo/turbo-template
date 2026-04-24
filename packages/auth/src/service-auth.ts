import { z } from "zod";

export const serviceIdentitySchema = z.object({
  serviceName: z.string().min(1),
  audience: z.string().min(1),
  issuer: z.string().min(1),
  permissions: z.array(z.string().min(1)).default([]),
});

export const serviceTokenClaimsSchema = serviceIdentitySchema.extend({
  subject: z.string().min(1),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type ServiceIdentity = z.infer<typeof serviceIdentitySchema>;
export type ServiceTokenClaims = z.infer<typeof serviceTokenClaimsSchema>;
