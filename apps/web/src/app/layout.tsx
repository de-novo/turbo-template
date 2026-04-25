import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	description: "Reusable fullstack TypeScript template.",
	title: "Fullstack TypeScript Template",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	// suppressHydrationWarning is required by next-themes — the theme
	// provider sets a class on <html> from JS to match the user's
	// system preference, which would otherwise mismatch SSR output.
	return (
		<html lang="en" suppressHydrationWarning>
			<body>{children}</body>
		</html>
	);
}
