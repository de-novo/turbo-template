import type { DomainEvent } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

export type EventPublisher = {
	publish<TPayload>(
		topic: string,
		event: DomainEvent<TPayload>,
	): Effect.Effect<void, AppError>;
};

export type EventConsumer<TPayload> = {
	topic: string;
	consumerGroup: string;
	handle(event: DomainEvent<TPayload>): Effect.Effect<void, AppError>;
};

export const noopEventPublisher: EventPublisher = {
	publish: () => Effect.void,
};
