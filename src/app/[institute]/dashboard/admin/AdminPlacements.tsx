"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError, Batch, Job, JobApplicationMode, JobInterestRow, JobVisibility } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import styles from "./admin.module.css";
import Modal from "../Modal";

const emptyForm = {
  title: "",
  company: "",
  location: "",
  salary: "",
  description: "",
  visibility: "all" as JobVisibility,
  batchId: "",
  applicationMode: "link" as JobApplicationMode,
  applyLink: "",
};

export default function AdminPlacements() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [rowError, setRowError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [interestsFor, setInterestsFor] = useState<Job | null>(null);
  const [interests, setInterests] = useState<JobInterestRow[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, batchesRes] = await Promise.all([api.listJobs({ limit: 200 }), api.listBatches({ limit: 200 })]);
      setJobs(jobsRes.jobs);
      setBatches(batchesRes.batches);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.createJob({
        title: form.title,
        company: form.company,
        description: form.description,
        salary: form.salary,
        location: form.location,
        visibility: form.visibility,
        batchId: form.visibility === "batch" ? form.batchId : undefined,
        applicationMode: form.applicationMode,
        applyLink: form.applicationMode === "link" ? form.applyLink : undefined,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not post job");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (job: Job) => {
    setRowError("");
    setBusyId(job._id);
    try {
      await api.updateJob(job._id, { status: job.status === "open" ? "closed" : "open" });
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not update job");
    } finally {
      setBusyId(null);
    }
  };

  const removeJob = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    setRowError("");
    try {
      await api.deleteJob(job._id);
      load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : "Could not delete job");
    }
  };

  const viewInterests = async (job: Job) => {
    setInterestsFor(job);
    setInterestsLoading(true);
    try {
      const res = await api.listJobInterests(job._id);
      setInterests(res.interests);
    } finally {
      setInterestsLoading(false);
    }
  };

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Job Placements</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Post job openings for your students — show them to everyone or just one batch, and either
        link straight to the company&apos;s own apply page or collect interest yourself.
      </p>

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Post a job</h2>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <label className={styles.label}>
              Job title
              <input
                className={styles.input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Frontend Developer"
                required
              />
            </label>

            <label className={styles.label}>
              Company
              <input
                className={styles.input}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Acme Pvt Ltd"
                required
              />
            </label>

            <label className={styles.label}>
              Location
              <input
                className={styles.input}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Pune, Remote"
              />
            </label>

            <label className={styles.label}>
              Salary / payment
              <input
                className={styles.input}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="e.g. ₹25,000/month"
              />
            </label>

            <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Description
              <textarea
                className={styles.input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                style={{ resize: "vertical", fontFamily: "inherit" }}
                placeholder="Role, responsibilities, requirements..."
                required
              />
            </label>

            <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
              Who can see this
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={form.visibility === "all" ? styles.tabActive : styles.tab}
                  onClick={() => setForm({ ...form, visibility: "all" })}
                >
                  All students
                </button>
                <button
                  type="button"
                  className={form.visibility === "batch" ? styles.tabActive : styles.tab}
                  onClick={() => setForm({ ...form, visibility: "batch" })}
                >
                  One batch
                </button>
              </div>
            </div>

            {form.visibility === "batch" && (
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Batch
                <select
                  className={styles.select}
                  value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  required
                >
                  <option value="">Select a batch</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className={styles.label} style={{ gridColumn: "1 / -1" }}>
              How students apply
              <div className={styles.tabs}>
                <button
                  type="button"
                  className={form.applicationMode === "link" ? styles.tabActive : styles.tab}
                  onClick={() => setForm({ ...form, applicationMode: "link" })}
                >
                  Apply link (company site)
                </button>
                <button
                  type="button"
                  className={form.applicationMode === "interest" ? styles.tabActive : styles.tab}
                  onClick={() => setForm({ ...form, applicationMode: "interest" })}
                >
                  &quot;I&apos;m interested&quot; — I&apos;ll apply for them
                </button>
              </div>
            </div>

            {form.applicationMode === "link" && (
              <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
                Apply link
                <input
                  className={styles.input}
                  type="url"
                  value={form.applyLink}
                  onChange={(e) => setForm({ ...form, applyLink: e.target.value })}
                  placeholder="https://company.com/careers/apply"
                  required
                />
              </label>
            )}

            <div className={styles.formActions}>
              <button className={styles.primaryButton} type="submit" disabled={submitting}>
                {submitting ? "Posting..." : "Post job"}
              </button>
              {formError && <p className={styles.messageError}>{formError}</p>}
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Posted jobs</h2>
              <p className={styles.sectionSubtitle}>{jobs.length} total</p>
            </div>
          </div>

          {rowError && <p className={styles.messageError}>{rowError}</p>}

          {!loading && jobs.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon} aria-hidden="true">
                💼
              </span>
              <p className={styles.emptyStateText}>No jobs posted yet — post one above.</p>
            </div>
          )}

          {jobs.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Visible to</th>
                    <th>Applies via</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j._id}>
                      <td>{j.title}</td>
                      <td>{j.company}</td>
                      <td>{j.visibility === "all" ? "All students" : typeof j.batch === "object" && j.batch ? j.batch.name : "Batch"}</td>
                      <td>
                        {j.applicationMode === "link" ? (
                          "Apply link"
                        ) : (
                          <button className={styles.linkButton} type="button" onClick={() => viewInterests(j)}>
                            Interested ({j.interestedCount || 0})
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={j.status === "open" ? styles.badge : styles.badgeInactive}>
                          {j.status === "open" ? "Open" : "Closed"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.smallButton}
                            disabled={busyId === j._id}
                            onClick={() => toggleStatus(j)}
                          >
                            {j.status === "open" ? "Close" : "Reopen"}
                          </button>
                          <button className={styles.dangerButton} onClick={() => removeJob(j)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {(interestsFor || interestsLoading) && (
        <Modal onClose={() => setInterestsFor(null)}>
          <div className={dashboardStyles.modalHead}>
            <div>
              <h2 className={styles.sectionTitle}>{interestsFor?.title}</h2>
              <p className={styles.sectionSubtitle}>
                {interestsLoading ? "Loading..." : `${interests.length} interested`}
              </p>
            </div>
            <button
              className={dashboardStyles.modalCloseButton}
              type="button"
              onClick={() => setInterestsFor(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {!interestsLoading && interests.length === 0 && (
            <p className={styles.empty}>No one has expressed interest yet.</p>
          )}

          {interests.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {interests.map((i) => (
                    <tr key={i._id}>
                      <td>{i.student.name}</td>
                      <td>{i.student.email}</td>
                      <td>{i.student.phone || "—"}</td>
                      <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
