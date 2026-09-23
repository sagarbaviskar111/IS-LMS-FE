"use client";

import Modal from "./Modal";
import adminStyles from "./admin/admin.module.css";

const OFFICE_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export default function DocumentViewerModal({
  fileName,
  fileUrl,
  mimeType,
  onClose,
}: {
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  onClose: () => void;
}) {
  const isImage = !!mimeType?.startsWith("image/");
  // Word/PowerPoint/Excel have no native browser renderer — route them through
  // Google's viewer, embedded in our iframe, so the file still opens on this
  // page instead of sending the student off to an external tab.
  const isOffice = !!mimeType && OFFICE_MIMES.has(mimeType);
  const viewerSrc = isOffice ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` : fileUrl;

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: "min(95vw, 960px)", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", height: "80vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
          <p style={{ fontWeight: 600, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName}
          </p>
          <button className={adminStyles.smallButton} onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", background: "#fff", minHeight: 0 }}>
          {isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <iframe src={viewerSrc} title={fileName} style={{ width: "100%", height: "100%", border: "none" }} />
          )}
        </div>
      </div>
    </Modal>
  );
}
