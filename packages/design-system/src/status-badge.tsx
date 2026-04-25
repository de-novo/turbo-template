export type StatusTone = "neutral" | "success" | "warning" | "danger";

const toneClassName: Record<StatusTone, string> = {
	danger: "border-red-200 bg-red-50 text-red-800",
	neutral: "border-slate-200 bg-slate-100 text-slate-700",
	success: "border-green-200 bg-green-50 text-green-800",
	warning: "border-amber-200 bg-amber-50 text-amber-800",
};

export type StatusBadgeProps = {
	children: string;
	tone?: StatusTone;
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
	return (
		<span
			className={`inline-flex rounded-sm border px-2 py-1 font-medium text-xs ${toneClassName[tone]}`}
		>
			{children}
		</span>
	);
}
