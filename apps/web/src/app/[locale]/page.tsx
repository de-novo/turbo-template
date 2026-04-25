import { AppShell, EmptyState, StatusBadge } from "@repo/design-system";
import { useTranslations } from "next-intl";

/**
 * Server component. The parent [locale] layout has already validated
 * the locale and called `setRequestLocale`, so `useTranslations` here
 * resolves against the right messages without further wiring.
 */
export default function HomePage() {
	const t = useTranslations("home");

	return (
		<AppShell description={t("description")} title={t("title")}>
			<section className="grid gap-4 md:grid-cols-3">
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge tone="success">{t("cards.contracts.badge")}</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">
						{t("cards.contracts.title")}
					</h2>
					<p className="mt-2 text-slate-600 text-sm">
						{t("cards.contracts.body")}
					</p>
				</div>
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge>{t("cards.design.badge")}</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">
						{t("cards.design.title")}
					</h2>
					<p className="mt-2 text-slate-600 text-sm">
						{t("cards.design.body")}
					</p>
				</div>
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge tone="warning">{t("cards.rename.badge")}</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">
						{t("cards.rename.title")}
					</h2>
					<p className="mt-2 text-slate-600 text-sm">
						{t("cards.rename.body")}
					</p>
				</div>
			</section>
			<EmptyState
				description={t("emptyState.description")}
				title={t("emptyState.title")}
			/>
		</AppShell>
	);
}
