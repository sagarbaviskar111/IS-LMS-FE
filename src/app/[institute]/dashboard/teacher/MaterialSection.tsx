"use client";

import { useEffect, useState, useCallback } from "react";
import { useTeacherBatch } from "@/context/TeacherBatchContext";
import { api, ApiError, Material, Session } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import styles from "./teacher.module.css";
import BatchSwitcher from "./BatchSwitcher";
import DocumentViewerModal from "../DocumentViewerModal";
import VideoPlayerModal from "../VideoPlayerModal";

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function sessionLabel(s: { date: string; topic: string }): string {
  const date = new Date(s.date.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  return `${date} — ${s.topic}`;
}

export default function MaterialSection({ type }: { type: "document" | "video" }) {
  const { activeBatchId, activeBatch } = useTeacherBatch();
  const isVideo = type === "video";
  const noun = isVideo ? "recording" : "study material";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [sessionId, setSessionId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<Material | null>(null);
  const [watching, setWatching] = useState<Material | null>(null);
  const [uploading, setUploading] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(true);

  useEffect(() => {
    if (!isVideo) return;
    api
      .teacherYoutubeStatus()
      .then((res) => setYoutubeConnected(res.connected))
      .catch(() => setYoutubeConnected(true));
  }, [isVideo]);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      const [materialsRes, sessionsRes] = await Promise.all([
        api.listMaterials(activeBatchId),
        api.listSessions(activeBatchId),
      ]);
      setMaterials(materialsRes.materials.filter((m) => m.type === type));
      setSessions(sessionsRes.sessions);
    } finally {
      setLoading(false);
    }
  }, [activeBatchId, type]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFileInput = () => {
    const el = document.getElementById(`${type}-file`) as HTMLInputElement | null;
    if (el) el.value = "";
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchId || !file) return;
    if (isVideo && !sessionId) return;
    setError("");
    setUploading(true);
    try {
      await api.uploadMaterial({
        batch: activeBatchId,
        title,
        description,
        session: sessionId || undefined,
        file,
      });
      setTitle("");
      setDescription("");
      setSessionId("");
      setFile(null);
      resetFileInput();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (m: Material) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    await api.deleteMaterial(m._id);
    load();
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>{isVideo ? "Session Recordings" : "Study Material"}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {isVideo
          ? `Upload session recordings for ${activeBatch?.name || "your batch"}.`
          : `Upload notes and documents for ${activeBatch?.name || "your batch"}.`}
      </p>

      <BatchSwitcher />

      <div className={adminStyles.grid}>
        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Upload {noun}</h2>
              <p className={adminStyles.sectionSubtitle}>
                {isVideo
                  ? "MP4, WebM or MOV, up to 200MB. Must be linked to a session."
                  : "PDF, Word, PPT, Excel or text, up to 200MB. Optionally link it to a session."}
              </p>
            </div>
          </div>

          {isVideo && !youtubeConnected ? (
            <p className={adminStyles.messageError}>
              Your institute hasn&apos;t connected a YouTube account yet — ask your admin to
              connect one under Admin &gt; YouTube Settings before uploading recordings.
            </p>
          ) : isVideo && sessions.length === 0 ? (
            <p className={adminStyles.empty}>
              Create a session first (Sessions tab) — a recording has to be linked to one.
            </p>
          ) : (
            <form className={adminStyles.form} onSubmit={handleUpload}>
              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Session {isVideo ? "" : "(optional)"}
                <select
                  className={adminStyles.select}
                  value={sessionId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSessionId(id);
                    if (isVideo) {
                      const s = sessions.find((x) => x._id === id);
                      if (s && !title) setTitle(`Recording — ${sessionLabel(s)}`);
                    }
                  }}
                  required={isVideo}
                >
                  <option value="">{isVideo ? "Select a session" : "No specific session"}</option>
                  {sessions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {sessionLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Title
                <input
                  className={adminStyles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isVideo ? undefined : "e.g. Chapter 3 notes"}
                  required
                />
              </label>

              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                Description
                <input
                  className={adminStyles.input}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="optional"
                />
              </label>

              <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
                File
                <input
                  id={`${type}-file`}
                  className={adminStyles.input}
                  type="file"
                  accept={isVideo ? VIDEO_ACCEPT : DOCUMENT_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </label>

              <div className={adminStyles.formActions}>
                <button
                  className={adminStyles.primaryButton}
                  type="submit"
                  disabled={uploading || !file || (isVideo && !sessionId)}
                >
                  {uploading ? "Uploading..." : `Upload ${noun}`}
                </button>
                {error && <p className={adminStyles.messageError}>{error}</p>}
              </div>
            </form>
          )}
        </section>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>
                {isVideo ? "Recordings" : "Documents"} shared with this batch
              </h2>
              <p className={adminStyles.sectionSubtitle}>{materials.length} file(s)</p>
            </div>
          </div>

          {!loading && materials.length === 0 && (
            <div className={styles.emptyBlock}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>Nothing uploaded yet.</p>
            </div>
          )}

          {materials.length > 0 && (
            <div className={`${adminStyles.tableWrap} ${styles.tableHoverWrap}`}>
              <table className={adminStyles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Session</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const linkedSession = typeof m.session === "object" ? m.session : null;
                    return (
                      <tr key={m._id}>
                        <td>{m.title}</td>
                        <td>{linkedSession ? sessionLabel(linkedSession) : "—"}</td>
                        <td>{formatSize(m.fileSize)}</td>
                        <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className={adminStyles.rowActions}>
                            {m.youtubeVideoId ? (
                              <button className={adminStyles.smallButton} onClick={() => setWatching(m)}>
                                Open
                              </button>
                            ) : (
                              <button className={adminStyles.smallButton} onClick={() => setViewing(m)}>
                                Open
                              </button>
                            )}
                            <button className={adminStyles.dangerButton} onClick={() => remove(m)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {viewing && viewing.fileUrl && (
        <DocumentViewerModal
          fileName={viewing.fileName}
          fileUrl={viewing.fileUrl}
          mimeType={viewing.mimeType}
          onClose={() => setViewing(null)}
        />
      )}

      {watching && watching.youtubeVideoId && (
        <VideoPlayerModal
          title={watching.title}
          videoId={watching.youtubeVideoId}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  );
}
