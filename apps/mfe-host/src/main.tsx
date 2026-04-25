import { AppShell, EmptyState, StatusBadge } from "@repo/design-system";
import {
	type MicroFrontendManifest,
	microFrontendEventNames,
	parseMicroFrontendManifest,
	resolveRemoteEntryUrl,
} from "@repo/mfe";
import { createElement, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { mfeHostEnv } from "./env";
import "./styles.css";

type RemoteState =
	| { manifest: MicroFrontendManifest; status: "ready" }
	| { message: string; status: "error" }
	| { status: "loading" };

function MfeHostApp() {
	const [remote, setRemote] = useState<RemoteState>({ status: "loading" });

	useEffect(() => {
		const abortController = new AbortController();

		async function loadRemote() {
			try {
				const response = await fetch(
					mfeHostEnv.VITE_MFE_DASHBOARD_MANIFEST_URL,
					{
						signal: abortController.signal,
					},
				);

				if (!response.ok) {
					throw new Error(
						`Remote manifest request failed with ${response.status}.`,
					);
				}

				const manifest = parseMicroFrontendManifest(await response.json());
				await importRemoteEntry(
					resolveRemoteEntryUrl(
						mfeHostEnv.VITE_MFE_DASHBOARD_MANIFEST_URL,
						manifest,
					),
				);
				setRemote({ manifest, status: "ready" });
			} catch (error) {
				if (!abortController.signal.aborted) {
					setRemote({
						message: error instanceof Error ? error.message : String(error),
						status: "error",
					});
				}
			}
		}

		void loadRemote();

		return () => abortController.abort();
	}, []);

	useEffect(() => {
		function onReady(event: Event) {
			if (event instanceof CustomEvent) {
				window.dispatchEvent(
					new CustomEvent("repo:mfe-host:remote-ready", {
						detail: event.detail,
					}),
				);
			}
		}

		window.addEventListener(microFrontendEventNames.ready, onReady);
		return () =>
			window.removeEventListener(microFrontendEventNames.ready, onReady);
	}, []);

	return (
		<AppShell
			description="Runtime-composed micro frontend host using manifest discovery and custom element remotes."
			title="Micro Frontend Host"
		>
			<section className="grid gap-4 md:grid-cols-3">
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge tone="success">HOST</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">Runtime composition</h2>
					<p className="mt-2 text-slate-600 text-sm">
						The host reads a manifest URL from env and loads the remote entry at
						runtime.
					</p>
				</div>
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge>CONTRACT</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">Shared MFE schema</h2>
					<p className="mt-2 text-slate-600 text-sm">
						Manifest validation and lifecycle event names live in @repo/mfe.
					</p>
				</div>
				<div className="rounded-md border border-slate-200 bg-white p-5">
					<StatusBadge tone="warning">REMOTE</StatusBadge>
					<h2 className="mt-4 font-semibold text-lg">Dashboard team</h2>
					<p className="mt-2 text-slate-600 text-sm">
						Remote app owns its build, deploy, manifest, and custom element.
					</p>
				</div>
			</section>

			<RemoteSlot remote={remote} />
		</AppShell>
	);
}

function RemoteSlot({ remote }: { remote: RemoteState }) {
	if (remote.status === "loading") {
		return (
			<EmptyState
				description="Fetching remote manifest and loading entry script."
				title="Loading remote"
			/>
		);
	}

	if (remote.status === "error") {
		return (
			<EmptyState description={remote.message} title="Remote failed to load" />
		);
	}

	return (
		<section className="grid gap-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<StatusBadge tone="success">REMOTE READY</StatusBadge>
				<p className="m-0 text-slate-500 text-sm">
					{remote.manifest.name}@{remote.manifest.version}
				</p>
			</div>
			{createElement(remote.manifest.elementTag)}
		</section>
	);
}

function importRemoteEntry(entryUrl: string) {
	return new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			`script[data-mfe-entry="${entryUrl}"]`,
		);

		if (existing) {
			resolve();
			return;
		}

		const script = document.createElement("script");
		script.dataset["mfeEntry"] = entryUrl;
		script.src = entryUrl;
		script.type = "module";
		script.addEventListener("load", () => resolve(), { once: true });
		script.addEventListener(
			"error",
			() => reject(new Error(`Failed to load remote entry: ${entryUrl}`)),
			{
				once: true,
			},
		);
		document.head.append(script);
	});
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element was not found.");
}

createRoot(root).render(
	<StrictMode>
		<MfeHostApp />
	</StrictMode>,
);
