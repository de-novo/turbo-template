import { Button } from "@repo/ui-primitives";

export type EmptyStateProps = {
	title: string;
	description: string;
	actionLabel?: string;
	onAction?: () => void;
};

export function EmptyState({
	actionLabel,
	description,
	onAction,
	title,
}: EmptyStateProps) {
	return (
		<section className="rounded-md border border-slate-200 bg-white p-8 text-center">
			<h2 className="font-semibold text-slate-950 text-xl">{title}</h2>
			<p className="mx-auto mt-2 max-w-md text-slate-600">{description}</p>
			{actionLabel ? (
				<Button className="mt-5" onClick={onAction} type="button">
					{actionLabel}
				</Button>
			) : null}
		</section>
	);
}
