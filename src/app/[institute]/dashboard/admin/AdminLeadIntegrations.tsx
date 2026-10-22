"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { sheetScript } from "@/lib/leadSheetScript";
import { formScript } from "@/lib/leadFormScript";
import adminStyles from "./admin.module.css";

const BASE_KEY = "leadWebhookPublicBase";

const curlExample = (webhookUrl: string) => `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "phone": "9998887766",
    "email": "jane@example.com",
    "notes": "Interested in the NEET batch",
    "source": "My Website"
  }'`;

// Google (and Zapier etc.) can only call a public address — never localhost
// or a private network IP.
function isPrivateUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return (
      h === "localhost" ||
      h.endsWith(".local") ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "0.0.0.0" ||
      h === "::1"
    );
  } catch {
    return false;
  }
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this", text);
    }
  };
  return (
    <button className={adminStyles.smallButton} type="button" onClick={copy}>
      {copied ? "Copied!" : label}
    </button>
  );
}

const stepStyle = { margin: "0 0 14px", display: "flex", gap: 12, alignItems: "flex-start" } as const;
const badge = {
  flex: "0 0 auto",
  width: 26,
  height: 26,
  borderRadius: "50%",
  background: "var(--brand)",
  color: "var(--on-brand, #fff)",
  fontSize: "0.8rem",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
} as const;
const stepText = { margin: 0, fontSize: "0.9rem", lineHeight: 1.6, color: "var(--foreground)" } as const;

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={stepStyle}>
      <span style={badge}>{n}</span>
      <div style={stepText}>{children}</div>
    </div>
  );
}

const PROBLEMS: { error: string; fix: string }[] = [
  {
    error: "TypeError: Cannot read properties of undefined (reading 'range')",
    fix: "You pressed Run on an older script (it expected an edit event, which only exists when a cell really changes). Replace the old code with the script above and run setup — the new script handles a manual Run too.",
  },
  {
    error: "Cannot reach the server / Address unavailable",
    fix: "The webhook URL isn't public. Google can't open localhost or a home-network address — use your live website address, or a tunnel while testing (see the yellow box).",
  },
  { error: "Invalid webhook key", fix: "The key was regenerated. Copy the script again from this page, paste it over the old one and Save." },
  { error: "Invalid phone number", fix: "That row's phone isn't a valid mobile number. Fix it in the sheet and it re-sends automatically." },
  { error: "Nothing happens when I edit a row", fix: "Run setup once (it installs the automatic trigger). Check the clock icon (Triggers) in Apps Script — there should be one for onSheetEdit." },
];

const FORM_PROBLEMS: { error: string; fix: string }[] = [
  {
    error: "Open Apps Script from your Google response Sheet.",
    fix: "The script must be pasted in the Google Sheet that receives the form's responses (Responses tab → Link to Sheets → open the Sheet → Extensions → Apps Script) — not in the form's own script editor.",
  },
  {
    error: "Name or Phone column not found, or the response is empty",
    fix: "Row 1 of the response Sheet has the form's question titles. Rename the questions so they read Name and Phone (or Mobile, Full Name, etc.).",
  },
  {
    error: "Missing spreadsheet event",
    fix: "You pressed Run on onFormSubmit by hand. It only works on a real form submission — submit your form once to test.",
  },
  {
    error: "Cannot reach the server / Address unavailable",
    fix: "The webhook URL isn't public. Google can't open localhost or a home-network address — use your live website address, or a tunnel while testing (see the yellow box).",
  },
  { error: "Invalid webhook key", fix: "The key was regenerated. Copy the script again from this page, paste it over the old one and Save." },
  { error: "Invalid phone number", fix: "That response's phone isn't a valid mobile number. Make the Phone question require a 10-digit number (Response validation → Regular expression)." },
  { error: "Nothing happens when someone submits", fix: "Run setup once (it installs the automatic trigger). In Apps Script open the clock icon (Triggers) — there should be one for onFormSubmit. Failed runs are listed under Executions." },
];

export default function AdminLeadIntegrations() {
  const [apiKey, setApiKey] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [override, setOverride] = useState("");
  const [overrideDraft, setOverrideDraft] = useState("");
  const [method, setMethod] = useState<"form" | "sheet">("form");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getLeadWebhookSettings()
      .then((res) => {
        setApiKey(res.apiKey);
        setServerUrl(res.webhookUrl);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load webhook settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    try {
      const saved = localStorage.getItem(BASE_KEY) || "";
      setOverride(saved);
      setOverrideDraft(saved);
    } catch {
      // storage unavailable — the override just won't persist
    }
  }, []);

  // A public base the admin typed (e.g. an ngrok URL) replaces the server's own
  // host, but only in what's shown/copied here — nothing is saved server-side.
  const webhookUrl = useMemo(() => {
    if (!serverUrl) return "";
    if (!override) return serverUrl;
    return `${override.replace(/\/+$/, "")}/api/leads/webhook/${apiKey}`;
  }, [serverUrl, override, apiKey]);
  const privateUrl = !!webhookUrl && isPrivateUrl(webhookUrl);

  const saveOverride = () => {
    const v = overrideDraft.trim();
    if (v && !/^https:\/\/[^\s/]+/i.test(v)) {
      setError("Enter the full https:// address, like https://abc123.ngrok-free.app");
      return;
    }
    setError("");
    setOverride(v);
    try {
      if (v) localStorage.setItem(BASE_KEY, v);
      else localStorage.removeItem(BASE_KEY);
    } catch {
      // ignore
    }
  };

  const regenerate = async () => {
    if (
      !window.confirm(
        "Regenerate the webhook key? Any Google Sheet or other integration using the current URL will stop working until you update it with the new one."
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError("");
    try {
      const res = await api.regenerateLeadWebhookKey();
      setApiKey(res.apiKey);
      setServerUrl(res.webhookUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not regenerate the key");
    } finally {
      setRegenerating(false);
    }
  };

  const downloadTemplate = () => {
    const csv = ["Name,Phone,Email,Notes", "Rahul Sharma,9876543210,rahul@example.com,Interested in Full-Stack course"].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-sheet-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className={adminStyles.empty}>Loading...</p>;

  const script = sheetScript(webhookUrl);
  const formCode = formScript(webhookUrl);

  return (
    <div className={adminStyles.grid}>
      {privateUrl && (
        <section
          className={adminStyles.section}
          style={{ borderColor: "var(--warning)", background: "var(--warning-soft)" }}
        >
          <h2 className={adminStyles.sectionTitle}>Heads up: this address only works on your computer</h2>
          <p className={adminStyles.sectionSubtitle} style={{ color: "var(--foreground)" }}>
            Your webhook points to <strong>{webhookUrl.split("/api/")[0]}</strong>. Google Sheets (and Zapier etc.) run on the
            internet, so they can&apos;t reach <code>localhost</code>. <strong>On your live website this is fine</strong> — the URL
            becomes your real domain automatically. To test from your own PC right now:
          </p>
          <ol style={{ margin: "8px 0 12px", paddingLeft: 20, fontSize: "0.88rem", lineHeight: 1.8, color: "var(--foreground)" }}>
            <li>
              Install a free tunnel, e.g. <strong>ngrok</strong>, and run <code>ngrok http 5000</code> (5000 = your backend port).
            </li>
            <li>
              Copy the <code>https://….ngrok-free.app</code> address it prints and paste it below.
            </li>
            <li>The script and URL on this page update — copy the script again.</li>
          </ol>
          <div className={adminStyles.inviteRow}>
            <input
              className={adminStyles.input}
              style={{ flex: 1, minWidth: 220 }}
              placeholder="https://abc123.ngrok-free.app"
              value={overrideDraft}
              onChange={(e) => setOverrideDraft(e.target.value)}
            />
            <button className={adminStyles.primaryButton} type="button" onClick={saveOverride}>
              Use this address
            </button>
          </div>
        </section>
      )}

      {!privateUrl && override && (
        <section className={adminStyles.section}>
          <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
            Using public address <strong>{override}</strong> (saved in this browser only).{" "}
            <button
              className={adminStyles.linkButton}
              type="button"
              onClick={() => {
                setOverrideDraft("");
                setOverride("");
                try {
                  localStorage.removeItem(BASE_KEY);
                } catch {
                  // ignore
                }
              }}
            >
              Stop using it
            </button>
          </p>
        </section>
      )}

      <section className={adminStyles.section}>
        <div className={adminStyles.tabsRow} style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={method === "form" ? adminStyles.tabActive : adminStyles.tab}
            onClick={() => setMethod("form")}
          >
            Google Form
          </button>
          <button
            type="button"
            className={method === "sheet" ? adminStyles.tabActive : adminStyles.tab}
            onClick={() => setMethod("sheet")}
          >
            Google Sheet
          </button>
        </div>

        {method === "form" ? (
          <>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>Connect a Google Form</h2>
                <p className={adminStyles.sectionSubtitle}>
                  Every time someone submits your form, they become a lead automatically. Takes about 2 minutes.
                </p>
              </div>
            </div>

            <Step n={1}>
              <strong>Set up your form.</strong> Add a <strong>Name</strong> question and a <strong>Phone</strong> question (optional:{" "}
              <strong>Email</strong>, <strong>Notes</strong>/<strong>Course</strong>; &quot;First Name&quot; + &quot;Last Name&quot; also work).
              The question title is what we match, so keep those words. Then open the form&apos;s <strong>Responses</strong> tab and click{" "}
              <strong>Link to Sheets</strong> (skip if already linked).
            </Step>

            <Step n={2}>
              <strong>Add the script to the response Sheet.</strong> Open that Sheet → <strong>Extensions → Apps Script</strong> (not the
              form&apos;s own script editor), delete everything there, paste this code and press <strong>Save</strong> (💾).
            </Step>

            <div style={{ position: "relative", margin: "0 0 14px 38px" }}>
              <pre className={adminStyles.codeBlock} style={{ maxHeight: 280, overflow: "auto" }}>
                {formCode}
              </pre>
              <div style={{ position: "absolute", top: 10, right: 10 }}>
                <CopyButton text={formCode} label="Copy script" />
              </div>
            </div>

            <Step n={3}>
              <strong>Connect it (once).</strong> In the toolbar choose the function <code>setup</code> and press <strong>Run</strong>.
              Click <strong>Review permissions → Allow</strong> (Google shows &quot;unverified app&quot; because it&apos;s your own script —
              choose <em>Advanced → Go to project</em>). You&apos;re done: submit a test response and check your Leads.
            </Step>

            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>Something went wrong? Common problems</summary>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                {FORM_PROBLEMS.map((p) => (
                  <div key={p.error}>
                    <code style={{ fontSize: "0.8rem" }}>{p.error}</code>
                    <p className={adminStyles.sectionSubtitle} style={{ margin: "2px 0 0" }}>
                      {p.fix}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Connect a Google Sheet</h2>
            <p className={adminStyles.sectionSubtitle}>
              Every new or edited row becomes a lead automatically — and a <strong>Lead Sync</strong> column in your sheet shows
              &quot;Sent ✓&quot; or what went wrong. Takes about 2 minutes.
            </p>
          </div>
          <button className={adminStyles.smallButton} type="button" onClick={downloadTemplate}>
            Download sheet template (CSV)
          </button>
        </div>

        <Step n={1}>
          <strong>Set up your sheet.</strong> Row 1 must have headers <strong>Name</strong> and <strong>Phone</strong> (optional:{" "}
          <strong>Email</strong>, <strong>Notes</strong>; &quot;First Name&quot; + &quot;Last Name&quot; also work; any order). Use the template
          button to start from a ready sheet (Google Sheets → File → Import).
        </Step>

        <Step n={2}>
          <strong>Add the script.</strong> In the sheet open <strong>Extensions → Apps Script</strong>, delete everything there, paste
          this code and press <strong>Save</strong> (💾).
        </Step>

        <div style={{ position: "relative", margin: "0 0 14px 38px" }}>
          <pre className={adminStyles.codeBlock} style={{ maxHeight: 280, overflow: "auto" }}>
            {script}
          </pre>
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <CopyButton text={script} label="Copy script" />
          </div>
        </div>

        <Step n={3}>
          <strong>Connect it (once).</strong> In the toolbar choose the function <code>setup</code> and press <strong>Run</strong>. Click{" "}
          <strong>Review permissions → Allow</strong> (Google shows &quot;unverified app&quot; because it&apos;s your own script — choose{" "}
          <em>Advanced → Go to project</em>). A &quot;Connected!&quot; message appears in the sheet — you&apos;re done.
        </Step>

        <details style={{ marginTop: 6 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>Something went wrong? Common problems</summary>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {PROBLEMS.map((p) => (
              <div key={p.error}>
                <code style={{ fontSize: "0.8rem" }}>{p.error}</code>
                <p className={adminStyles.sectionSubtitle} style={{ margin: "2px 0 0" }}>
                  {p.fix}
                </p>
              </div>
            ))}
          </div>
        </details>
          </>
        )}
      </section>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Your webhook</h2>
            <p className={adminStyles.sectionSubtitle}>
              Anything sent here creates or updates a lead for your institute — matched by phone number, so re-sending the same
              lead updates it instead of duplicating it.
            </p>
          </div>
        </div>

        <label className={adminStyles.label}>
          Webhook URL
          <div className={adminStyles.inviteRow}>
            <span className={adminStyles.linkBox}>{webhookUrl}</span>
            <CopyButton text={webhookUrl} />
          </div>
        </label>

        <label className={adminStyles.label} style={{ marginTop: 12 }}>
          API key
          <div className={adminStyles.inviteRow}>
            <span className={adminStyles.linkBox}>{apiKey}</span>
            <CopyButton text={apiKey} />
          </div>
        </label>

        <div className={adminStyles.formActions} style={{ marginTop: 16 }}>
          <button className={adminStyles.smallButton} type="button" onClick={regenerate} disabled={regenerating}>
            {regenerating ? "Regenerating..." : "Regenerate key"}
          </button>
          {error && <p className={adminStyles.messageError}>{error}</p>}
        </div>
      </section>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Connect anything else</h2>
            <p className={adminStyles.sectionSubtitle}>
              Any other website, CRM or tool (Zapier, Make, a custom backend, etc.) can send leads the same way — a plain POST
              request with JSON.
            </p>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <pre className={adminStyles.codeBlock}>{curlExample(webhookUrl)}</pre>
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <CopyButton text={curlExample(webhookUrl)} />
          </div>
        </div>
        <p className={adminStyles.sectionSubtitle} style={{ marginTop: 10 }}>
          Only <strong>name</strong> and <strong>phone</strong> are required — <strong>email</strong>, <strong>notes</strong> and{" "}
          <strong>source</strong> (shown as the lead&apos;s origin label) are optional. Phone must be a valid mobile number.
        </p>
      </section>
    </div>
  );
}
