export type Clock = {
  now(): Date;
};

export const systemClock: Clock = {
  now: () => new Date(),
};

export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function createRequestId(prefix = "req"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
