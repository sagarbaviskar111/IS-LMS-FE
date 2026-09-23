"use client";

import Modal from "./Modal";
import YoutubePlayer from "./YoutubePlayer";
import adminStyles from "./admin/admin.module.css";

export default function VideoPlayerModal({
  title,
  videoId,
  onClose,
}: {
  title: string;
  videoId: string;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: "min(95vw, 900px)", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
        <p
          style={{
            fontWeight: 600,
            color: "var(--foreground)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </p>
        <button className={adminStyles.smallButton} onClick={onClose}>
          Close
        </button>
      </div>
      <YoutubePlayer videoId={videoId} />
    </Modal>
  );
}
