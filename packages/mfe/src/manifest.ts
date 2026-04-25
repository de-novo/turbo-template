import { z } from "zod";

export const microFrontendManifestSchema = z.object({
	description: z.string().optional(),
	elementTag: z
		.string()
		.regex(
			/^[a-z][a-z0-9]*-[a-z0-9-]+$/,
			"elementTag must be a valid custom element tag.",
		),
	entry: z.string().min(1),
	integrity: z.string().optional(),
	name: z.string().min(1),
	version: z.string().min(1),
});

export type MicroFrontendManifest = z.infer<typeof microFrontendManifestSchema>;

export function parseMicroFrontendManifest(
	input: unknown,
): MicroFrontendManifest {
	return microFrontendManifestSchema.parse(input);
}

export function resolveRemoteEntryUrl(
	manifestUrl: string,
	manifest: MicroFrontendManifest,
): string {
	return new URL(manifest.entry, manifestUrl).toString();
}
