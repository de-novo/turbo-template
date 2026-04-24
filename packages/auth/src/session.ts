import { z } from "zod";
import { userIdentitySchema } from "./identity.js";

export const sessionSchema = z.object({
  sessionId: z.string().min(1),
  user: userIdentitySchema,
  expiresAt: z.string().datetime(),
  permissions: z.array(z.string().min(1)).default([]),
});

export type Session = z.infer<typeof sessionSchema>;
