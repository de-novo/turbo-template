import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils.js";

export const buttonVariants = cva(
	"inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
	{
		defaultVariants: {
			size: "md",
			variant: "primary",
		},
		variants: {
			size: {
				sm: "min-h-9 px-3 text-sm",
				md: "min-h-11 px-4 text-sm",
				lg: "min-h-12 px-5 text-base",
			},
			variant: {
				primary:
					"bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-blue-600",
				secondary:
					"border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
				ghost: "text-slate-700 hover:bg-slate-100",
			},
		},
	},
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

export function Button({ className, size, variant, ...props }: ButtonProps) {
	return (
		<button
			className={cn(buttonVariants({ size, variant }), className)}
			{...props}
		/>
	);
}
