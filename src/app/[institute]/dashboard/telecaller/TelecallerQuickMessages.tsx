"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";

const MAX = 30;

type Draft = { label: string; text: string };

export default function TelecallerQuickMessages() {
  const [messages, setMessages] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null); // index, or -1 for a new one
  const [draft, setDraft] = useState<Draft>({ label: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api
      .getQuickMessages()
      .then((res) => setMessages(res.messages.map(({ label, text }) => ({ label, text }))))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load your quick messages"))
      .finally(() => setLoading(false));
  }, []);

  // Saves the whole list; the server keeps it exactly as sent.
  const persist = async (next: Draft[], done: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await api.saveQuickMessages(next);
      setMessages(res.messages.map(({ label, text }) => ({ label, text })));
      setNotice(done);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startNew = () => {
    setError("");
    setNotice("");
    setDraft({ label: "", text: "" });
    setEditing(-1);
  };
  const startEdit = (i: number) => {
    setError("");
    setNotice("");
    setDraft(messages[i]);
    setEditing(i);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = draft.label.trim();
    const text = draft.text.trim();
    if (!label || !text) return setError("Give the message a name and some text");
    const next = editing === -1 ? [...messages, { label, text }] : messages.map((m, i) => (i === editing ? { label, text } : m));
    if (await persist(next, editing === -1 ? "Added." : "Saved.")) setEditing(null);
  };

  const remove = async (i: number) => {
    if (!window.confirm(`Delete "${messages[i].label}"?`)) return;
    await persist(
      messages.filter((_, idx) => idx !== i),
      "Deleted."
    );
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Quick Messages</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Ready-made messages for WhatsApp, SMS and email. They show as one-tap buttons when you open a lead.
      </p>

      <section className={adminStyles.section}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Your messages</h2>
            <p className={adminStyles.sectionSubtitle}>
              Use <code>{"{name}"}</code> for the lead&apos;s first name, <code>{"{caller}"}</code> for your name and{" "}
              <code>{"{institute}"}</code> for your institute — they&apos;re filled in automatically.
            </p>
          </div>
          <button
            className={adminStyles.primaryButton}
            type="button"
            onClick={startNew}
            disabled={busy || messages.length >= MAX || editing !== null}
          >
            + New message
          </button>
        </div>

        {editing !== null && (
          <form className={adminStyles.form} onSubmit={save} style={{ marginBottom: 16 }}>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Button name
              <input
                className={adminStyles.input}
                value={draft.label}
                maxLength={40}
                autoFocus
                placeholder="e.g. Fee details"
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </label>
            <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
              Message
              <textarea
                className={adminStyles.input}
                rows={4}
                value={draft.text}
                maxLength={1000}
                placeholder="Hi {name}, this is {caller} from {institute}…"
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </label>
            <div className={adminStyles.formActions}>
              <button className={adminStyles.primaryButton} type="submit" disabled={busy}>
                {busy ? "Saving..." : editing === -1 ? "Add message" : "Save changes"}
              </button>
              <button className={adminStyles.smallButton} type="button" onClick={() => setEditing(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && <p className={adminStyles.messageError}>{error}</p>}
        {notice && <p className={adminStyles.messageSuccess}>{notice}</p>}

        {loading && <p className={adminStyles.empty}>Loading...</p>}
        {!loading && messages.length === 0 && editing === null && (
          <p className={adminStyles.empty}>No quick messages yet — add your first one.</p>
        )}

        {messages.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.label}`}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 12,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{m.label}</div>
                  <p className={adminStyles.sectionSubtitle} style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </p>
                </div>
                <div className={adminStyles.rowActions} style={{ flexWrap: "nowrap" }}>
                  <button className={adminStyles.smallButton} type="button" onClick={() => startEdit(i)} disabled={busy || editing !== null}>
                    Edit
                  </button>
                  <button className={adminStyles.dangerButton} type="button" onClick={() => remove(i)} disabled={busy || editing !== null}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
