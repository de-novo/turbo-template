import { z } from "zod";

export const eventMetadataSchema = z.object({
	eventId: z.string().min(1),
	eventName: z.string().min(1),
	eventVersion: z.number().int().positive(),
	occurredAt: z.string().datetime(),
	correlationId: z.string().optional(),
	causationId: z.string().optional(),
});

export const domainEventSchema = <TPayload extends z.ZodType>(
	payload: TPayload,
) =>
	z.object({
		metadata: eventMetadataSchema,
		payload,
	});

export type EventMetadata = z.infer<typeof eventMetadataSchema>;
export type DomainEvent<TPayload> = {
	metadata: EventMetadata;
	payload: TPayload;
};
