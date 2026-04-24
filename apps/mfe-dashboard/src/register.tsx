import {
  createMicroFrontendErrorEvent,
  createMicroFrontendReadyEvent,
  type MicroFrontendReadyDetail,
} from "@repo/mfe";
import { createRoot, type Root } from "react-dom/client";

const manifest: MicroFrontendReadyDetail = {
  elementTag: "repo-mfe-dashboard",
  name: "dashboard",
  version: "0.0.0",
};

class DashboardMicroFrontendElement extends HTMLElement {
  #root: Root | undefined;

  connectedCallback() {
    if (this.#root) {
      return;
    }

    const mount = document.createElement("section");
    const shadow = this.attachShadow({ mode: "open" });
    shadow.append(mount);

    this.#root = createRoot(mount);
    this.#root.render(<DashboardRemote />);
    this.dispatchEvent(createMicroFrontendReadyEvent(manifest));
  }

  disconnectedCallback() {
    this.#root?.unmount();
    this.#root = undefined;
  }
}

function DashboardRemote() {
  return (
    <>
      <style>{styles}</style>
      <article className="mfe-card">
        <div>
          <p className="eyebrow">MICRO FRONTEND REMOTE</p>
          <h2>Dashboard island</h2>
          <p className="copy">
            This remote owns its runtime, rendering, manifest, and custom element contract. The host
            only loads the manifest and mounts the declared element.
          </p>
        </div>
        <dl className="metrics">
          <div>
            <dt>Contract</dt>
            <dd>manifest + custom element</dd>
          </div>
          <div>
            <dt>Isolation</dt>
            <dd>shadow DOM</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>dashboard team</dd>
          </div>
        </dl>
      </article>
    </>
  );
}

const styles = `
  :host {
    display: block;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .mfe-card {
    display: grid;
    gap: 24px;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    color: #111827;
    padding: 24px;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
  }

  h2 {
    margin: 0;
    font-size: 24px;
    line-height: 32px;
  }

  .copy {
    margin: 12px 0 0;
    color: #475569;
    font-size: 15px;
    line-height: 24px;
  }

  .metrics {
    display: grid;
    gap: 12px;
    margin: 0;
  }

  .metrics div {
    border-left: 3px solid #2563eb;
    padding-left: 12px;
  }

  dt {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }

  dd {
    margin: 4px 0 0;
    font-size: 14px;
    font-weight: 600;
  }

  @media (max-width: 720px) {
    .mfe-card {
      grid-template-columns: 1fr;
    }
  }
`;

if (!customElements.get(manifest.elementTag)) {
  customElements.define(manifest.elementTag, DashboardMicroFrontendElement);
}

window.dispatchEvent(createMicroFrontendReadyEvent(manifest));

window.addEventListener("error", (event) => {
  window.dispatchEvent(
    createMicroFrontendErrorEvent({
      message: event.message,
      name: manifest.name,
    }),
  );
});
