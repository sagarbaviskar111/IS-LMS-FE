"use client";

import Modal from "./Modal";
import YoutubePlayer from "./YoutubePlayer";
import adminStyles from "./admin/admin.module.css";

export default function VideoPlayerModal({
  title,
  videoId,
  videoUrl,
  onClose,
}: {
  title: string;
  videoId?: string | null;
  videoUrl?: string | null;
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
      {videoUrl ? (
        // Recording hosted on the institute's own storage server (signed URL).
        <video
          src={videoUrl}
          controls
          autoPlay
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: "100%", maxHeight: "70vh", background: "#000", borderRadius: 8 }}
        />
      ) : videoId ? (
        <YoutubePlayer videoId={videoId} />
      ) : null}
    </Modal>
  );
}
