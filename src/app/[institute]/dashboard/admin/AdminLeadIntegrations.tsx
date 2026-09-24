"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";

const appsScript = (webhookUrl: string) => `function sendLeadToWebhook(e) {
  var WEBHOOK_URL = "${webhookUrl}";

  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  if (row === 1) return; // header row

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  var data = {};
  headers.forEach(function (header, i) {
    data[String(header).trim().toLowerCase()] = values[i];
  });

  var payload = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    source: "Google Sheets"
  };

  if (!payload.name || !payload.phone) return; // skip incomplete rows

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}`;

const curlExample = (webhookUrl: string) => `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "phone": "9998887766",
    "email": "jane@example.com",
    "notes": "Interested in the NEET batch",
    "source": "My Website"
  }'`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — ignore
    }
  };
  return (
    <button className={adminStyles.smallButton} type="button" onClick={copy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function AdminLeadIntegrations() {
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api
      .getLeadWebhookSettings()
      .then((res) => {
        setApiKey(res.apiKey);
        setWebhookUrl(res.webhookUrl);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load webhook settings"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

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
      setWebhookUrl(res.webhookUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not regenerate the key");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Lead Integrations</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Feed leads in automatically from a Google Sheet, another website, or any tool that can make
        a web request — no password needed, they just show up in your Leads list.
      </p>

      {loading ? (
        <p className={adminStyles.empty}>Loading...</p>
      ) : (
        <div className={adminStyles.grid}>
          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>Your webhook</h2>
                <p className={adminStyles.sectionSubtitle}>
                  Anything sent here creates or updates a lead for your institute — matched by
                  phone number, so re-sending the same lead updates it instead of duplicating it.
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
                <h2 className={adminStyles.sectionTitle}>Connect a Google Sheet</h2>
                <p className={adminStyles.sectionSubtitle}>
                  Real-time sync, no Google account linking needed — a small script inside your
                  own sheet sends each row straight to your webhook.
                </p>
              </div>
            </div>

            <ol style={{ margin: "0 0 12px", paddingLeft: 20, color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.7 }}>
              <li>
                In your Sheet, make sure the first row has headers named <strong>Name</strong>,{" "}
                <strong>Phone</strong>, <strong>Email</strong> and <strong>Notes</strong> (any
                order — Email and Notes are optional).
              </li>
              <li>
                Open <strong>Extensions → Apps Script</strong>, delete anything there, and paste
                the code below.
              </li>
              <li>
                Click the clock icon (<strong>Triggers</strong>) on the left → <strong>Add
                Trigger</strong> → function <code>sendLeadToWebhook</code>, event source{" "}
                <strong>From spreadsheet</strong>, event type <strong>On edit</strong> → Save.
              </li>
              <li>Approve the permission prompt the first time — that&apos;s it.</li>
            </ol>

            <div style={{ position: "relative" }}>
              <pre className={adminStyles.codeBlock}>{appsScript(webhookUrl)}</pre>
              <div style={{ position: "absolute", top: 10, right: 10 }}>
                <CopyButton text={appsScript(webhookUrl)} />
              </div>
            </div>
          </section>

          <section className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div>
                <h2 className={adminStyles.sectionTitle}>Connect anything else</h2>
                <p className={adminStyles.sectionSubtitle}>
                  Any other website, CRM or tool (Zapier, Make, a custom backend, etc.) can send
                  leads the same way — a plain POST request with JSON.
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
              Only <strong>name</strong> and <strong>phone</strong> are required — <strong>email</strong>,{" "}
              <strong>notes</strong> and <strong>source</strong> (shown as the lead&apos;s origin
              label) are optional.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
