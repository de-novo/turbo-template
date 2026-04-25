import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	description: "Reusable fullstack TypeScript template.",
	title: "Fullstack TypeScript Template",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
