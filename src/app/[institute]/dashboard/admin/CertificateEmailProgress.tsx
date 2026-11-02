"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, CertEmailJob } from "@/lib/api";
import adminStyles from "./admin.module.css";

// Shows how a background "email the certificates" run is going, and what became
// of everyone once it has finished.
export default function CertificateEmailProgress({ jobId, onFinished }: { jobId: string; onFinished?: (job: CertEmailJob) => void }) {
  const { institute } = useParams<{ institute: string }>();
  const [job, setJob] = useState<CertEmailJob | null>(null);
  const [lost, setLost] = useState(false);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const { job } = await api.certEmailJob(jobId);
        if (!live) return;
        setJob(job);
        if (job.state === "running") timer = setTimeout(tick, 1500);
        else finished.current?.(job);
      } catch {
        // The server forgets a job after a restart; the certificates keep their own "emailed" marks.
        if (live) setLost(true);
      }
    };
    tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [jobId]);

  if (lost) {
    return <p className={adminStyles.sectionSubtitle}>Could not read the progress. Reload the list to see which certificates were emailed.</p>;
  }
  if (!job) return <p className={adminStyles.sectionSubtitle}>Starting…</p>;

  if (job.state === "running") {
    const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
    return (
      <div role="status" style={{ display: "grid", gap: 6 }}>
        <strong style={{ fontSize: "0.9rem" }}>
          Emailing certificates… {job.done} of {job.total}
        </strong>
        <div style={{ height: 8, borderRadius: 999, background: "var(--surface-alt)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", transition: "width 0.3s" }} />
        </div>
        <span className={adminStyles.sectionSubtitle}>You can close this window; emails keep going out.</span>
      </div>
    );
  }

  const parts = [
    job.sent ? `${job.sent} emailed` : "",
    job.failed ? `${job.failed} failed` : "",
    job.noEmail ? `${job.noEmail} ${job.noEmail === 1 ? "has" : "have"} no email address` : "",
    job.alreadySent ? `${job.alreadySent} already emailed earlier` : "",
    job.revoked ? `${job.revoked} revoked` : "",
  ].filter(Boolean);

  return (
    <div role="status" style={{ display: "grid", gap: 8 }}>
      {parts.length > 0 && <strong style={{ fontSize: "0.9rem" }}>{parts.join(" · ")}</strong>}
      {job.error && (
        <p className={adminStyles.messageError} style={{ margin: 0 }}>
          {job.error}{" "}
          <Link href={`/${institute}/dashboard/admin/settings?tab=sender-email`} style={{ textDecoration: "underline" }}>
            Open sender email settings
          </Link>
          , fix it, then use “Email unsent”. Nothing was marked as sent.
        </p>
      )}
      {job.limited > 0 && (
        <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
          Gmail allows only about 100 emails a day, so we send at most 90. <strong>{job.limited}</strong> more are waiting. Press “Email unsent”
          tomorrow and they will go out.
        </p>
      )}
      {job.failed > 0 && (
        <p className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
          Hover over “Failed” in the list to see why. Fix the problem, then send those again.
        </p>
      )}
    </div>
  );
}
