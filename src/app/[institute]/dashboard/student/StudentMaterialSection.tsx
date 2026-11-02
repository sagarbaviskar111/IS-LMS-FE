"use client";

import { useEffect, useState } from "react";
import { api, Batch, Material } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import DocumentViewerModal from "../DocumentViewerModal";
import VideoPlayerModal from "../VideoPlayerModal";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";
import Pagination from "../Pagination";



function sessionDateLabel(m: Material): string | null {
  if (typeof m.session !== "object" || !m.session) return null;
  return new Date(m.session.date.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export default function StudentMaterialSection({ type }: { type: "document" | "video" }) {
  const isVideo = type === "video";
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Material | null>(null);
  const [watching, setWatching] = useState<Material | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.myStudentBatch(), api.studentMaterials({ type, page, limit })])
      .then(([batchRes, materialsRes]) => {
        setBatch(batchRes.batch);
        setMaterials(materialsRes.materials);
        setTotalPages(materialsRes.totalPages);
        setTotal(materialsRes.total);
      })
      .finally(() => setLoading(false));
  }, [type, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [type]);

  const title = isVideo ? "Session Recordings" : "Study Material";

  if (!loading && !batch) {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>{title}</h1>
        <StudentEmptyState
          title="You're not assigned to a batch yet"
          hint="Ask your admin to assign you one to see shared material here."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>{title}</h1>
      <p className={dashboardStyles.pageSubtitle}>
        {batch ? `Shared with ${batch.name}` : "Shared by your teachers"}
      </p>

      {loading && <StudentLoading />}

      {!loading && materials.length === 0 && (
        <StudentEmptyState
          title="Nothing shared yet"
          hint={isVideo ? "Session recordings from your teachers will appear here." : "Study material shared by your teachers will appear here."}
        />
      )}

      {isVideo && materials.length > 0 && (
        <section className={adminStyles.section}>
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Session</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((v) => (
                  <tr key={v._id}>
                    <td style={{ overflowWrap: "anywhere", minWidth: 140 }}>{v.title}</td>
                    <td style={{ overflowWrap: "anywhere", minWidth: 160 }}>{v.locked ? v.lockedReason || "Access blocked" : v.description || "—"}</td>
                    <td>{sessionDateLabel(v) ? `Class on ${sessionDateLabel(v)}` : "—"}</td>
                    <td>
                      {v.locked ? (
                        <span className={studentStyles.disabledButton} title={v.lockedReason || undefined}>
                          🔒 Locked
                        </span>
                      ) : (
                        <button
                          className={`${adminStyles.smallButton} ${!(v.youtubeVideoId || v.videoUrl) ? studentStyles.disabledButton : ""}`}
                          onClick={() => setWatching(v)}
                          disabled={!(v.youtubeVideoId || v.videoUrl)}
                        >
                          Play
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isVideo && materials.length > 0 && (
        <section className={adminStyles.section}>
          <div className={`${adminStyles.tableWrap} table-scroll`}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Session</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((d) => (
                  <tr key={d._id}>
                    <td style={{ overflowWrap: "anywhere", minWidth: 140 }}>{d.title}</td>
                    <td style={{ overflowWrap: "anywhere", minWidth: 160 }}>{d.description || "—"}</td>
                    <td>{sessionDateLabel(d) ? `Class on ${sessionDateLabel(d)}` : "—"}</td>
                    <td>
                      <button
                        className={`${adminStyles.smallButton} ${!d.fileUrl ? studentStyles.disabledButton : ""}`}
                        onClick={() => setViewing(d)}
                        disabled={!d.fileUrl}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} limit={limit} onLimitChange={(n) => { setLimit(n); setPage(1); }} />

      {viewing && viewing.fileUrl && (
        <DocumentViewerModal
          fileName={viewing.fileName}
          fileUrl={viewing.fileUrl}
          mimeType={viewing.mimeType}
          onClose={() => setViewing(null)}
        />
      )}

      {watching && (watching.youtubeVideoId || watching.videoUrl) && (
        <VideoPlayerModal
          title={watching.title}
          videoId={watching.youtubeVideoId}
          videoUrl={watching.videoUrl}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  );
}
