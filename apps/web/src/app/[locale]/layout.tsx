import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "../../i18n/routing";
import { Providers } from "./providers";
import "../globals.css";

export const metadata: Metadata = {
	description: "Reusable fullstack TypeScript template.",
	title: "Fullstack TypeScript Template",
};

// Static rendering needs the full locale list at build time.
export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

type Props = Readonly<{
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({ children, params }: Props) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	// Enable static rendering for this locale segment.
	setRequestLocale(locale);

	const messages = await getMessages();

	// suppressHydrationWarning is required by next-themes — the theme
	// provider sets a class on <html> from JS to match the user's
	// system preference, which would otherwise mismatch SSR output.
	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<Providers locale={locale} messages={messages}>
					{children}
				</Providers>
			</body>
		</html>
	);
}
