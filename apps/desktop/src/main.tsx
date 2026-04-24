import { permissions } from "@repo/auth";
import { projectConfig } from "@repo/config";
import { AppShell, StatusBadge } from "@repo/design-system";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { desktopEnv } from "./env";
import "./styles.css";

function DesktopApp() {
  return (
    <AppShell
      description="Desktop shell uses Vite for fast iteration and can opt into Tauri native builds when needed."
      title={`${projectConfig.projectName} Desktop`}
    >
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <StatusBadge tone="success">DESKTOP READY</StatusBadge>
        <h2 className="mt-4 font-semibold text-lg">Shared permission contract</h2>
        <p className="mt-2 text-slate-600 text-sm">
          Example permission imported from @repo/auth: {permissions.systemAdmin}
        </p>
        <p className="mt-2 text-slate-600 text-sm">API endpoint: {desktopEnv.VITE_API_URL}</p>
      </section>
    </AppShell>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <DesktopApp />
  </StrictMode>,
);
