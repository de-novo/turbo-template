export const microFrontendEventNames = {
	error: "repo:mfe:error",
	ready: "repo:mfe:ready",
} as const;

export type MicroFrontendReadyDetail = {
	elementTag: string;
	name: string;
	version: string;
};

export type MicroFrontendErrorDetail = {
	message: string;
	name: string;
};

export function createMicroFrontendReadyEvent(
	detail: MicroFrontendReadyDetail,
) {
	return new CustomEvent<MicroFrontendReadyDetail>(
		microFrontendEventNames.ready,
		{
			bubbles: true,
			composed: true,
			detail,
		},
	);
}

export function createMicroFrontendErrorEvent(
	detail: MicroFrontendErrorDetail,
) {
	return new CustomEvent<MicroFrontendErrorDetail>(
		microFrontendEventNames.error,
		{
			bubbles: true,
			composed: true,
			detail,
		},
	);
}
