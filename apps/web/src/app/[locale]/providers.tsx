"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Messages, NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { type PropsWithChildren, useState } from "react";
import { ErrorBoundary } from "../../components/error-boundary";

type Props = PropsWithChildren<{
	locale: string;
	messages: Messages;
}>;

/**
 * Root client providers. Order matters:
 *
 * 1. NextIntlClientProvider sits outermost so any child that reads
 *    `useTranslations` (including the error boundary's fallback if
 *    you decide to localize it) sees the correct messages.
 * 2. ThemeProvider wraps everything below so children that read
 *    `useTheme()` see the correct value during the first render.
 * 3. ErrorBoundary sits below the theme so the fallback UI also uses
 *    the active theme tokens.
 * 4. QueryClientProvider sits below the error boundary so a query
 *    error caught during render hits the boundary's fallback.
 */
export function Providers({ children, locale, messages }: Props) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						staleTime: 30_000,
					},
				},
			}),
	);

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<ErrorBoundary>
					<QueryClientProvider client={queryClient}>
						{children}
					</QueryClientProvider>
				</ErrorBoundary>
			</ThemeProvider>
		</NextIntlClientProvider>
	);
}
