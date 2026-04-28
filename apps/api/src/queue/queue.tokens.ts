/**
 * DI token for the active `JobQueue`. Default is `noopJobQueue`
 * (provided by `QueueModule`); a fork swaps the provider value to a
 * real backend — see `docs/recipes/enable-job-queue.md`.
 */
export const JOB_QUEUE = "JOB_QUEUE";
