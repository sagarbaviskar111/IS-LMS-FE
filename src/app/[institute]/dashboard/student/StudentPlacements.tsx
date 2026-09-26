"use client";

import { useEffect, useState } from "react";
import { api, ApiError, Job } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import StudentEmptyState from "./StudentEmptyState";
import StudentLoading from "./StudentLoading";

export default function StudentPlacements() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    return api
      .studentListJobs({ limit: 200 })
      .then((res) => setJobs(res.jobs))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const expressInterest = async (job: Job) => {
    setError("");
    setBusyId(job._id);
    try {
      await api.studentExpressInterest(job._id);
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, interested: true } : j)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not register interest");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Job Placements</h1>
      <p className={dashboardStyles.pageSubtitle}>Openings your admin has shared.</p>

      {error && <p className={adminStyles.messageError} style={{ marginBottom: 16 }}>{error}</p>}

      {loading && <StudentLoading />}
      {!loading && jobs.length === 0 && (
        <StudentEmptyState title="No jobs posted yet" hint="Check back later — your admin will post openings here." />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {jobs.map((job) => (
          <section key={job._id} className={adminStyles.section}>
            <div className={adminStyles.sectionHead}>
              <div style={{ minWidth: 0 }}>
                <h2 className={adminStyles.sectionTitle}>{job.title}</h2>
                <p className={adminStyles.sectionSubtitle}>
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                  {job.salary ? ` · ${job.salary}` : ""}
                </p>
              </div>
              <span className={job.status === "open" ? adminStyles.badge : adminStyles.badgeInactive}>
                {job.status === "open" ? "Open" : "Closed"}
              </span>
            </div>

            <p style={{ color: "var(--foreground)", fontSize: "0.9rem", lineHeight: 1.6, margin: "10px 0 16px", whiteSpace: "pre-wrap" }}>
              {job.description}
            </p>

            {job.status !== "open" ? (
              <span className={adminStyles.empty}>This posting is closed.</span>
            ) : job.applicationMode === "link" ? (
              <a
                href={job.applyLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={adminStyles.primaryButton}
                style={{ display: "inline-block", textDecoration: "none" }}
              >
                Apply now →
              </a>
            ) : job.interested ? (
              <span className={adminStyles.badge}>Interested ✓ — your admin will apply for you</span>
            ) : (
              <button
                className={adminStyles.primaryButton}
                type="button"
                disabled={busyId === job._id}
                onClick={() => expressInterest(job)}
              >
                {busyId === job._id ? "Submitting..." : "I'm interested"}
              </button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
