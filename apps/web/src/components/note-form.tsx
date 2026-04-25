"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateNoteInput, createNoteInputSchema } from "@repo/contracts";
import { useForm } from "react-hook-form";
import type { z } from "zod";

// `createNoteInputSchema` declares `content` with a `.default("")` so
// the input shape (form state) is `{ title: string; content?: string }`
// while the output (post-resolver) is `{ title: string; content: string
// }`. React Hook Form's third generic is the transformed/output type
// that `handleSubmit` hands to the callback.
type FormFields = z.input<typeof createNoteInputSchema>;

type Props = {
	// Named *Action to satisfy Next.js 16's "use client" entry rule.
	// Real Server Actions accept this directly; pure-client callers can
	// also pass any plain async function.
	onSubmitAction: (input: CreateNoteInput) => Promise<void> | void;
};

/**
 * Reference form: react-hook-form + zodResolver + @repo/contracts schema.
 * Use this shape for every form that submits to the API:
 *
 * 1. Get the Zod schema and inferred type from @repo/contracts.
 * 2. Pass the schema to zodResolver so client-side validation matches
 *    the server contract exactly. There is no second source of truth.
 * 3. Submit handler receives the typed, validated, post-default input.
 */
export function NoteForm({ onSubmitAction }: Props) {
	const {
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
		reset,
	} = useForm<FormFields, undefined, CreateNoteInput>({
		resolver: zodResolver(createNoteInputSchema),
		defaultValues: { title: "", content: "" },
	});

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={handleSubmit(async (input) => {
				await onSubmitAction(input);
				reset();
			})}
		>
			<label className="flex flex-col gap-1 text-sm">
				<span className="font-medium">Title</span>
				<input
					className="rounded-md border border-slate-300 px-3 py-2"
					{...register("title")}
				/>
				{errors.title ? (
					<span className="text-red-600 text-xs">{errors.title.message}</span>
				) : null}
			</label>

			<label className="flex flex-col gap-1 text-sm">
				<span className="font-medium">Content</span>
				<textarea
					className="min-h-32 rounded-md border border-slate-300 px-3 py-2"
					{...register("content")}
				/>
				{errors.content ? (
					<span className="text-red-600 text-xs">{errors.content.message}</span>
				) : null}
			</label>

			<button
				className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 disabled:opacity-50"
				disabled={isSubmitting}
				type="submit"
			>
				{isSubmitting ? "Saving…" : "Create note"}
			</button>
		</form>
	);
}
