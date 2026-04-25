"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { type PropsWithChildren, useState } from "react";
import { ErrorBoundary } from "../components/error-boundary";

/**
 * Root client providers. Order matters:
 *
 * 1. ThemeProvider must wrap everything else so children that read
 *    `useTheme()` see the correct value during the first render.
 * 2. ErrorBoundary sits below the theme so the fallback UI also uses
 *    the active theme tokens.
 * 3. QueryClientProvider sits below the error boundary so a query
 *    error caught during render hits the boundary's fallback.
 */
export function Providers({ children }: PropsWithChildren) {
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
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<ErrorBoundary>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</ErrorBoundary>
		</ThemeProvider>
	);
}
