"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, ChatMessage, ClassPerson } from "@/lib/api";
import dashboardStyles from "./dashboard.module.css";
import adminStyles from "./admin/admin.module.css";
import Modal from "./Modal";

const POLL_MS = 5000;

export default function ChatPanel({
  person,
  onClose,
  onRead,
}: {
  person: ClassPerson;
  onClose: () => void;
  onRead: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (markRead: boolean) => {
      try {
        const res = await api.getThread(person._id);
        setMessages(res.messages);
        if (markRead) {
          await api.markThreadRead(person._id);
          onRead();
        }
      } finally {
        setLoading(false);
      }
    },
    [person._id, onRead]
  );

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    setSending(true);
    try {
      await api.sendChatMessage(person._id, text.trim());
      setText("");
      load(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={dashboardStyles.modalHead}>
        <div>
          <h2 className={adminStyles.sectionTitle}>{person.name}</h2>
          <p className={adminStyles.sectionSubtitle}>{person.email}</p>
        </div>
        <button className={dashboardStyles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: "50vh",
          overflowY: "auto",
          padding: "12px 4px",
        }}
      >
        {loading && <p className={adminStyles.empty}>Loading...</p>}
        {!loading && messages.length === 0 && (
          <p className={adminStyles.empty}>No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const mine = typeof m.sender === "object" ? m.sender._id === user?._id : m.sender === user?._id;
          return (
            <div key={m._id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "75%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  background: mine ? "var(--brand)" : "var(--surface-alt)",
                  color: mine ? "#fff" : "var(--foreground)",
                  border: mine ? "none" : "1px solid var(--border)",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.text}
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.68rem",
                    opacity: 0.75,
                    textAlign: "right",
                  }}
                >
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          className={adminStyles.input}
          style={{ flex: 1 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <button className={adminStyles.primaryButton} type="submit" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
      {error && <p className={adminStyles.messageError}>{error}</p>}
    </Modal>
  );
}
